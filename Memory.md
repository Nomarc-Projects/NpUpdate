# Memory.md — long-term state, decisions & tech debt

Living document. Append decisions and open debt; prune when resolved.
Agent directive: read this at the start of a session; update it at the end of
non-trivial work.

---

## A. Current state (as of 2026-10-14)

| Fact | Value |
| --- | --- |
| Working branch | `VPS_Nomarc` |
| Remotes | `origin` → `Nomarc-Projects/NpUpdate`, `fullbuild` → `Nomarc-Projects/fullbuild` |
| Also present | `main` (both remotes) |
| Build | `npm run type-check` ✅, `npm run build` ✅ |
| Lint | ❌ `npm run lint` crashes — no ESLint config file |
| Deploy | VPS + Dokploy (Traefik, `nomarcapp` Swarm service) |
| DB | CockroachDB (single cluster = production, no dev DB) |
| Storage | MinIO at `https://media.nomarcprojects.com` (Traefik → :9000) |
| Test suite | none (see `TESTING.md`) |

### Recent notable work

- **Exhibitor plan enforcement** — per-plan category caps (SME 1 / Exhibitor 5 /
  Key Player 10), 10 listings per category, upgrade messaging, plan banner.
- **Exhibitor checkout decoupled** from the global `payment-plans` toggle so
  exhibitors can always subscribe; `/dashboard/plans/exhibitor`.
- **Dashboard marketing header** — news ticker + main nav on dashboard pages.
- **Upload outage fixed (2026-10-14)** — see decision D-007.
- Institution lists expanded to **869** entries (`lib/data/nigeria-institutions.ts`).

---

## B. Decisions (and the reason they exist)

**D-001 · No REST/GraphQL tier.** Pages call `lib/services/*` server actions.
Adding an API layer for its own sake is out of scope.

**D-002 · `npm run build` is the verification gate, not `tsc`.** Three known
failure classes pass `tsc` and only fail `build` (see `.cursorrules` #2).

**D-003 · Migrations are hand-applied, in order.** `drizzle-kit generate` only.
`drizzle.config.ts` has no `dbCredentials` on purpose.

**D-004 · Session cookies are host-only** (no `Domain=` attribute). A `Domain=`
attribute previously broke sign-in across apex + `www`.

**D-005 · Helm stays on its VM.** Private documents/embeddings never cross;
`lib/helm/client.ts` is the only inbound path.

**D-006 · Private bucket has no public URL.** Reads only via presigned GET
after an ownership check; `privateDownloadUrl()` intentionally does no
authorisation itself.

**D-007 · `R2_ENDPOINT` must be the public S3 endpoint.**
`R2_ENDPOINT=http://host.docker.internal:9000` caused a total upload outage
(host unresolvable from the app container *and* from the browser, because
presigned URLs embed it). Set to `https://media.nomarcprojects.com`.
Both the live service and Dokploy's stored (encrypted) env were updated.
**Do not point `R2_ENDPOINT` at any host that is only reachable inside
Docker.**

**D-008 · Exhibitor checkout bypasses the global payment-plans toggle.**
Global toggle gates *professional* plans only; otherwise exhibitors could be
locked out of paying entirely.

**D-009 · Quota enforcement lives in `lib/services/exhibitor-plan-rules.ts` +
`exhibitor-trial.ts`.** Limits are read from there everywhere; do not
re-implement caps in UI code.

---

## C. Tech debt register

| ID | Sev | Item | Notes |
| --- | --- | --- | --- |
| T-001 | **P0** | `npm run lint` broken — no ESLint config | `package.json` declares `"lint": "eslint"`; ESLint 9 has no config file. Either add `eslint.config.mjs` (with `eslint-config-next`) or remove the script. |
| T-002 | **P0** | No automated tests | No runner, no `test` script, no test dirs. `TESTING.md` records the manual gate. |
| T-003 | **P1** | Production env has `localhost` auth/site URLs | `AUTH_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` = `http://localhost:3000`; `NEXT_PUBLIC_API_URL` = `localhost:5000`. Works today — verify before touching, then set to `https://nomarcprojects.com`. |
| T-004 | **P1** | MinIO CORS allows any origin | `MINIO_API_CORS_ALLOW_ORIGIN` unset ⇒ MinIO reflects any `Origin` with credentials. Risk is low (signed URLs, no cookies) but should be set to `https://nomarcprojects.com,https://www.nomarcprojects.com` in `/root/minio/docker-compose.yml`. |
| T-005 | **P1** | `README.md` numbers are stale | README says 87 tables / 66 services / 47 migrations / 15 API routes; actual is **90 / 76 / 66 / 18** (76 = 72 top-level service files + 4 under `lib/services/pm/`). |
| T-006 | **P2** | `docker service update --env-add` is ephemeral | Runtime env edits are reverted by the next Dokploy deploy; durable changes go in Dokploy's stored env (encrypted in Postgres). |
| T-007 | **P2** | Presign SDK sends a fixed CRC32 in the URL | `@aws-sdk/client-s3` defaults add `x-amz-checksum-crc32` computed over an empty body. MinIO currently accepts it; set `requestChecksumCalculation: "WHEN_REQUIRED"` if a stricter S3 ever rejects. |
| T-008 | **P2** | `/app/uploads` local fallback coexists with S3 | `STORAGE_BACKEND=local` is a supported fallback; make sure prod never silently falls back (it degrades URL shape). |
| T-009 | **P3** | `.env.vps` is a local-storage template | Easy to mistake for production config. Consider renaming to `.env.local.example`. |
| T-010 | **P2** | `.env.example` is incomplete | Omits `DATABASE_URL`, all `R2_*`, `SMTP_*`, `INTERNAL_API_KEY`, `MAIL_DRAIN_SECRET`, `JWT_SECRET`, etc. `ENV.md` is the complete list until this is fixed. |

---

## D. Conventions worth remembering

- Skeletons co-located: `XxxSkeleton` export in the same file as the page
  component; `loading.tsx` imports it.
- Brand tokens: yellow `#ffd716`, ink `#1e1e1e`, grey `#898989`; every surface
  ships `dark:`.
- Fonts: `Outfit` for headings, `Montserrat` for body.
- Forms: `react-hook-form` + `zod` + `@hookform/resolvers`.
- Toasts: `sonner`. Icons: `lucide-react`.
- Client state: Zustand (`lib/store/`), 6 stores. TanStack Query is
  **client components only**, for incremental updates after first paint.
- Payments: three adapters behind one selector in `lib/payments/`.
