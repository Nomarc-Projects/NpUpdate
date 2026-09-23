/**
 * Nomarc access model — the single source of truth for who can do what.
 *
 * Two independent axes combine into a viewer's entitlements:
 *   1. Auth/role state: visitor → client (signed-in, no role) → exhibitor /
 *      professional (signed-in WITH a role) → admin. There are only two account
 *      types — professional (general user, who also buys & hires) and exhibitor.
 *   2. Plan (professional-centric): free → plus → pro → premium.
 *
 * Exhibitors are sellers on their own commerce track (products, analytics, ads)
 * — they are NOT gated by the professional plan matrix. Plan gates
 * (plus/pro/premium) apply to professionals.
 *
 * A capability evaluates to one of three states, mirroring the design legend:
 *   - "granted": fully usable.
 *   - "locked":  visible but not usable → show CTA + an upgrade/sign-in prompt.
 *   - "hidden":  not shown at all.
 */

/**
 * Two plan ladders share the same storage columns (`user.plan`,
 * `user_role.plan`, `payment_transaction.plan`). "free" is the common floor;
 * every other slug belongs to exactly one ladder, so a slug alone identifies
 * which ladder a row is on — no extra discriminator column is needed.
 */
export type ProfessionalPlan = "free" | "plus" | "pro" | "premium";
export type ExhibitorPlan = "free" | "sme" | "exhibitor" | "key_player";
export type Plan = ProfessionalPlan | ExhibitorPlan;
export type Role = "professional" | "exhibitor" | "employer" | "admin" | "super_admin" | "client";

const EXHIBITOR_PLANS = ["sme", "exhibitor", "key_player"] as const;
/** True for the paid exhibitor tiers — "free" is shared and reports false. */
export const isExhibitorPlan = (p?: string | null): p is Exclude<ExhibitorPlan, "free"> =>
  (EXHIBITOR_PLANS as readonly string[]).includes(p ?? "");

/**
 * Coerce whatever is stored on an exhibitor's role row to an exhibitor slug.
 * Rows predating this ladder can hold a professional slug (the shared
 * /dashboard/plans path used to sell those to exhibitors); those grant no
 * exhibitor entitlements, so they fall back to "free" rather than throwing.
 */
export const asExhibitorPlan = (p?: string | null): ExhibitorPlan => (isExhibitorPlan(p) ? p : "free");
/** Roles a user can accumulate via intent + onboarding (admin/super_admin are not stackable). */
export type StackableRole = "professional" | "exhibitor" | "employer";

/**
 * `heldRoles`/`plans` are the multi-role model: which stackable roles (if
 * any) a user has unlocked, each with its own plan. `activeRole` is which
 * one the dashboard is currently showing (defaults to the legacy `role`
 * scalar until the Phase 3 role switcher lands). `role`/`plan` are kept as
 * compatibility aliases (= activeRole / plans[activeRole]) for the many
 * call sites not yet migrated to the held-roles shape — don't hand-set them.
 */
export type Viewer = {
  signedIn: boolean;
  role: Role;
  plan: Plan;
  heldRoles: Set<StackableRole>;
  activeRole: Role;
  plans: Partial<Record<StackableRole, Plan>>;
};

/** Rank is only ever compared within one ladder — see the `plan` case in `evaluate`. */
export const PLAN_RANK: Record<Plan, number> = { free: 0, plus: 1, pro: 2, premium: 3, sme: 1, exhibitor: 2, key_player: 3 };
export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free", plus: "Plus", pro: "Pro", premium: "Premium",
  sme: "SMEs", exhibitor: "Exhibitors", key_player: "Key players",
};

/** Next upgrade step for a given plan/role. Returns null if already on the highest tier. */
export function getNextPlan(plan: Plan, role: Role): Plan | null {
  if (role === "professional" || role === "employer" || role === "client") {
    const ladder: ProfessionalPlan[] = ["free", "plus", "pro", "premium"];
    const idx = ladder.indexOf(plan as ProfessionalPlan);
    return idx >= 0 && idx < ladder.length - 1 ? ladder[idx + 1] : null;
  }
  if (role === "exhibitor") {
    const ladder: ExhibitorPlan[] = ["free", "sme", "exhibitor", "key_player"];
    const idx = ladder.indexOf(plan as ExhibitorPlan);
    return idx >= 0 && idx < ladder.length - 1 ? ladder[idx + 1] : null;
  }
  return null;
}

