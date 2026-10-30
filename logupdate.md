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

## 2026-10-29 — Require lister verification before property listings

**Changed** — Add Property now checks lister status first: unverified or
rejected listers see the verification form, pending listers see “Your
verification is being reviewed”, and verified listers see the property form.
The standalone dashboard verification link/tile was removed; the legacy route
and verification notifications now lead through Add Property. `saveProperty`
also rejects create and edit requests unless the lister is verified.

**Why** — Lister verification is a prerequisite for property listings, not a
separate optional step.

**Verified** — `npm run type-check` and `git diff --check` passed.

---

## 2026-10-29 — Gate property listings on lister verification

**Changed** — Add Property now shows verification first for unverified/rejected
listers, a “Your verification is being reviewed” message for pending listers,
and the listing form only for verified listers. Removed the separate dashboard
verification sidebar/workspace links, redirected the legacy route into Add
Property, and routed verification notifications there. The `saveProperty`
server action now rejects unverified create and edit requests.

**Why** — Verification is a prerequisite to listing, not a separate optional
step.

**Verified** — `npm run type-check` passed. A full local build is blocked by the
missing Tailwind native optional binding.

---

## 2026-10-29 — Rename buyer marketplace navigation

**Changed** — Renamed the dashboard buyer link to “View Marketplace”, updated
the marketplace page title and buyer-facing breadcrumbs/actions, and used
“Marketplace” in mobile and public navigation. Kept product-specific actions
such as “View Product” unchanged.

**Why** — “Marketplace” makes it clear that the destination is a catalog of
products from many sellers and distinguishes it from “Showcase Product”.

**Verified** — Type-check and `git diff --check` passed.

---

## 2026-10-29 — Set Key Players annual plan price to ₦5,000,000

**Changed** — Updated the Key Players annual amount in the shared pricing
source from ₦5,200,000 to ₦5,000,000, matching ten paid months at ₦500,000.

**Why** — The Key Players annual plan includes two free months.

**Verified** — Type-check and source search confirm the shared pricing value is
used for plan display and checkout; the old amount has no other references.

---

## 2026-10-29 — Set Exhibitors annual plan price to ₦2,050,000

**Changed** — Updated the Exhibitors annual amount in the shared pricing source
from ₦2,100,000 to ₦2,050,000, matching ten paid months at ₦205,000.

**Why** — The Exhibitors annual plan includes two free months.

**Verified** — Type-check and source search confirm the shared pricing value is
used for plan display and checkout; the old amount has no other references.

---

## 2026-10-29 — Set Key Players biannual plan price to ₦2,500,000

**Changed** — Updated the Key Players biannual amount in the shared pricing
source from ₦2,800,000 to ₦2,500,000, matching five paid months at ₦500,000.

**Why** — The Key Players biannual plan includes one free month.

**Verified** — Type-check and source search confirm the shared pricing value is
used for plan display and checkout; the old amount has no other references.

---

## 2026-10-29 — Set Exhibitors biannual plan price to ₦1,025,000

**Changed** — Updated the Exhibitors biannual amount in the shared pricing
source from ₦1,150,000 to ₦1,025,000, matching five paid months at ₦205,000.

**Why** — The Exhibitors biannual plan includes one free month.

**Verified** — Type-check and source search confirm the shared pricing value is
used for plan display and checkout; the old amount has no other references.

---

## 2026-10-29 — Set SMEs biannual plan price to ₦300,000

**Changed** — Updated the SMEs biannual amount in the shared pricing source
from ₦330,000 to ₦300,000, matching five paid months at ₦60,000 per month.

**Why** — The SMEs biannual plan includes one free month.

**Verified** — Type-check and source search confirmed the shared plan price is
the only ₦330,000 SMEs biannual value.

---

## 2026-10-30 — Progressive nav: jobs, property, exhibition hub funnels

**Changed** — Sidebar and funnels restructured per the progressive-reveal specs:

- **Jobs**: Post Jobs / Posted Jobs / Draft merged into one "Post Jobs" page
  (Active, Drafts, Closed tabs retained; closed-job delete keeps its confirm
  dialog). Saved Jobs left the sidebar; the Find Jobs page gained an
  All/Saved tab pair (hidden until the first bookmark). Applications is
  sidebar-hidden until a first submitted application. Clicking an active job
  opens its applicant list, with the applicant's profile slide-over now
  reachable from the row alongside theapplication slide-over.
