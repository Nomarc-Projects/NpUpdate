# Memory.md — long-term state, decisions & tech debt

Living document. Append decisions and open debt; prune when resolved.
Agent directive: read this at the start of a session; update it at the end of
non-trivial work.

---

## A. Current state (as of 2026-10-23)

| Fact | Value |
| --- | --- |
| Working branch | `VPS_Nomarc` |
| Remotes | `origin` → `Nomarc-Projects/NpUpdate`, `fullbuild` → `Nomarc-Projects/fullbuild` |
| `main` | **== `VPS_Nomarc`** — force-reset to `2dbf6fe` on 2026-10-15 (see D-010); the old diverged lineage is recoverable from GitHub reflog ~90 days |
| Build | `npm run type-check` ✅, `npm run build` ✅ |
| Lint | ❌ `npm run lint` crashes — no ESLint config file |
| Deploy | VPS + Dokploy (Traefik, `nomarcapp` Swarm service) |
| DB | PostgreSQL (Dokploy VPS container :5432, migrated from CockroachDB) |
| Storage | MinIO at `https://media.nomarcprojects.com` (Traefik → :9000) |
| Test suite | none (see `TESTING.md`) |

### Recent notable work

- **Nomarc Projects (2026-10-23)** — migration `0065_properties.sql` applied
  to production (32 statements, 10 tables + `properties` setting verified).
  Full listing lifecycle: fee calculator/config, public browse/detail with
  view tracking, owner list/edit + private document uploads/downloads, admin
  listing/document review, fee checkout/verify/webhook, inquiries via
  messaging, saved properties, free SOWR enrollment, lister CAC/identity
  verification, offline buyer transactions with printable and publicly
  verifiable certificates, admin fee reconciliation, and owner listing
  close/archive. Lease/rent payment transactions and live testing remain.
- **Exhibitor plan enforcement** — per-plan category caps (SME 1 / Exhibitor 5 /
  Key Player 10), 10 listings per category, upgrade messaging, plan banner.
- **Exhibitor category (shop) creation** — "Add a new category" on the product
  upload form and `allowCreate` in the company profile category picker; both are
  plan-capped and pop an upgrade prompt at the limit. The upload dropdown reads
  `company.categories`. (2026-10-15)
- **Role-aware plans page** — `/dashboard/plans` shows a Professional section
  only when the viewer holds `professional` (or holds no exhibitor role) and an
  Exhibitor section when they hold `exhibitor`; the disabled-professional-page
  dead-end for exhibitors is gone. (2026-10-15)
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

**D-013 · Doppler project is `nomarc_projects`, not `nomarc`.** The installed
token only has access to `nomarc_projects` (configs dev/stg/prd). Migration
commands are
`doppler run -p nomarc_projects -c prd -- node scripts/apply-migration.cjs <file>`.
Do not use the older `-p nomarc` form in migration comments.

**D-014 · Buyer property transactions are recorded offline, then completed by
an admin.** A buyer “requests to purchase” a `sale`/`bulk_land` listing, which
creates a `property_transaction` (`pending`). Nomarc confirms the offline
transaction in `/admin/properties/transactions`, which marks it `completed`,
sets the listing to `sold`, and issues a printable `property_certificate`.
Certificates are HTML print views, publicly verifiable by number at
`/properties/certificates`, and not title documents. SOWR enrollment is free,
separate from the transaction, and open from `/properties/sowr`. Listing-fee
payments are reconciled in `/admin/properties/fees`.

**D-015 · Voice notes are transcoded to AAC/M4A server-side.** iOS Safari has no
WebM/Ogg decoder, so a note recorded on Chrome/Android is silent on an iPhone.
After upload, the client asks `/api/upload/transcode` for a converted copy;
the server reads the object back, runs ffmpeg (`@ffmpeg-installer/ffmpeg`, or
`FFMPEG_PATH`), and stores `<key>.m4a`. The original is kept, and any failure
(same binary missing, bad input) falls back to the original recording so a send
never fails. This is a *forward fix only*: notes already stored as WebM stay
WebM until a backfill is run. See `lib/audio-transcode.ts`.

**D-016 · Local development uses an embedded Postgres, built from
`lib/db/schema.ts`, not from `drizzle/*.sql`.** `embedded-postgres` provides real
Postgres binaries without Docker or root; `npm run db:start` runs it on
`127.0.0.1:55432` with data in `.localdb/`, and `.env.local` points
`DATABASE_URL` there, so `npm run dev` cannot reach production. `db:migrate`
uses `drizzle-kit push` because the migration chain is incomplete: fourteen
tables (`announcement`, `review`, `service`, `blog_post`, `bt_*`, …) exist in
the schema but in no migration file, and `0011` fails on a fresh cluster with
`relation "announcement" does not exist`. Better Auth's tables are created
afterwards with its own migration API. A fresh environment built from
`drizzle/*.sql` alone will be broken until that drift is captured in a
migration (tracked in T-012).