/** Requirement to unlock a capability. */
type Requirement =
  | { kind: "signin" }                 // must be signed in
  | { kind: "role" }                   // must have a real role (not a bare client)
  | { kind: "professional" }           // must be a professional
  | { kind: "exhibitor" }              // must be an exhibitor
  | { kind: "employer" }               // must HOLD the employer role (held-based)
  | { kind: "plan"; plan: Plan };      // professional must be on >= plan

export type Capability =
  // public / auth-state gated
  | "findJobHire" | "openNewsFeed" | "directoryNames" | "directoryFull"
  | "industryFeed" | "industryEvents"
  // dashboard core
  | "jobBoard" | "exhibitionHubFull" | "aiAssistant"
  // professional plan-gated (deferred features — gated now, built later)
  | "projectManagement" | "practiceTemplates" | "aiConsultant" | "monthlyReport"
  | "verifiedProfessionals" | "competitions"
  | "digitalSeal" | "buildingPermit" | "bimTools"
  // exhibitor commerce track
  | "createProducts" | "commerceAnalytics" | "productAds" | "exhibitorDashboard"
  // employer hiring track (held-based — surfaces inside the professional shell)
  | "hireTalent" | "employerDashboard";

const RULES: Record<Capability, Requirement> = {
  findJobHire: { kind: "signin" },
  openNewsFeed: { kind: "signin" },
  directoryNames: { kind: "signin" },
  directoryFull: { kind: "role" },
  // Phase 1 MVP surfaces — free for every signed-in member per the PRD's
  // "Business Model: Free" for the workforce & opportunities phase.
  industryFeed: { kind: "signin" },
  industryEvents: { kind: "signin" },
  // The professional track proper — browsing the job board, applying, listing
  // services. This was `{ kind: "role" }`, which ANY role satisfies, so an
  // employer- or exhibitor-only account cleared every gate that asked for it
  // and reached /dashboard/jobs with working Apply buttons. Holding the
  // professional role is the actual requirement; `professional` is held-based,
  // so a user who holds both keeps the board while active as an employer.
  jobBoard: { kind: "professional" },
  exhibitionHubFull: { kind: "role" },
  aiAssistant: { kind: "signin" },

  projectManagement: { kind: "plan", plan: "plus" },
  practiceTemplates: { kind: "plan", plan: "plus" },
  aiConsultant: { kind: "plan", plan: "plus" },
  monthlyReport: { kind: "plan", plan: "plus" },
  verifiedProfessionals: { kind: "plan", plan: "pro" },
  competitions: { kind: "plan", plan: "pro" },
  digitalSeal: { kind: "plan", plan: "premium" },
  buildingPermit: { kind: "plan", plan: "premium" },
  bimTools: { kind: "plan", plan: "premium" },

  createProducts: { kind: "exhibitor" },
  commerceAnalytics: { kind: "exhibitor" },
  productAds: { kind: "exhibitor" },
  exhibitorDashboard: { kind: "exhibitor" },

  hireTalent: { kind: "employer" },
  employerDashboard: { kind: "employer" },
};

export type AccessState = "granted" | "locked" | "hidden";
export type Access = { state: AccessState; requires?: Requirement };

