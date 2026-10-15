# API.md — endpoints & integration contracts

Two surfaces exist:

1. **Server actions** in `lib/services/*` — the primary interface. Pages call
   them directly; they are not HTTP-discoverable and have no URL. Treat them
   as the app's internal API (see §1).
2. **Route handlers** in `app/api/*` — 18 handlers, reserved for callbacks,
   webhooks, binary responses, pixels and third-party proxies (see §2).

**General rules**
- All handlers set `export const runtime = "nodejs"` unless noted.
- Auth for session-scoped handlers uses `getCurrentUserId()` from
  `lib/server-user`; unauthenticated ⇒ `401`.
- `frozenResponse()` is consulted first where a maintenance/lock state applies.
- Errors are `{ error: string }` JSON with a meaningful status.

---

## 1. Server actions (internal contract)

```ts
// lib/services/<domain>.ts
import "use server";  // implicit in module style
export async function someMutation(input: Validated): Promise<Result>
```

- Input is validated (zod) at the boundary; output is plain JSON-serialisable
  data — **never** a component reference, Date-heavy blobs, or a Drizzle query
  object.
- Mutations call `revalidatePath` on the affected route.
- Reads return `[]` / `null` on failure rather than throwing, so an
  unmigrated table looks like "no data" (see `ARCHITECTURE.md` §5).
- **Exports must be async functions only.** Exporting a `const` silently
  drops every export in that file (see `.cursorrules` #2).

---

## 2. Route handlers

| # | Route | Methods | Auth | Purpose & contract |
| --- | --- | --- | --- | --- |
| 1 | `/api/auth/[...all]` | * | Better Auth | All auth endpoints (sign-in/up, OAuth, session, verification). Never customise ad-hoc — configure via Better Auth options. |
| 2 | `/api/upload/presign` | `POST` | session | Body `{ kind, contentType, size }` → `{ uploadUrl, publicUrl, key }`. `kind` ∈ `avatar, logo, project, product, resume, doc, chat, helm`. Validates MIME + 25MB. `helm` returns `{ uploadUrl, key, private: true }` (no public URL). `503` if storage unconfigured. |
| 3 | `/api/upload` | `POST` | session | multipart `file` + `kind`. Server-side fallback, **4MB** cap, images/PDF only → `{ url }`. |
| 4 | `/api/upload/local-private` | `PUT` | signed params | Local-storage private PUT fallback (key/contentType/expires). |
| 5 | `/api/upload/local-private/download` | `GET` | signed params | Local-storage private GET with `sig`. |
| 6 | `/api/uploads/[...path]` | `GET` | public | Serves `uploads/<path>` from disk. Strips `..`, immutable cache headers, `404` on miss. |
| 7 | `/api/payments/[provider]/webhook` | `POST` | signature | Paystack (HMAC-SHA512), Flutterwave (secret hash), SeerBit. Must return **401**, never 404, for a bad signature — a 404 means settlement is being lost silently. |
| 8 | `/api/payments/reconcile` | `POST` | `x-api-key` / `Authorization: Bearer` vs `INTERNAL_API_KEY` | Drains the retry queue + reconciles pending settlements → `{ retried, reconciled }`. |
| 9 | `/api/email/drain` | `POST`, `GET` | `x-drain-secret` vs `MAIL_DRAIN_SECRET` | Campaign queue drain/inspection. Shared-secret auth (no session) because the caller is a worker. |
| 10 | `/api/email/open` | `GET` | none | 1×1 GIF pixel; params `c` (campaign), `u` (recipient). **Always returns the image**, even if recording fails. |
| 11 | `/api/email/click` | `GET` | none | Redirects to the tracked link, records the click, honours unsubscribe. |
| 12 | `/api/email/unsubscribe` | `GET` | signed token `t` | One-click unsubscribe. Safety comes from the signed token, not a session. |
| 13 | `/api/helm` | `POST` | session + entitlement | Chat relay to Helm (`aiConsultant` entitlement, plan-gated). `403` → upgrade prompt, `503` → backend not configured (UI shows coming-soon), quota → soft stop/upgrade prompt. |
| 14 | `/api/helm/documents` | `GET`, `POST`, `DELETE` | session + ownership | Private doc registration/listing/deletion against the private bucket. Ownership is enforced here (presign namespaces keys by user id). |
| 15 | `/api/helm/proposal` | `POST` | session + entitlement | Proposal synthesis through Helm. |
| 16 | `/api/guide` | `POST` | none + rate limit | Public site assistant. Body `{ message }` (≤2000 chars) → assistant reply. `429` rate limited, `502` provider unavailable. |
| 17 | `/api/promotions/track` | `POST` | none (by necessity) | `{ type, id }` impression/click tracking. Validates UUID, filters bots, de-duplicates; always `200`-ish so tracking never breaks the page. |
| 18 | `/api/templates/download` | `GET` | session | Authenticated download of bundled contract/BOQ/programme templates. |

---

## 3. External integrations

### Payments (outbound)
Three adapters behind one selector in `lib/payments/`:

| Provider | Env required | Callback |
| --- | --- | --- |
| Paystack | `PAYSTACK_SECRET_KEY` (+ `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`) | HMAC-SHA512 over the payload |
| Flutterwave | `FLUTTERWAVE_SECRET_KEY` **and** `FLUTTERWAVE_WEBHOOK_HASH` | comparison against secret hash |
| SeerBit | `SEERBIT_SECRET_KEY`, `SEERBIT_PUBLIC_KEY` | signature verification |

`PAYMENT_PROVIDER` pins one; blank auto-selects the fully configured adapter.
**No provider ⇒ demo mode, no real charges.** `ALLOW_DEMO_PAYMENTS=false` in
production.

### Helm (inbound)
`lib/helm/client.ts` → Cloudflare Tunnel → Python VM. Transport: HTTP with
`HELM_ACCESS_CLIENT_ID` / `HELM_ACCESS_CLIENT_SECRET` (or `HELM_INTERNAL_TOKEN`).
Only synthesised answers cross back; documents/embeddings stay on the VM.

### Storage (S3)
- Endpoint: `R2_ENDPOINT` (must be **publicly reachable**; `forcePathStyle`
  when set). Public base: `R2_PUBLIC_DOMAIN`.
- Private bucket: `R2_PRIVATE_BUCKET`, never publicly addressable.

### Email
SMTP via `SMTP_*` / `EMAIL_FROM`, or Resend (`RESEND_API_KEY`). Campaign mail
is queued and drained by `/api/email/drain`.

### Realtime
Socket (`NEXT_PUBLIC_SOCKET_URL`) for messaging presence/messages.

---

## 4. Adding a new endpoint

1. Prefer a **server action** in `lib/services/`. Only create a route handler
   if it's a callback, webhook, binary/pixel response, or external proxy.
2. `export const runtime = "nodejs"`; consult `getCurrentUserId()` and
   `frozenResponse()` where the rest of the codebase does.
3. Validate input, return `{ error }` + a real status code.
4. Never return secrets; never place a secret in a `NEXT_PUBLIC_*` var.
5. Document it in the table above and note it in `logupdate.md`.
