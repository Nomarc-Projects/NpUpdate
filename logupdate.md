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

*(Resolved 2026-10-15: `main` receives docs by cherry-pick only — see
`Memory.md` D-010. A full `VPS_Nomarc` → `main` merge needs operator approval
and a `Dockerfile` conflict resolution.)*