export function evaluate(viewer: Viewer, cap: Capability): Access {
  const req = RULES[cap];
  if (viewer.role === "admin" || viewer.role === "super_admin") return { state: "granted" };

  switch (req.kind) {
    case "signin":
      return viewer.signedIn ? { state: "granted" } : { state: "locked", requires: req };
    case "role":
      if (!viewer.signedIn) return { state: "hidden" };
      return viewer.role === "client" ? { state: "locked", requires: req } : { state: "granted" };
    /* All three role gates are HELD-based. Holding a role grants its
     * capabilities; the ACTIVE role only chooses context (which dashboard home,
     * which profile you are editing).
     *
     * `professional` and `exhibitor` read `viewer.role` — the active/legacy
     * scalar — so a user who held professional AND employer lost every
     * professional capability the moment they switched to employer, and vice
     * versa. Roles stack in this product, so a capability must not disappear
     * because you are currently looking at a different one of your own profiles.
     * `employer` was already correct; these now match it. */
    case "professional":
      if (!viewer.signedIn) return { state: "hidden" };
      return viewer.heldRoles.has("professional") ? { state: "granted" } : { state: "hidden" };
    case "exhibitor":
      if (!viewer.signedIn) return { state: "hidden" };
      return viewer.heldRoles.has("exhibitor") ? { state: "granted" } : { state: "hidden" };
    case "employer":
      // Signed-in users who haven't set up an employer profile see a "locked"
      // CTA (the intent gate); visitors see nothing.
      if (!viewer.signedIn) return { state: "hidden" };
      return viewer.heldRoles.has("employer") ? { state: "granted" } : { state: "locked", requires: req };
    case "plan": {
      // plan gates apply to professionals; non-professionals don't see these tools
      if (viewer.role !== "professional") return { state: "hidden" };
      // Ranks are shared across both ladders (sme and plus are both rank 1), so
      // comparing across them would let an exhibitor tier unlock professional
      // tools. A professional holding an exhibitor slug is a data error; treat
      // it as unpaid rather than granting.
      if (isExhibitorPlan(viewer.plan)) return { state: "locked", requires: req };
      return PLAN_RANK[viewer.plan] >= PLAN_RANK[req.plan] ? { state: "granted" } : { state: "locked", requires: req };
    }
  }
}

export const can = (viewer: Viewer, cap: Capability) => evaluate(viewer, cap).state === "granted";

/** Human label for what's needed to unlock — used on locked CTAs. */
export function requirementLabel(req?: Requirement): string {
  if (!req) return "";
  switch (req.kind) {
    case "signin": return "Sign in";
    case "role": return "Register as a professional";
    case "professional": return "Professionals only";
    case "exhibitor": return "Exhibitors only";
    case "employer": return "Set up employer profile";
    case "plan": return `Upgrade to ${PLAN_LABEL[req.plan]}`;
  }
}

export function normalizeViewer(input: {
  signedIn?: boolean;
  role?: string | null;
  plan?: string | null;
  heldRoles?: { role: string; plan?: string | null }[];
  activeRole?: string | null;
}): Viewer {
  const KNOWN_ROLES = ["professional", "exhibitor", "employer", "admin", "super_admin"] as const;
  const STACKABLE = ["professional", "exhibitor", "employer"] as const;
  const isStackable = (r?: string | null): r is StackableRole => STACKABLE.includes(r as StackableRole);

  const signedIn = !!input.signedIn;
  let role: Role = "client";
  if (signedIn) {
    const r = input.role;
    // Legacy "buyer" role folds into professional (general user).
    role = (KNOWN_ROLES as readonly string[]).includes(r ?? "") ? (r as Role) : r === "buyer" ? "professional" : "client";
  }
  const ALL_PLANS = ["free", "plus", "pro", "premium", "sme", "exhibitor", "key_player"] as const;
  const plan = (ALL_PLANS as readonly string[]).includes(input.plan ?? "") ? (input.plan as Plan) : "free";

  const validPlan = (p?: string | null): Plan =>
    (ALL_PLANS as readonly string[]).includes(p ?? "") ? (p as Plan) : "free";

  const heldRoles = new Set<StackableRole>();
  const plans: Partial<Record<StackableRole, Plan>> = {};
  for (const h of input.heldRoles ?? []) {
    if (isStackable(h.role)) {
      heldRoles.add(h.role);
      plans[h.role] = validPlan(h.plan);
    }
  }
  // Synthesize from the legacy scalar when the caller passes no held-roles at
  // all, and also when it passes an empty set: an account predating the
  // stackable-roles migration has a `user.role` but no `user_role` rows, and
  // surfaces that render one section per held role (all of Account Settings)
  // came out completely blank for them. `syncPrimaryRole` keeps the scalar in
  // step, so this restores unmigrated accounts rather than granting anything.
  if ((input.heldRoles === undefined || heldRoles.size === 0) && isStackable(role)) {
    heldRoles.add(role);
    plans[role] = plan;
  }

  // activeRole is what the dashboard shows. Prefer the explicit value; otherwise
  // fall back to the (synced) primary scalar. Must be a role the viewer holds
  // (or an elevated scalar) — an activeRole not in heldRoles is ignored.
  const activeRaw = input.activeRole ?? role;
  let activeRole: Role = (KNOWN_ROLES as readonly string[]).includes(activeRaw ?? "") ? (activeRaw as Role) : "client";
  if (isStackable(activeRole) && input.heldRoles !== undefined && !heldRoles.has(activeRole)) {
    activeRole = isStackable(role) && heldRoles.has(role) ? role : (heldRoles.values().next().value ?? "client");
  }

  return {
    signedIn,
    role: activeRole,
    plan: isStackable(activeRole) ? (plans[activeRole] ?? "free") : plan,
    heldRoles,
    activeRole,
    plans,
  };
}

