# logupdate.md — running change log

Append a dated entry for every non-trivial change. Newest at the **top**.
Keep it factual: what changed, why, how it was verified, and any debt it
created. Trivial one-liners and docs-only touches don't need an entry unless
they alter behaviour described elsewhere.

Format:

```
## YYYY-MM-DD — <short title>
**Changed** · **Why** · **Verified** · **Follow-ups**

---

## YYYY-MM-DD — <next title>
```

---

## 2026-10-15 — Role-aware plans page + exhibitor category (shop) creation

**Changed** — Two fixes.

1. **Plans page no longer dead-ends exhibitors.** `app/(dashboard)/dashboard/plans/page.tsx`
   dropped the `activeRole === "exhibitor"` redirect and the full-page
   "unavailable" screen. It now always renders `PlansView`, passing the
   super-admin `professionalEnabled` flag. `components/dashboard/plans-view.tsx`
   renders **one section per ladder the viewer holds**: the professional ladder
   when the viewer holds `professional` (or holds no exhibitor role, so a bare
   client keeps the normal upgrade path), and the exhibitor ladder when they
   hold `exhibitor`. Each section marks its own current plan and targets the
   right role for checkout/downgrade (`choose(plan, role)`, `cancelPlan(role)`).
   When professional plans are toggled off, that section renders disabled with a
   note while the exhibitor section stays usable. The standalone
   `/dashboard/plans/exhibitor` page is untouched.

2. **Exhibitors can create product categories (shops).** The upload dropdown is
   fed by `company.categories`, but nothing let a seller add one post-onboarding,
   so a paid exhibitor (e.g. `14eter@gmail.com`, 5-category plan) was stuck with
   the single shop collected at signup.
   - `app/(dashboard)/dashboard/add-product/add-product-form.tsx` gained an
     inline **"Add a new category"** control next to the category field, which
     is now a **`<select>` dropdown** listing the exhibitor's registered shops
     (hint: "Your plan allows: …") rather than a free-text input. Adding a shop
     auto-selects it. The control
     checks the plan cap (`limits.categoryCap` from `getExhibitorLimitSummary`),
     saves through `saveCompany({ categories })` (which already enforces the cap
     server-side), and `router.refresh()`es so the new shop appears in the
     dropdown. At the cap it pops an upgrade toast linking to
     `/dashboard/plans/exhibitor`.
   - `app/(marketing)/company/company-profile-form.tsx` category `MultiSelect`
     now has `allowCreate` (previously fixed 6 options) and its over-cap branch
     names the next plan in the upgrade prompt.

**Why** — An exhibitor whose active role was `professional` (held both roles)
hit the disabled professional page from the dashboard "Upgrade" button; and
exhibitors had no way to open the shops their plan pays for, so uploads were
limited to the onboarding category.

**Verified** — `npm run type-check` ✅ and `npm run build` ✅. Prod data checked:
`14eter@gmail.com` has exhibitor plan `exhibitor`, `company.categories =
{"Building Materials"}` (1 of 5). Not yet exercised in a browser (local dev DB
is stale — T-011).

**Follow-ups** — Category **removal/rename** isn't exposed (products reference
the string). Consider surfacing the manager as its own tab rather than burying
it in the profile form. The product **edit drawer**
(`components/dashboard/exhibitor/product-edit-drawer.tsx`) still uses a
free-text category input — switch it to the same dropdown.

---

## 2026-10-15 — Super-admin billing repair kit + granted GBG SALES LTD the Exhibitor plan

**Changed** — Two parts.

1. **Data (live `nomarcdb` on the VPS).** GBG SALES LTD
   (`4Wfi18q0Dv8GKAxfOA6ivlXuoEipmnYH`, `gbgsalesltd@gmail.com`) had **four**
   `exhibitor / monthly / ₦205,000 / seerbit` transactions all stuck `pending`
   (2026-10-14) and `user_role.plan='free'`. Settled the newest
   (`nm_5473d026c547491873dd65b5`) → `success` + `verified_at`, and set its
   exhibitor `user_role` to `plan='exhibitor'`,
   `current_period_end = now() + 1 month 14 days` = **2026-11-29 16:13 UTC**
   (`active_role` was already `exhibitor`). Identical end-state to 14eter.
   The other three attempts were left `pending` (see Follow-ups).

