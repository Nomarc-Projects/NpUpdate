# `frontend/`; the Nomarc web application

This is the product. Everything a user sees, and nearly all of the business
logic, lives here. It is a **Next.js 16 App Router** application that talks
directly to PostgreSQL through Drizzle server actions; there is no API tier
between the two.

> **The single most important thing to know:** `npm run dev` reads and writes
> the **production database**. See [Working against production](#working-against-production)
> before you run anything.

---

## Contents

- [Stack](#stack)
- [Working against production](#working-against-production)
- [Directory reference](#directory-reference)
- [How a request flows](#how-a-request-flows)
- [Data layer](#data-layer)
- [Migrations](#migrations)
- [Authentication and authorisation](#authentication-and-authorisation)
- [File uploads and R2](#file-uploads-and-r2)
- [Payments](#payments)
- [Helm; the AI service boundary](#helm--the-ai-service-boundary)
- [Email](#email)
- [Conventions that are load-bearing](#conventions-that-are-load-bearing)
- [Failure modes that type-checking will not catch](#failure-modes-that-type-checking-will-not-catch)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)

---

## Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16, App Router | Server Components by default |
| UI runtime | React 19 | |
| Language | TypeScript, strict | `npx tsc --noEmit` |
| Styling | Tailwind CSS v4 | via `@tailwindcss/postcss`; no `tailwind.config.js` |
| Primitives | Radix UI + `class-variance-authority` | wrapped in `components/ui/` |
| ORM | Drizzle ORM `0.45` | `drizzle-orm/node-postgres` |
| Database | PostgreSQL | Self-hosted/Postgres (migrated from CockroachDB) |
| Auth | Better Auth `1.6` | email/password + Google OAuth |
| Client state | Zustand | 6 stores, `lib/store/` |
| Server cache | TanStack Query | client components only |
| Motion | Framer Motion, GSAP, OGL | |
| Rich text | TipTap 3 | news feed + email campaign editors |
| Object storage | Cloudflare R2 | via `@aws-sdk/client-s3` |

Node is pinned to `22.x` in `engines`. The deployed Vercel project runs `24.x`.

---

## Working against production

`frontend/.env` contains a `DATABASE_URL` pointing at your PostgreSQL
database. Adjust it for your local/VPS environment.

Consequences, all of which have bitten before:

- `npm run dev` mutates live data. Signing up, placing an order, or toggling a
  setting locally is a **production write**.
- Never "just try it" to see what a mutation does. Read the service function
  instead.
- Seed and reset scripts (`scripts/seed-*.ts`, `scripts/dev-reset`) are
  destructive against real rows.

If you need a scratch database, point `DATABASE_URL` at your own PostgreSQL
instance and apply `drizzle/*.sql` in order. Nothing in the code assumes a
specific host.

---

## Directory reference

```
frontend/
├── app/                     # routes (App Router)
│   ├── (marketing)/         # public: home, about, newsfeed, contact, tools,
│   │                        #   exhibition-hub, company, profile, settings
│   ├── (auth)/              # full-screen: login, signup, forgot/reset-password,
│   │                        #   verify-email
│   ├── (dashboard)/         # authenticated app shell (sidebar chrome)
│   ├── admin/               # admin console; own shell, 25+ sections
│   └── api/                 # 15 route handlers (see below)
├── components/              # 278 files
├── lib/                     # all non-UI logic
├── drizzle/                 # 47 SQL migrations + meta/
├── scripts/                 # 24 operational scripts (not app code)
├── certs/                   # CA certs (committed, non-secret if public)
├── types/                   # ambient declarations
└── public/                  # brand assets, media, favicon
```

### Route groups

The parenthesised segments are Next.js **route groups**; they set the layout
chrome without appearing in the URL.

| Group | Chrome | Auth |
| --- | --- | --- |
| `(marketing)` | navbar + footer | public |
| `(auth)` | full-screen split panel | public, redirects when signed in |
| `(dashboard)` | sidebar + topbar | required |
| `admin` | separate admin shell | admin role required |

### `components/`

| Directory | Files | What |
| --- | --- | --- |
| `dashboard/` | 108 | one component per dashboard page, each exporting its own skeleton |
| `admin/` | 49 | admin console surfaces |
| `ui/` | 46 | shared primitives; `Modal`, `Skeleton`, `Reveal`, `Logo`, `ImportData`, … |
| `tour/` | 18 | product tour / onboarding walkthrough |
| `pm/` | 15 | project management: Kanban, tasks, timeline |
| `exhibition-hub/` | 11 | exhibitor showroom |
| `profile/` | 6 | profile + company tabs, public profile |
| `newsfeed/` | 5 | listing + detail |
| `auth/` | 4 | forms, brand panel, password confirm |
| `layout/` | 4 | navbar, footer, sidebar, mobile drawer |
| `marketing/` | 3 | marketing-only blocks |
| `shop/` | 2 | buyer-facing catalog |
| `helm/` | 2 | Helm consultant UI |
| `guide/` | 1 | public site assistant widget |
| `not-found/` | 1 | 404 |

### `lib/`

| Directory | What |
| --- | --- |
| `db/` | `schema.ts` (87 `pgTable` definitions) and `client.ts` (pool + Drizzle instance) |
| `services/` | **66 modules**; the entire data access layer, as server actions |
| `payments/` | provider adapters: `paystack.ts`, `flutterwave.ts`, `seerbit.ts`, plus `index.ts` selector and shared `types.ts` |
| `email/` | `mailer.ts` (SMTP), `shortcodes.ts`, `tracking.ts` (open/click pixels), `unsubscribe.ts` |
| `helm/` | `client.ts`; server-only HTTP client for the Helm VM; `disciplines.ts` |
| `store/` | Zustand: `auth`, `cart`, `cart-ui`, `compare`, `nav-ui`, `preloader` |
| `constants/` | reference data; Nigerian banks, industries, ID types, product units, corporate docs |
| `hooks/` | shared React hooks |
| `data/` | static seed-ish content |

### `app/api/`

Route handlers exist only where a server action cannot do the job; callbacks,
webhooks, binary responses and third-party pixels.

| Route | Purpose |
| --- | --- |
| `auth/[...all]` | Better Auth handler (all auth endpoints) |
| `payments/[provider]/webhook` | Paystack / Flutterwave / SeerBit callbacks |
| `payments/reconcile` | settlement reconciliation |
| `upload`, `upload/presign` | R2 uploads (direct and presigned) |
| `email/open`, `email/click` | tracking pixels and link redirects |
| `email/drain` | outbound campaign queue drain |
| `email/unsubscribe` | one-click unsubscribe |
| `helm`, `helm/documents`, `helm/proposal` | proxy to the Helm VM |
| `guide` | public site assistant |
| `promotions/track` | promotion impression/click tracking |
| `templates/download` | authenticated template file download |

---

## How a request flows

A typical authenticated page:

1. **Route**; a Server Component under `app/(dashboard)/…/page.tsx`.
2. **Session**; Better Auth resolves the session from a host-only cookie.
   Role and plan are read off the session.
3. **Data**; the page `await`s one or more functions from `lib/services/*`.
   These are `"use server"` modules using Drizzle against PostgreSQL.
4. **Render**; the page renders a component from `components/dashboard/`.
   Its co-located `XxxSkeleton` export is used by the route's `loading.tsx`.
5. **Mutation**; form submissions call another server action in the same
   service module, then `revalidatePath`.

There is no client-side data fetching for first paint, and no REST layer.
TanStack Query appears only inside client components for incremental updates.

---

## Data layer

`lib/db/schema.ts` defines 87 tables with Drizzle. Better Auth owns four more
(`user`, `session`, `account`, `verification`) which the app schema references
by `userId TEXT` rather than a Drizzle relation; foreign keys are added in the
migration step, not inferred from the schema file.

`lib/db/client.ts` resolves TLS in a deliberate order:

1. `COCKROACH_CA_CERT` or `COCKROACH_CERT` from the environment, if it contains
   `BEGIN CERTIFICATE`
2. a committed CA cert in `certs/` (if any)
3. system CAs

The pool is cached on `globalThis` outside production so hot reload does not
leak connections, and an `error` listener is attached because many Postgres
hosts drop idle connections aggressively; without it, an idle-client error is an unhandled
`'error'` event and takes the process down.

Service reads are written to be **resilient**: a `try/catch` that returns an
empty result. This is why the app does not crash against a table that has not
been migrated yet, and why a silently failing query can look like "no data"
rather than an error.

---

## Migrations

Migrations are **hand-applied, in order**. `drizzle-kit` is used only to
*generate* SQL; never to push.

```bash
cd frontend
doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0044_job_posting_details.sql
```

- 47 files in `drizzle/`, currently through `0044_job_posting_details.sql`.
- `drizzle.config.ts` intentionally has no `dbCredentials`; it points at the
  schema and output directory only, so `drizzle-kit generate` cannot touch a
  live database.
- Applying out of order, or skipping one, will leave the schema inconsistent
  with `schema.ts` in ways type-checking cannot see.

---

## Authentication and authorisation

Better Auth handles email/password and Google OAuth through
`app/api/auth/[...all]`.

- Session cookies are **host-only**. This was a deliberate fix: a `Domain=`
  attribute broke sign-in across the apex and `www` hosts.
- Google sign-in links to an existing account by verified email, so a user who
  registered with a password can later use Google without creating a second
  account. Getting this wrong produces `account_not_linked`.
- Role and plan are carried on the session. Entitlement gating for Free /
  Professional / Enterprise reads from there, backed by
  `lib/services/plans.ts` and `exhibitor-plan-rules.ts`.
- Rate limiting for auth endpoints is table-backed (`rateLimit`), added in
  `drizzle/0039_auth_rate_limit.sql`.

---

## File uploads and R2

`lib/r2.ts` wraps two buckets:

| Bucket | Env var | Access |
| --- | --- | --- |
| public | `R2_BUCKET_NAME` | served from `R2_PUBLIC_DOMAIN`, world-readable |
| private | `R2_PRIVATE_BUCKET` | **no public URL**; reads only via short-lived presigned GET |

The private bucket holds Helm documents; contracts, BOQs, drawings.
`privateDownloadUrl()` deliberately performs **no authorisation of its own**;
the caller must verify ownership before minting a URL.

`r2Configured` and `r2PrivateConfigured` are booleans the app checks before
offering upload UI, so an unconfigured environment degrades instead of throwing.

---

## Payments

Three providers are implemented behind one interface in `lib/payments/`:
Paystack, Flutterwave and SeerBit. `PAYMENT_PROVIDER` forces one; leaving it
blank auto-picks whichever is fully configured.

"Fully configured" differs per provider; Paystack needs only its secret key,
Flutterwave needs **both** the secret key and the secret hash. With none
configured the app runs in **demo mode** and takes no real charges.

Webhooks land at `app/api/payments/[provider]/webhook/route.ts` and are
signature-verified (Paystack: HMAC-SHA512 of the secret key; Flutterwave:
comparison against the configured secret hash).

> Webhook URLs must point at a host that actually serves this app. A provider
> will happily accept a URL that 404s, and you will lose settlement callbacks
> silently; charges taken, orders never settled. Verify a `POST` to the path
> returns 401 (bad signature), not 404, before switching a provider's URL.

---

## Helm; the AI service boundary

Helm is a **separate Python service** (see `../helm/`) running on an Oracle
Cloud VM. It is never deployed to Vercel.

`lib/helm/client.ts` is the only way in: a server-only HTTP client that reaches
the VM through a Cloudflare Tunnel using an Access service token
(`HELM_API_URL`, `HELM_ACCESS_CLIENT_ID`, `HELM_ACCESS_CLIENT_SECRET`, or
`HELM_INTERNAL_TOKEN` depending on environment).

Private documents, embeddings and retrieval stay on the VM. Only the final
synthesised answer crosses back.

---

## Email

`lib/email/mailer.ts` sends through SMTP (`SMTP_*` / `EMAIL_FROM`). Campaign
mail is queued and drained by `app/api/email/drain`, with opens and clicks
tracked via `email/open` and `email/click`. `shortcodes.ts` performs merge-field
substitution; `unsubscribe.ts` backs one-click unsubscribe.

---

## Conventions that are load-bearing

- **Skeletons are co-located.** A page component and its `XxxSkeleton` live in
  the same file so loading states cannot drift from the real layout. `loading.tsx`
  imports the skeleton.
- **Data access goes through `lib/services/`.** Components do not import
  `db` directly.
- **Shared UI lives in `components/ui/`.** Anything used twice belongs there.
- **Brand tokens:** yellow `#ffd716`, ink `#1e1e1e`, dark surfaces `#111` /
  `#1e1e1e`. Every surface ships `dark:` variants.
- **Type-check before pushing:** `npx tsc --noEmit`; but see the next section,
  because it is not sufficient.

---

## Failure modes that type-checking will not catch

These are real, previously-hit failures. `tsc --noEmit` stays silent for all of
them; only `npm run build` catches them.

**1. A `"use server"` module exporting a non-function.**
A `"use server"` file may export *only* async functions. Export a `const` and
the bundler silently drops **every export in the file**; the module still
type-checks, and every caller gets `undefined` at runtime.

**2. Passing a component reference across the server/client boundary.**
Passing `icon: SomeIcon` from a Server Component to a Client Component crashed
`/admin`. Pass a serializable *name* and resolve it to a component on the client.

**3. Static-vs-dynamic rendering mistakes.**
A page that reads cookies or headers becomes dynamic. Getting this wrong shows
up as a build error or a stale page, never as a type error.

The rule: **verify with `npm run build`, not just `npx tsc --noEmit`.**

---

## Scripts

`scripts/` holds 24 operational scripts. They are not application code and are
not bundled.

| Script | Purpose |
| --- | --- |
| `apply-migration.cjs` | apply one `drizzle/*.sql` file; the only sanctioned migration path |
| `verify-migration.cjs` | check a migration landed |
| `seed-auth.ts` | demo accounts (professional / exhibitor / admin) |
| `seed-directory.ts`, `seed-projects.ts`, `seed-launch-campaign.ts` | sample data |
| `pull-legacy-users.ts`, `import-legacy-users.ts`, `clean-legacy-users.ts`, `analyze-legacy-users.ts`, `probe-legacy-roles.ts` | legacy ASP.NET/SQL Server migration |
| `inspect-legacy-db.ts`, `legacy-db.ts` | read-only legacy SQL Server access |
| `migrate-company-cert.ts`, `migrate-crm.ts`, `migrate-pm.ts` | one-off data migrations |
| `mirror-images-to-r2.ts` | move legacy images into R2 |
| `make-super-admin.cjs`, `verify-user-role.cjs` | role administration |
| `reset-imported-passwords.ts` | password reset blast for imported users |
| `verify-platform-settings.cjs` | settings sanity check |

Legacy scripts issue `SELECT` only against the old SQL Server and must never be
added to the Vercel environment.

---

## Environment variables

Secrets live in Doppler (project `nomarc`, configs `dev` / `dev_personal` /
`stg` / `prd`) and are mirrored into `frontend/.env`, which is gitignored.
Next.js reads `frontend/.env`; the repo-root `.env` is **not** read by the app.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `PG_CA_CERT` | optional | CA certificate for Postgres (falls back to `COCKROACH_*`/`certs/cockroach-ca.crt`) |
| `AUTH_SECRET` | yes | Better Auth session secret |
| `AUTH_URL` | yes | canonical app origin |
| `ALLOWED_ORIGINS` | yes | CORS allowlist |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Google OAuth | |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_DOMAIN` | for uploads | public bucket |
| `R2_PRIVATE_BUCKET` | for Helm documents | private bucket; unset disables the feature |
| `PAYMENT_PROVIDER` | no | forces one provider; blank auto-selects |
| `PAYSTACK_SECRET_KEY` | per provider | |
| `FLUTTERWAVE_SECRET_KEY` + `FLUTTERWAVE_SECRET_HASH` | per provider | **both** required |
| `SEERBIT_SECRET_KEY` / `SEERBIT_PUBLIC_KEY` | per provider | |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` / `EMAIL_FROM` | for email | |
| `HELM_API_URL` / `HELM_ACCESS_CLIENT_ID` / `HELM_ACCESS_CLIENT_SECRET` / `HELM_INTERNAL_TOKEN` | for Helm | unset ⇒ feature unavailable, not an error |
| `LEGACY_MSSQL_*` | migration scripts only | never add to Vercel |
| `NEXT_PUBLIC_*` |; | exposed to the browser; never put a secret here |

---

## Commands

```bash
npm run dev          # dev server; WRITES TO PRODUCTION
npm run build        # production build; the real verification step
npm run start        # serve a production build
npm run lint         # eslint
npm run type-check   # tsc --noEmit (necessary, not sufficient)
```
