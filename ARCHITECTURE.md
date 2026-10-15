# ARCHITECTURE.md — system design & DB schema map

> Numbers in this file are current as of 2026-10-14. If you change the
> schema/route surface, update this file in the same change.

---

## 1. Shape of the system

```
Browser ── HTTPS ──> Traefik (:80/:443, Dokploy)
                       │
                       ├─ nomarcprojects.com ──> Next.js app  (Docker/Swarm: nomarcapp)
                       ├─ media.nomarcprojects.com ──> MinIO :9000 (S3 API)
                       │                             MinIO :9001 (console, localhost only)
                       └─ mydb.nomarcprojects.com ──> CockroachDB :8080 (admin UI)

Next.js app ── PostgreSQL wire ──> CockroachDB
           ── S3 API ───────────> MinIO / Cloudflare R2   (public + private bucket)
           ── SMTP / Resend ────> outbox  ── /api/email/drain → campaign queue
           ── Paystack | Flutterwave | SeerBit  (+ webhooks in /api/payments/*)
           ── Cloudflare Tunnel ─> Helm (separate Python VM)   [server-only]
           ── Socket ───────────> realtime messaging
```

**There is no API tier.** Server Components call `"use server"` actions in
`lib/services/*`, which query Drizzle directly. `app/api/*` exists only for
things a server action cannot do: auth callbacks, payment webhooks, binary
responses, pixels, and third-party proxies.

---

## 2. Request lifecycle (authenticated page)

1. **Route** — Server Component under `app/(dashboard)/…/page.tsx`.
2. **Session** — Better Auth resolves a host-only cookie; role/plan come off
   the session.
3. **Data** — `await` functions from `lib/services/*` (server actions → Drizzle).
4. **Render** — component from `components/dashboard/`; its co-located
   `XxxSkeleton` feeds `loading.tsx`.
5. **Mutation** — client submits → another server action → `revalidatePath`.

First paint never does client-side data fetching. TanStack Query is used only
inside client components for incremental updates.

---

## 3. Route groups

| Group | Chrome | Auth |
| --- | --- | --- |
| `(marketing)` | navbar + footer | public |
| `(auth)` | full-screen split panel | public; redirects when signed in |
| `(dashboard)` | sidebar + topbar | required |
| `admin` | own shell, 25+ sections | admin role |
| `api` | route handlers (18) | varies |

Route groups set layout chrome and do **not** appear in the URL.

---

## 4. Directory map

```
frontend/
├── app/                 routes (App Router) + 18 route handlers
├── components/          299 files
│   ├── dashboard/       one component per dashboard page (+ skeleton)
│   ├── admin/           admin console surfaces
│   ├── ui/              shared primitives (Modal, Skeleton, Reveal, Logo…)
│   ├── tour/            product tour / onboarding
│   ├── pm/              Kanban, tasks, timeline
│   ├── exhibition-hub/  exhibitor showroom
│   └── …                profile, newsfeed, auth, layout, shop, helm, guide
├── lib/
│   ├── db/              schema.ts (90 pgTable) + client.ts (pool)
│   ├── services/        76 modules (72 top-level + 4 in pm/) — the entire data-access layer
│   ├── payments/        paystack / flutterwave / seerbit + selector
│   ├── email/           mailer, shortcodes, tracking, unsubscribe
│   ├── helm/            server-only HTTP client to the VM
│   ├── store/           Zustand ×6 (auth, cart, cart-ui, compare, nav-ui, preloader)
│   ├── constants/       banks, industries, ID types, units, corporate docs
│   └── hooks/           shared React hooks
├── drizzle/             66 SQL migrations + meta/
├── scripts/             operational scripts (not bundled app code)
├── certs/               cockroach-ca.crt (committed, non-secret)
└── public/              brand assets, media, favicon
```

---

## 5. Data layer

- **ORM:** Drizzle `0.45` (`drizzle-orm/node-postgres`).
- **DB:** CockroachDB, PostgreSQL wire-compatible.
- **Schema:** `lib/db/schema.ts` — **90** `pgTable` definitions.
- **Auth tables:** Better Auth owns `user`, `session`, `account`,
  `verification`. The app schema references them by `userId TEXT`; **foreign
  keys are added in migration SQL**, not inferred from the schema file.
- **Connection:** `lib/db/client.ts` resolves TLS in order:
  1. `COCKROACH_CA_CERT` / `COCKROACH_CERT` env (if it contains
     `BEGIN CERTIFICATE`),
  2. committed `certs/cockroach-ca.crt`,
  3. system CAs.
- The pool is cached on `globalThis` outside production (hot reload must not
  leak connections) and carries an `error` listener — CockroachDB drops idle
  connections aggressively; without it an idle-client error is an unhandled
  `'error'` event that kills the process.
- Service reads are written defensively (`try/catch` → empty result) so an
  unmigrated table reads as "no data" instead of crashing.

---

## 6. DB schema map (90 tables by domain)