/* ── pricing (NGN) — reflected on the homepage + dashboard Plans page ── */
export type BillingCycle = "monthly" | "biannual" | "annual";
export const CYCLE_MONTHS: Record<BillingCycle, number> = { monthly: 1, biannual: 6, annual: 12 };

export const PRICING: Record<Exclude<ProfessionalPlan, "free">, Record<BillingCycle, number>> = {
  plus: { monthly: 18000, biannual: 102600, annual: 194400 },
  pro: { monthly: 30000, biannual: 171000, annual: 324000 },
  premium: { monthly: 45000, biannual: 256500, annual: 486000 },
};

export const EXHIBITOR_PRICING: Record<Exclude<ExhibitorPlan, "free">, Record<BillingCycle, number>> = {
  sme: { monthly: 50_000, biannual: 250_000, annual: 450_000 },
  exhibitor: { monthly: 250_000, biannual: 1_250_000, annual: 2_200_000 },
  key_player: { monthly: 500_000, biannual: 2_200_000, annual: 4_300_000 },
};

/**
 * Ad campaign durations. A promotion is bought for a fixed run, not on a
 * recurring cycle, so these are separate from the plan ladders above.
 */
export type CampaignDuration = "week" | "month";
export const CAMPAIGN_PLANS: Record<CampaignDuration, { days: number; amount: number; label: string; blurb: string; popular?: boolean }> = {
  week: { days: 7, amount: 5_000, label: "1 week promotion", blurb: "Immediate visibility to drive quick traffic to your profile/project." },
  month: { days: 30, amount: 18_000, label: "1 month promotion", blurb: "Sustained visibility for maximum lead generation.", popular: true },
};

/**
 * Industry Reports add-on. Priced on the billing screen per the Figma, but not
 * yet purchasable — the report itself has no content, generation or delivery,
 * so the cards render with a "Coming soon" action rather than taking money.
 *
 * Note the bi-annual tier is 6 × the monthly price, i.e. no saving at all,
 * despite being badged "Most Popular" in the design. `cycleSaving` reports 0
 * for it rather than inventing a discount.
 */
export const REPORT_PRICING: Record<BillingCycle, number> = { monthly: 1_000, biannual: 6_000, annual: 10_000 };

/** Price for any plan on either ladder. "free" is 0. */
export function planPrice(plan: Plan, cycle: BillingCycle): number {
  if (plan === "free") return 0;
  return isExhibitorPlan(plan) ? EXHIBITOR_PRICING[plan][cycle] : PRICING[plan][cycle];
}

/**
 * Whole-percent saving of a multi-month cycle against paying monthly.
 * Derived rather than hardcoded — the exhibitor ladder discounts differently
 * per tier (17–28%), so a single global "Save X%" chip would be wrong.
 */
export function cycleSaving(plan: Plan, cycle: BillingCycle): number {
  if (plan === "free" || cycle === "monthly") return 0;
  const full = planPrice(plan, "monthly") * CYCLE_MONTHS[cycle];
  if (full <= 0) return 0;
  return Math.round(((full - planPrice(plan, cycle)) / full) * 100);
}

export const naira = (n: number) => `₦${n.toLocaleString()}`;