2. **Code.** New super-admin repair surface in
   `components/admin/user-detail-view.tsx` (Billing History tab) backed by
   `lib/services/admin.ts`:
   - `verifyTransactionWithProvider` — re-verifies a pending reference at the
     gateway and grants on success.
   - `markTransactionPaid` — **now actually grants the plan** (calls
     `applyPurchaseForUser`); previously it only set `status='success'`.
   - `recordManualPayment` — records a payment never seen by us (transfer,
     missed webhook) and grants the plan, with unique-reference guard and an
     optional `bonusDays` comp.
   - `extendUserPlanExpiry` — **now actually moves `current_period_end`**;
     previously it wrote an audit line and changed nothing.
   - `cancelUserSubscription` — now clears the paid plan on `user_role` too,
     not just the legacy `user.plan` scalar.
   - `markTransactionFailed` — voids a stuck attempt so `reconcilePending`
     can't settle it over a hand-granted plan.
   - `getUserBillingSummary` — reads the **role row** (and trial), not the
     legacy `user.plan`; the card used to show "Free" for a paying exhibitor.
   `lib/services/billing.ts` gained the guarded remediation entry points
   (`verifyPurchaseReference`, `applyPurchaseForUser`) so manual fixes run the
   **same** `settle`/`applyPlan` as the webhook; `applyPlan` took an optional
   `bonusDays`. `lib/authz.ts` gained `isSuperAdmin()` to gate the UI.

**Why** — Users were paying and getting nothing. `markTransactionPaid` flipped
the status column without granting entitlement, and `extendUserPlanExpiry` was
a no-op — the two tools support had were both wrong. This makes a manual
"the provider took the money" fix produce exactly what a real purchase would.

**Verified** — `npm run type-check` clean; `npm run build` completed with the
full route table. New SQL statements (`+ (N::int * interval '1 day')`,
role-row downgrade) exercised against live Cockroach with no-match predicates
(0 rows, no writes). `getUserBillingSummary`'s query returns
`exhibitor / exhibitor / 2026-11-29` for GBG. GBG's grant confirmed by SELECT.

**Follow-ups** — (a) All actions are `requireSuperAdmin`; relax to
`requireAdmin` if support staff need them. (b) The 3 stray `pending` seerbit
attempts on GBG should be voided to stop `reconcilePending` re-settling them.
(c) Deployed app predates this change — needs a rebuild to expose the UI.

---

## 2026-10-15 — Applied migration 0063 to prod; gave 14eter the Exhibitor plan

**Changed** — Against live `nomarcdb` (VPS, `root@mydb.nomarcprojects.com:26257`):
1. Applied `drizzle/0063_plan_trial.sql` — added `user_role.trial_ends_at`,
   `user_role.trial_plan` and `user_role_trial_ends_idx` (all `IF NOT EXISTS`).
2. Settled an existing **pending** transaction:
   `nm_ea0b8842ed0cb7fa04d9f218` (`exhibitor / monthly / ₦205,000 / paystack`)
   → `status='success'`, `verified_at=now()`.
3. `user_role` exhibitor row for `QaYzANEr5FTVWgjlV4dlJzcqFtB0A3sI`
   (14eter@gmail.com): `plan` `key_player` → **`exhibitor`**,
   `current_period_end` = `now() + 1 month 14 days` = **2026-11-29 15:50 UTC**
   (44 days), `pending_plan`/`trial_*` = NULL.

**Why** — (a) The account must be an active Exhibitor for 1 month + 14 days with
a payment recorded as if it had gone through the web flow; the cleanest match to
`settle()` was to flip the already web-initiated pending transaction rather than
fabricate a second reference. (b) Production was **missing migration 0063** while
the deployed build (image built 2026-10-14 17:25, after the `3068e56` trial
commit) selects `trial_ends_at`/`trial_plan` — so `getActiveTrial()` would throw
and break exhibitor read paths. Applying it was a prerequisite.