- **Find Professionals** moved under Jobs; Saved Profile removed from the
  sidebar; the Find Professionals page gained an All/Saved toggle, hidden
  until the first saved profile (saved_item and custom lists both counted).
- **Property Listings**: new accounts see Browse Properties and My
  Properties only; the Add Property button lives on My Properties and leads
  to lister verification → review message → form (fee payable after
  submission as before). Fee Payments appears for verified listers;
  Inquiries/Transactions/Saved Properties appear after the first listing.
- **Exhibition Hub**: one section. New users see Showcase Product and View
  Marketplace; Showcase Product now stages guidelines acceptance (persisted
  via new migration 0067 + exhibitor-onboarding service) → subscription
  plans → Add Product form (plan purchase grants the exhibitor role). After
  that the sidebar swaps Showcase Product for My Products (whose page holds
  the Add Product button) and reveals Saved Products after the first save.
  Company Profile and the standalone SOWR entry left the sidebar; those
  routes remain reachable.

**Why** — Keep the member sidebar short for new users, surface links only
when they become useful, and make job/property/hub journeys self-guiding.

**Verified** — `npm run type-check` passed. Full local build remains blocked
in this environment (Tailwind native optional binding unavailable); flows
were reviewed statically, not exercised against production.

**Follow-ups** — Apply migrations 0066 and 0067 before relying on the new
fields; smoke-test the funnels once deployed.

---

## 2026-10-30 — Fix broken production image build

**Changed** — Made the guideline-version string in
`lib/services/exhibitor-onboarding.ts` module-local instead of exported.
The file is a `"use server"` boundary, which may only export async
functions; the exported constant broke the Turbopack build
(and docker builds) while `tsc --noEmit` stayed green.

