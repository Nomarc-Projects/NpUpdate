# PRD — Nomarc Projects

**Product:** Nomarc Projects — a Nigerian professional-services and exhibition
platform connecting verified professionals, exhibitors/brands, employers and
buyers in one marketplace.

**Status:** live (self-hosted VPS + Dokploy). Active feature development.
**Source of truth:** this document describes intent; the code decides behaviour.
Where the two disagree, the code wins and this file must be updated.

---

## 1. Product summary

Nomarc has two halves that share one account system:

1. **Talent & services** — professionals publish a profile, portfolio and
   services; employers post jobs; buyers request quotes and hire.
2. **Exhibition hub** — brands (exhibitors) publish products organised by
   category under a paid plan, with category/upload quotas enforced.

Everything sits on top of a shared feed, messaging layer, notification system
and payment engine.

---

## 2. Personas

| Persona | Role | Primary jobs |
| --- | --- | --- |
| **Professional** | `professional` | Build a profile, showcase projects, get found, get hired |
| **Exhibitor / brand** | `exhibitor` | Subscribe to a plan, list products per category, sell |
| **Employer** | `employer` | Post jobs, review applications, manage hiring |
| **Buyer / visitor** | `buyer` | Browse catalogue, request quotes, buy, compare |
| **Admin** | admin role | Moderate content, manage users/plans/settings, view reports |

A single user account can hold more than one role (verified by phone OTP per
role). Team/company members use `owner | admin | member | viewer` roles
relative to the company.

---

## 3. Capability map

### 3.1 Professional identity
- Profile with photo, bio, location, contact, work experience, education,
  skills, certifications, professional registrations, references.
- Portfolio **projects** with media, links and role attribution.
- Public profile pages, reviews/ratings, recommendation flow, verification
  requests (KYC documents).

### 3.2 Talent marketplace
- **Jobs**: job posts, applications, invitations, employer profiles.
- **Services**: service listings with tiers; buyers send quote requests,
  providers answer with quote proposals; conversation thread per request.
- Saved items, saved searches, follow lists.

### 3.3 Exhibition hub (the monetised core)
- Products with **variants**, galleries (images + short video), organised by
  **company categories**.
- Plan tiers: **SME**, **Exhibitor**, **Key Player** — each with an interval
  (monthly / quarterly / yearly) and a **category allowance**:
  - SME → 1 category
  - Exhibitor → 5 categories
  - Key Player → 10 categories
- **Per-category listing cap is 10** for paid tiers; total cap = categories ×
  10. Drafts do not count toward quota. A company may only list in a category
  it belongs to.
- Plan state machine: active → lapse → drafts; a **14-day trial** applies to
  any plan (see `lib/services/exhibitor-trial.ts`).
- Quota breaches are surfaced as upgrade prompts, not silent failures.

### 3.4 Commerce
- Catalogue entries, cart, orders/order items, buyer addresses, customer
  notes, invoices, sales orders, vendor payouts (`vendor_wallet`,
  `vendor_payment_account`, `ledger_entry`).
- Promotions with impression/click tracking.

### 3.5 Project & work management
- `pm_project`, columns, tasks, assignees, tags, milestones, comments,
  attachments, activity log; Kanban, timeline and Gantt views; team invites.

### 3.6 Feed & engagement
- News feed (`blog_post`, taxonomy), ticker items, announcements, ads,
  events + RSVPs, notifications and per-channel preferences.

### 3.7 Messaging
- Conversations, participants, messages; real-time via Socket.

### 3.8 Email campaigns
- Audience segments, campaigns, broadcast logs, delivery queue drained by
  `/api/email/drain`, open/click tracking, one-click unsubscribe.

### 3.9 Helm (AI)
- Separate Python service on a VM; embeds/retrieves **private documents**
  (contracts, BOQs, drawings, spec sheets) that never leave that VM. Exposes
  conversations, documents, proposals, usage and quotas. See
  `ARCHITECTURE.md` → Helm boundary.

### 3.10 Admin
- 25+ sections: users, roles, plans, platform settings, content moderation,
  reports, CRM leads, verification queue.

---

## 4. Business goals

1. **Convert exhibitors to paid plans** — quotas + upgrade messaging make
   limits legible; checkout must never be blocked by an unrelated global
   feature flag.
2. **Grow the professional directory** — complete profiles rank and get found.
3. **Keep private documents private** — Helm documents are never public.
4. **Take real payments** — Paystack / Flutterwave / SeerBit with correct
   webhook settlement; demo mode only when no provider is configured.
5. **Operate one deployable artifact** — Docker image on a VPS via Dokploy.

---

## 5. Success metrics (to instrument)

| Area | Metric |
| --- | --- |
| Activation | Profile completion rate; jobs applied |
| Monetisation | Trial → paid conversion; plan upgrades triggered by quota prompts |
| Retention | 7/30-day active return; feed engagement |
| Reliability | Failed uploads, webhook settlement lag, build failures |

---

## 6. Non-goals

- No GraphQL/REST "public API tier" today — server components call server
  actions directly.
- No mobile native app; responsive web only.
- Helm never runs on Vercel/the Next server.

---

## 7. Open questions / known debt

See `Memory.md` for the live debt register. High-severity items:

- Production auth/site URLs currently set to `http://localhost:3000` in the
  deployed env — must be verified.
- `npm run lint` is broken (no ESLint config file) despite being in
  `package.json`.
- No automated test suite exists (`TESTING.md`).
- MinIO CORS reflects any origin until `MINIO_API_CORS_ALLOW_ORIGIN` is set.