| Domain | Tables |
| --- | --- |
| **Identity & trust** | `profile`, `verification_request`, `kyc_document`, `notification_preference`, OTP/role verification |
| **Professional profile** | `work_experience`, `education`, `skill`, `profile_skill`, `certification`, `professional_registration`, `reference`, `project`, `recommendation` |
| **Companies & exhibitors** | `company`, `company_certification`, `employer_profile` |
| **Talent** | `job`, `application`, `job_invitation` |
| **Services & quotes** | `service`, `service_tier`, `quote_request`, `quote_proposal` |
| **Catalogue & commerce** | `product`, `product_variant`, `catalogue_entry`, `sales_order`, `order_item`, `invoice`, `buyer_address`, `customer_note` |
| **Wallets & ledger** | `payment_transaction`, `webhook_event`, `payment_retry`, `payout_account`, `vendor_payment_account`, `vendor_wallet`, `ledger_entry`, `report` |
| **Messaging** | `conversation`, `conversation_participant`, `message`, `notification` |
| **Feed & content** | `blog_post`, `taxonomy_term`, `ticker_item`, `announcement`, `advert`, `event`, `event_rsvp`, `promotion` |
| **Engagement** | `saved_item`, `saved_search`, `follow`, `list`, `list_item`, `review` |
| **Project management** | `pm_project`, `pm_project_member`, `pm_invite`, `pm_column`, `pm_task`, `pm_task_assignee`, `pm_tag`, `pm_task_tag`, `pm_milestone`, `pm_comment`, `pm_attachment`, `pm_activity` |
| **CRM & templates** | `crm_lead`, `bt_template`, `bt_download`, `bt_submission` |
| **Support** | `support_ticket`, `ticket_message` |
| **Email campaigns** | `audience_segment`, `email_campaign`, `email_campaign_event`, `broadcast_log` |
| **Helm (AI)** | `helm_conversation`, `helm_message`, `helm_document`, `helm_proposal`, `helm_usage`, `helm_quota` |
| **Quizzes** | `quiz_question`, `quiz_attempt` |
| **Platform** | `platform_setting` |

---

## 7. Auth & authorisation

- **Better Auth 1.6** — email/password + Google OAuth via
  `app/api/auth/[...all]/route.ts`.
- Session cookie is **host-only** (no `Domain=`) — deliberate; a `Domain=`
  attribute previously broke sign-in across apex and `www`.
- Google links to an existing account by **verified email**, so password
  users can later sign in with Google. Getting this wrong yields
  `account_not_linked`.
- Role and plan ride on the session; entitlement checks read from there,
  backed by `lib/services/plans.ts` and `exhibitor-plan-rules.ts`.
- Auth rate limiting is **table-backed** (`rateLimit`,
  `drizzle/0039_auth_rate_limit.sql`).

---

## 8. Storage

| Bucket | Env var | Access |
| --- | --- | --- |
| public | `R2_BUCKET_NAME` | served from `R2_PUBLIC_DOMAIN`, world-readable |
| private | `R2_PRIVATE_BUCKET` | **no public URL**; short-lived presigned GET only |

- `lib/storage/index.ts` picks **local disk** vs **S3**; local is selected when
  `STORAGE_BACKEND=local`, `R2_ACCOUNT_ID` is missing, or `R2_ENDPOINT=local`.
- Upload paths:
  - `/api/upload/presign` → presigned PUT, browser uploads direct (25MB).
  - `/api/upload` → server-side multipart fallback (4MB).
  - `/api/upload/local-private*` → local-storage private fallback.
- `R2_ENDPOINT` is honored for MinIO compatibility (`forcePathStyle`); unset
  falls back to `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
  **It must be publicly reachable** — see decision D-007.

---

## 9. Payments

- Adapters in `lib/payments/`: **Paystack**, **Flutterwave**, **SeerBit**.
  `PAYMENT_PROVIDER` forces one; blank auto-selects the fully configured one.
- "Fully configured" differs: Paystack = secret key only; Flutterwave = secret
  key **and** secret hash. None configured → **demo mode, no real charges**.
- Webhooks: `app/api/payments/[provider]/webhook/route.ts`, signature-verified.
  **Verify a POST returns 401 (bad signature), not 404, before switching a
  provider's webhook URL** — providers accept URLs that 404 and settlement is
  lost silently.
- Exhibitor checkout bypasses the global `payment-plans` toggle (D-008).

---

## 10. Helm boundary

`lib/helm/client.ts` is the only inbound path: a **server-only** HTTP client
reaching the VM through a Cloudflare Tunnel (`HELM_API_URL` +
`HELM_ACCESS_CLIENT_ID/SECRET`, or `HELM_INTERNAL_TOKEN`). Private documents,
embeddings and retrieval stay on the VM; only the synthesised answer returns.
Helm is never deployed to Vercel/the Next server. Unset Helm env ⇒ feature
unavailable, not an error.

---

## 11. Deployment

- **Dockerfile:** `node:22-bookworm-slim`, multi-stage, non-root `nextjs`,
  `output: "standalone"`, `UPLOAD_DIR=/app/uploads`, build args for
  `NEXT_PUBLIC_*`, optional `NODE_MAX_OLD_SPACE_SIZE`.
- **CI:** `.github/workflows/ci.yml` (type-check/build gate).
- **Dokploy** deploys the `nomarcapp` Swarm service; production env is stored
  **encrypted in Dokploy's Postgres** (AES-256-GCM keyed off
  `BETTER_AUTH_SECRET`). Runtime-only edits via `docker service update
  --env-add` are reverted on the next deploy (debt T-006).