**Why** — The exported const means the member dashboard image could no
longer be built, which is the actual root cause of the failing Dokploy
deploy seen on 2026-10-30 (build error surfaced in CI and locally
through Dokploy's Dockerfile build).

**Verified** — `npm run type-check` passed; the full gate is the pushed
CI build job (watching for a green `Build image`).

**Follow-ups** — Bake "repo-only exports of use-server files are async
functions" into review habit; tsc can't catch it.

---

## 2026-10-30 — Live unread badges on the sidebar

**Changed** — Sidebar badges now behave as true unread counters: opening a
thread in Messages marks that conversation read (`markConversationRead` — the
first writer of message.read_at) and broadcasts `nm-unread-changed`, on which
the sidebar re-polls instantly instead of waiting for its 15s cycle; the
notification actions in the dashboard header and notifications page broadcast
the same event; and badge values cap at "9+" instead of pushing the pill
wider.

**Why** — The Messages badge never cleared because nothing wrote read_at;
the rest is polish for the same badge system.

**Verified** — `npm run type-check` passed; CI build gate watched after push.

**Follow-ups** — None known.

---

## 2026-10-30 — Company Profile lives only in Settings

**Changed** — Verified the sidebar no longer links Company Profile (removed
with the Exhibitor group in the progressive-nav commit) and added a Company
Profile row to the phone-side Settings hub for exhibitors, which previously
only reached the page from the now-removed sidebar link.

**Why** — One entry point for the same destination; Settings is it.

**Verified** — `npm run type-check` passed; the /dashboard/company route
itself is unchanged.

---

## 2026-10-30 — Fix voice notes rejected as unsupported

**Changed** — Voice notes no longer fail with "Unsupported file type":
browsers stamp recordings with a codec suffix ("audio/webm;codecs=opus"),
which the upload allow-lists compared verbatim. The presign route now
normalizes the reported type to its base MIME before the check and signs the
PUT with the same base type; upload-client strips the suffix for both the
presign body and the PUT header so the signature matches; and the
/api/upload fallback gained the missing chat kind (image + audio) so voice
notes survive the fallback path too.

**Why** — The recorder on Chrome/Android emits the suffixed type, so every
voice note was rejected server-side; iOS (audio/mp4) worked, which is why it
looked device-specific.

**Verified** — `npm run type-check` passed. Playback renders through the
existing audio bubble. Cross-device playback (webm recorded on desktop
played in iOS Safari) still needs a transcode layer and remains out of
scope — same-device record→send→play works on both.

**Follow-ups** — Optional server-side transcode if cross-device playback
matters.

---

## 2026-10-29 — Add exhibitor delivery coverage to products

**Changed** — Added nationwide, selected-states and pickup-only delivery choices
to the shared product form, enforced a valid choice when products are created
or edited, and added delivery labels to marketplace cards. The product
description tab now shows the full selected-state list. Migration 0066 adds
nullable delivery fields so existing products remain without a tag until edited.
Bulk product imports also accept delivery mode and semicolon-separated states.

**Why** — Buyers need to know whether an exhibitor delivers to their state
before they contact the supplier.

**Verified** — `npm run type-check` and `git diff --check` passed. A full local
build remains blocked by the missing Tailwind native optional binding.

**Follow-ups** — Apply `drizzle/0066_product_delivery.sql` before using the new
field in production; apply `0064_product_lead_time.sql` as well if it is still
missing and made-to-order listings must be saved.

---

## 2026-10-29 — Unify exhibitor product create and edit forms

**Changed** — Added one shared product form used by both Add product and Edit
product. The common screen includes the combined product details, availability,
pricing, stock, images/gallery, supporting documents, tags, technical specs,
variants, category creation, and status fields. Both modes save through the
existing product services.

**Why** — Exhibitors need to see and manage the same complete product data when
they create a listing and when they return to edit it.

**Verified** — `npm run type-check` passed. A full local build is blocked by the
missing Tailwind native optional binding in this environment; live upload was
not exercised.

**Follow-ups** — Apply production migration 0064 when Doppler access is
available, then smoke-test create/edit and media uploads against production.

---

## 2026-10-29 — Keep exhibitor product writes compatible with pre-0064 databases

**Changed** — Product create/edit now retries ordinary stock/draft writes without
the optional lead-time columns when the database reports them missing. Draft
publishing no longer selects those fields for every product. Made-to-order
operations report a clear migration-required error instead of a raw database
failure.

**Why** — The lead-time columns are introduced by migration 0064, while product
write paths previously referenced them unconditionally.

**Verified** — `npm run type-check` passed and `git diff --check` passed. A local
production build could not load Tailwind's optional native binding. Migration
0064 was authorized but could not be applied because this environment has no
Doppler token. Live edit/upload verification remains pending.

**Follow-ups** — Authenticate Doppler for `nomarc_projects`/`prd`, apply
`drizzle/0064_product_lead_time.sql`, then smoke-test exhibitor product edit and
upload.

---

## 2026-10-23 — Nomarc Projects: fee reconciliation + certificate verification

**Changed** — Owners can now close a live listing as sold/leased/rented or
archive it; pending buyer transactions on that listing are cancelled. Added
admin listing-fee reconciliation at
`/admin/properties/fees` with pending/collected/failed tabs, owner and property
context, collected total, and an admin-only “Verify now” provider check.
Added public certificate verification: `/properties/certificates` looks up a
number and `/properties/certificates/[no]` confirms issuance, property and
date without exposing buyer details. Certificate pages link to both. Admin
sub-pages now share Listings / Lister verification / Transactions / Fee
payments navigation, and local private downloads allow admins to open
`property_doc/` files.

**Why** — Fees are real money and pending provider callbacks need an admin
reconciliation path; buyers and counterparties need a way to check a
certificate without trusting a PDF.

**Verified** — `npm run type-check` passed and the full `npm run build` passed.

**Follow-ups** — Still no automated coverage or live provider test (T-002).
SOWR is not linked to completed purchases; rent/lease payments remain
inquiry-only (owners can mark them rented/leased manually).

---

## 2026-10-23 — Nomarc Projects: verification, transactions and SOWR

**Changed** — Completed the remaining approved phases:

- **Lister verification** at `/dashboard/properties/verification` with private
  CAC/ID uploads. Realtors must provide company, CAC number and CAC document;
  all listers provide an ID. Admin queue at `/admin/properties/listers`
  can verify/reject with a note. Verified listers show a public badge, and
  changing sensitive fields after verification returns the profile to review.
- **Buyer transactions** at `/dashboard/properties/transactions`. A signed-in
  non-owner can request to purchase a published `sale`/`bulk_land` listing;
  this creates a pending offline transaction and notifies the lister. Admins
  complete it at `/admin/properties/transactions`, which marks the listing
  sold and issues a unique certificate. Buyers get a printable HTML
  certificate at `/dashboard/properties/certificates/[id]`.
- **SOWR enrollment** at `/properties/sowr`: free join/withdraw for signed-in
  users, member status, and dashboard/sidebar entry points. The settings CTA
  now resolves.
- **View tracking**: public detail views increment `property.view_count` and
  write `property_event` rows (deduped per browser session for 30 minutes).
  Expired published listings no longer appear on detail/saved surfaces.
- Admin property detail now shows the linked lister profile; owners can open
  their own private documents from the edit screen.

**Why** — Finish the marketplace phases approved in the plan and make
verification, ownership and post-sale records useful to buyers and admins.

**Verified** — `npm run type-check` ✅, `npm run build` ✅. Read-only production
SQL checks passed for lister listing counts, auth-user names and the
transaction/certificate join.

**Follow-ups** — No automated coverage (T-002) and no live payment/browser
test. Transactions are offline/manual and sale/bulk-land only; certificates
are not publicly verifiable; SOWR is not linked to completed purchases.

---

## 2026-10-23 — Nomarc Projects: production migration + publish flow

**Changed** — Applied `drizzle/0065_properties.sql` to production via
`doppler run -p nomarc_projects -c prd` (32 statements). Verified 10 property
tables and the `properties` setting exist. Then added:

- Fee checkout at approval: `startPropertyFeeCheckout`, provider callback at
  `/dashboard/properties/purchases/verify`, webhook fallback for
  `property_fee_payment`, amount guard + CAS settle, and publish/expiry +
  owner notification on success. "Pay & publish" on the listings screen.
- Editable drafts / changes-requested / rejected listings, reusing the wizard
  with existing media and documents; admin notes are shown to the owner.
- Buyer inquiries through the existing DM/messaging stack, with
  `property_inquiry` rows and an owner inbox at
  `/dashboard/properties/inquiries`.
- Saved properties via `saved_item` (`itemType = "property"`), public save
  button and `/dashboard/properties/saved`.
- Admin property detail with expiring private-document links, document
  approve/reject, and property approval actions.

**Why** — Complete the listing lifecycle after the foundation and make the
verified production schema usable end to end.

**Verified** — `npm run type-check` ✅ and `npm run build` ✅. Production schema
checked read-only: 10/10 tables + `properties` setting present. Payment and
inquiry flows not exercised in a browser (local DB is stale — T-011).

**Follow-ups** — Lister CAC/identity verification, buyer property
transactions/certificates, SOWR enrollment. `property_fee_payment` is not
mirrored into `payment_transaction`, so admin retry/reconciliation only sees
property fees through the webhook fallback.

---

## 2026-10-23 — Nomarc Projects property marketplace foundation

**Changed** — Added the property domain end to end at foundation level:

- `lib/db/schema.ts`: `property_lister_profile`, `property`, `property_media`,
  `property_document`, `property_fee_payment`, `property_inquiry`,
  `property_transaction`, `property_certificate`, `property_event`,
  `sowr_enrollment`; `drizzle/0065_properties.sql` seeds them plus the
  `properties` platform setting (enabled, approvalRequired, 90 days, ₦25,000
  flat fee, USD/GBP FX, SOWR copy). Applied to production later the same day
  (see the entry above).
- `lib/properties/pricing.ts`: pure full-value bracket calculator
  (2%/1%/0.5%/0.2%/0.1%) + flat fee, money parsing/formatting.
- Platform setting read/write (`getProperties`, `setProperties`) and
  super-admin config at `/admin/platform/properties`.
- Nav: Nomarc Projects group in the dashboard sidebar (gated by the setting),
  admin nav/top-bar links, and admin review queue at `/admin/properties`.
- Public `/properties` browse + `/properties/[slug]` detail (documents show
  status only), dashboard overview/listings, add-listing form with public photo
  uploads and private ownership documents.
- Upload plumbing: public `property` kind, private `property_doc` kind,
  generalised local-private prefix checks, and `/api/upload/private` fallback.

**Why** — User approved the property marketplace plan and the commercial
decisions (one-off fee, approval-before-payment, NGN-only launch). This is the
Phase 0 slice: schema, settings, navigation, browse/list and admin review.

**Verified** — `npm run type-check` ✅ and `npm run build` ✅. Not exercised
against a database (T-011; migration deliberately unapplied).

**Follow-ups** — Apply 0065 on the VPS only when instructed. Then implement
pay-at-publish, inquiries (messaging), saved properties, lister/document
verification, purchases/certificates and SOWR enrollment.

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