**D-017 · Dokploy deploys build from GitHub, not from this machine.** The
deployable source of truth is `Nomarc-Projects/NpUpdate` (branches `main` and
`VPS_Nomarc`). This machine's repo has its own fresh lineage and no remote, so
nothing here reaches production until it is synced to GitHub. The Docker build
type-checks (Turbopack), so a type error fails the whole deploy even when the
Dockerfile looks fine — run `npx tsc --noEmit` and a real `next build` against
the GitHub tree before pushing. `main` and `VPS_Nomarc` have diverged again
(2026-11-16); fix commits go to `VPS_Nomarc` first, `main` only when
deliberately synced.

**2026-11-16 update:** `VPS_Nomarc` now carries the 2026-11-14 work
(`7bfe195`: voice-note transcode + local dev DB) on top of the build fix.

**2026-11-16 update 2:** `main` was force-pushed to match `VPS_Nomarc`
(`a18b6a6`, including the `/backup` console) — the branches are in lockstep;
the divergence noted above is resolved.

**D-018 · The `/backup` console is the sanctioned way to move the database.**
Super-admin only (Better Auth session with `role === "super_admin"`, checked in
both the page and the POST-only, same-origin `/api/backup/download` route).
`lib/db/backup.ts` streams one self-contained `.sql` — schema from the live
database's `information_schema` (not `drizzle/*.sql`), data from a single
`REPEATABLE READ READ ONLY` snapshot with keyset pagination, FKs after data,
duplicate-tolerant everywhere — because the runtime image has no `pg_dump` and
the runtime DB can be Postgres or CockroachDB. Restore with
`npm run db:restore -- file.sql` into an **empty** database (guard-railed
against remote/populated targets; one implicit transaction). The dump pool
passes date/time and json columns through as raw text — the default JS `Date`
parse would truncate timestamps to milliseconds and the round trip would
silently lose data (this was caught by the hash-compare verification, not by
row counts, which all matched). Secrets are not in the dump; carry Dokploy env
over separately.

**D-011 · Property listing fee = flat + full-value bracket rate.** Charged once,
in NGN, after admin approval and before publish. The bracket rate applies to
the whole normalised value (not progressive); values below ₦100,000 pay the flat
fee only. The flat fee, FX rates and 90-day duration live in the `properties`
platform setting so they change without a deploy. See
`lib/properties/pricing.ts`.

**D-012 · Property documents are private-by-default.** Deeds, C of O, survey
plans and CAC documents go to the private bucket (`property_doc/${uid}/…`) via
presigned PUT or `/api/upload/private`. Public pages expose review status only.
The listing fee is a marketplace charge, not a property transaction; buyer
checkout and certificates are later phases.

**D-010 · `main` == `VPS_Nomarc` (force-reset 2026-10-15).** At the operator's
explicit request, `main` was deleted and recreated from `VPS_Nomarc`
(`2dbf6fe`) so the two branches are identical. `main`'s previous diverged
lineage (17 commits: Postgres host config, Cockroach→Postgres data copy, MinIO
compose, Umami tracker, its own `Dockerfile`) was overwritten; it survived on
GitHub's reflog for ~90 days. The earlier rule (deliver docs to `main` by
cherry-picking, never merge wholesale) is superseded — keep the two branches in
lockstep by pushing `VPS_Nomarc` to both.

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
| T-011 | **Resolved** | Local dev could not reach the DB | `.env` `DATABASE_URL` pointed at a stale Cockroach Cloud host and live is firewalled. Fixed 2026-11-14: `npm run db:start` runs a loopback Postgres and `.env.local` points at it (D-016). |
| T-012 | **P2** | Migrations applied by hand, no ledger | `drizzle/0063_plan_trial.sql` had to be applied manually on 2026-10-15 because prod was missing it while the deployed build already selected `trial_ends_at`. Nothing records which migrations a cluster has applied, so drift recurs. A local rebuild on 2026-11-14 found **14 tables in `lib/db/schema.ts` with no `CREATE TABLE` in any migration** (`announcement`, `review`, `service`, `blog_post`, `bt_*`, `crm_lead`, `payment_transaction`, …); `0011` fails on a fresh cluster. Local dev sidesteps this by pushing the schema (D-016), but a fresh deployment from migrations alone would still be broken. |
| T-015 | **P2** | Nomarc Projects transaction flow is manual and shallow | Buyer transactions are sale/bulk-land only, completed by an admin after offline payment; SOWR membership is not linked to a purchase. Lease/rent transaction completion and live provider testing are not implemented. Certificates are publicly verifiable but carry no legal title. |
| T-013 | **P1** | Provider webhooks are not landing; paid orders stay `pending` | GBG SALES LTD had 4 `exhibitor/monthly/₦205,000/seerbit` rows all `pending` while the customer held a receipt. Root cause is unverified — check the Seerbit/Paystack callback URL and webhook signature handling; `configuredProviders()` / `PAYMENT_PROVIDER` may be unset in prod. Until fixed, payments rely on `reconcilePending` or the admin repair tool (`logupdate.md` 2026-10-15). |

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