**Verified** — Replayed the app's own SQL against prod:
`select trial_ends_at, trial_plan from user_role where … role='exhibitor'`
runs (was `ERROR: column trial_ends_at does not exist` before) and returns NULL
trial; `exhibitorPlan()` yields `plan=exhibitor`, `current_period_end=2026-11-29`
(not expired); `getMyTransactions()` shows the new
`exhibitor / monthly / 205000 / paystack / success` row.

**Follow-ups** —
- **Local dev cannot connect**: `.env`'s `DATABASE_URL` points at a stale
  Cockroach Cloud cluster (`nomarc-production-32243…cloud`) whose password is
  rejected (`password authentication failed for user nomarc`) — that alone makes
  `npm run dev` 500 every data-backed page. The real DB is a self-hosted
  Cockroach at `mydb.nomarcprojects.com:26257` (`sslmode=disable`), whose port is
  firewalled from outside the VPS, so local dev can't reach it without a tunnel.
  See `Memory.md` T-011.
- Migrations are applied by hand and there is no applied-migrations ledger, so
  drift like 0063 can recur (existing T-003-style operational risk).

---

## 2026-10-15 — Agent governance doc set added to repo root

**Changed** — Added `.cursorrules`, `PRD.md`, `Agent.md`, `Memory.md`,
`ARCHITECTURE.md`, `API.md`, `RULES.md`, `ENV.md`, `TESTING.md`,
`design_style.md`, `logupdate.md`. No code touched.

**Why** — Agents were working without a shared spec or constraint set, and the
README's architecture stats had drifted from the code. This set is now the
alignment reference: `Agent.md` for behaviour, `PRD.md` for what we're building,
`ARCHITECTURE.md`/`API.md`/`ENV.md` for structure, `RULES.md`/`design_style.md`
for quality, `Memory.md` for decisions and debt, this file for history.

**Verified** — README numbers re-counted from the tree and corrected in
`ARCHITECTURE.md` (90 tables, 76 service modules, 66 migrations, 299 component
files, **18** API handlers — README says 87/66/47/15). `npm run type-check` and
`npm run build` unchanged (docs only).

**Follow-ups** — README stats still stale (T-005). `.env.example` still
incomplete (T-010). Doc set landed on `VPS_Nomarc` (`2e29654`) and was
cherry-picked onto `main` (`0cdbe1e`) — docs only, no app code crossed (D-010).

**Corrections found while writing these** — `.cursorrules` claimed
`scripts/dev-reset` existed (it doesn't) and that `.env.vps.local` was
gitignored (it isn't); `Agent.md` claimed an `umami` container on the VPS
(verified live: no such container — Umami is a `main`-branch commit); service
count was 72, actually 76 files. All fixed in this commit.

---

## 2026-10-14 — Production upload outage fixed (R2_ENDPOINT unreachable)

**Changed** — `R2_ENDPOINT` in production went `http://host.docker.internal:9000`
→ `https://media.nomarcprojects.com`.

**Why** — The presigned PUT URL embeds the endpoint, so the **browser** must be
able to resolve it. `host.docker.internal` only resolves inside the app
container; every client upload failed with a network error while `tsc` and the
build stayed green. `media.nomarcprojects.com` is routed by Traefik to MinIO
`:9000` (S3 API); `:9001` is the console and is localhost-only, so it is not
the right target.

**Applied in two places** (they diverge):
1. Live Swarm service — `docker service update --env-add` (immediate).
2. Dokploy's encrypted `application.env` in Postgres (persisted) — decrypted
   and re-encrypted with AES-256-GCM, key derived via HMAC-SHA256 of
   `BETTER_AUTH_SECRET` with info string `dokploy:db-encryption:v1`.

**Verified** — End-to-end round trip from outside the host: presigned PUT →
**200**, public GET → **200**, returned bytes identical to uploaded bytes.
Test objects deleted from both buckets afterwards.

**Follow-ups** —
- T-006: `docker service update` env edits are reverted on the next deploy;
  always reconcile with the Dokploy DB.
- T-004: no `MINIO_API_CORS_ALLOW_ORIGIN`; MinIO reflects any origin. Pin it.
- T-003: `AUTH_URL` / `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` /
  `NEXT_PUBLIC_APP_URL` still `http://localhost:3000` in production.

---

## 2026-10-13 — Exhibitor plan enforcement & checkout decoupling

**Changed** — Category/listing caps (SME 1 / Exhibitor 5 / Key Player 10
categories; 10 listings per category on paid tiers), `upgradeHint()`,
`assertCategoryCapacity()`, `assertCanPublish`, enforcement inside
`createProduct` / `updateProduct` / `setProductStatus`, category-cap error in
`saveCompany`, `PlanLimitBanner`, upgrade toasts/banners. CSV sample category
corrected. `/api/upload/presign` rewritten to derive the endpoint from
`R2_ENDPOINT` + `forcePathStyle` instead of a hardcoded Cloudflare host.

**Why** — Exhibitors could publish past their paid tier, and the presign route
assumed Cloudflare R2 so it broke against self-hosted MinIO.

**Verified** — `npm run type-check` + `npm run build`.

**Follow-ups** — none open.

---

## 2026-10-12 — Exhibitor checkout decoupled from global payment-plans toggle

**Changed** — `startCheckout()` now goes direct to the gateway for exhibitor
tiers; new `/dashboard/plans/exhibitor`; `/dashboard/plans` redirects
exhibitors there; billing view shows exhibitor tiers; `EXHIBITOR_PRICING`
synchronised.

**Why** — Exhibitor purchases were gated behind an unrelated global
`payment-plans` feature flag, so some exhibitors could not buy at all.

**Verified** — `npm run type-check` + `npm run build`.

---

## 2026-10-11 — Dashboard IA: Products route → Exhibition Hub

**Changed** — `/dashboard/products` removed from the sidebar and now redirects
to `/exhibition-hub`. Sidebar, mobile nav and the product-tour overlay updated
to match.

**Why** — Two competing entry points for the same screen; the Hub is the
intended home.

**Verified** — `npm run type-check` + `npm run build`.

---

## 2026-10-10 — Marketing header on the dashboard + news ticker

**Changed** — `MarketingNavbar` rendered in the dashboard layout; the news
ticker visible under `/dashboard/*`. Nav: Home, Tools, Exhibition Hub, News
Feed, About, Contact.

**Why** — The dashboard was a dead end for signed-in users.

**Follow-ups** — none open.

---

## 2026-10-09 — Institutional directory expanded to 869 entries

**Changed** — `lib/data/nigeria-institutions.ts`: **869** total (434
Universities, 310 Polytechnics, 305 Colleges of Education).

**Why** — The previous list was far too short to be useful for verification
and excluded most institutions.

---

## 2026-10-08 — Homepage UI polish

**Changed** — Logo marquee switched from `next/image` to plain `<img>` (Next
was processing local brand SVGs for no benefit); Key Player logos enlarged; ad
board repositioned; "Nomarc Data Gig" renamed to "Nomarc Projects".

**Why** — Perf and consistency: local vector assets don't need image
optimisation.

---

## 2026-10-07 — Deployment baseline: Dockerfile, .dockerignore, CI

**Changed** — `Dockerfile` (node:22-bookworm-slim, non-root `nextjs`,
`UPLOAD_DIR=/app/uploads`, build args, `NODE_MAX_OLD_SPACE_SIZE`, Next
`output: "standalone"`), `.dockerignore`, `.github/workflows/ci.yml`
(type-check + build).

**Why** — The previous image ran as root, had no upload volume and no CI gate.

---

## Unresolved / carried debt

Cross-reference `Memory.md` (T-001…). The ones most likely to bite next:

- **T-003** production origins still `localhost:3000`.
- **T-006** ephemeral `docker service update` env edits.
- **T-010** `.env.example` incomplete (this repo's `ENV.md` is the full list).
- **T-005** README stats stale.
- **T-001** `npm run lint` broken — no ESLint config.

*(Resolved 2026-10-15: `main` was force-reset to equal `VPS_Nomarc` (`2dbf6fe`)
at the operator's request — see `Memory.md` D-010. Keep the two in lockstep.)*
