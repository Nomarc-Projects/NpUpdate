"use server";

import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { company, product, userRole } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { asExhibitorPlan, getNextPlan, PLAN_LABEL, type ExhibitorPlan } from "@/lib/entitlements";
import { type ExhibitorLimitSummary, type TrialState } from "@/lib/services/exhibitor-trial-rules";
import {
  EXHIBITOR_CATEGORY_CAP,
  getExhibitorTotalListingCap,
} from "@/lib/services/exhibitor-plan-rules";
import { getActiveTrial } from "@/lib/services/trial";

/**
 * Exhibitor publishing requires an active paid plan OR an active 14-day trial.
 * Account setup (the onboarding wizard) grants the exhibitor role; "Start
 * 14-day trial" activates the trial on the plans screen. A lapsed trial stops
 * new publishing but deliberately leaves already-published products listed.
 *
 * The rule lives here alone. `createProduct`, `setProductStatus`, the catalog
 * UI and the billing panel all defer to `getTrialState()` — a second copy of
 * "is this allowed" would drift from this one within a release. Constants and
 * types are in ./exhibitor-trial-rules.ts, since a "use server" module may only
 * export async functions.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The active paid exhibitor tier this account is on, or "free". An expired
 * period no longer counts — the gate must not let a lapsed subscription
 * through. `asExhibitorPlan` also absorbs rows still holding a professional
 * slug from before the exhibitor ladder existed; those grant nothing rather
 * than being mistaken for a paid tier.
 *
 * Also checks for active 14-day trial (trial_ends_at + trial_plan on user_role).
 */
export async function resolveExhibitorPlan(uid: string): Promise<ExhibitorPlan> {
  // Check for active trial first
  const trial = await getActiveTrial(uid, "exhibitor");
  if (trial) return trial.plan as ExhibitorPlan;

  const rows = await db
    .select({ plan: userRole.plan, currentPeriodEnd: userRole.currentPeriodEnd, trialEndsAt: userRole.trialEndsAt })
    .from(userRole)
    .where(and(eq(userRole.userId, uid), eq(userRole.role, "exhibitor"), eq(userRole.status, "active")));
  for (const r of rows) {
    const p = asExhibitorPlan(r.plan);
    if (p === "free") continue;
    // A null period end is a pre-0038 subscription — grandfathered. A past one
    // is lapsed, so it grants nothing until renewed.
    if (r.currentPeriodEnd && r.currentPeriodEnd.getTime() <= Date.now()) continue;
    // A trial writes the plan slug but no period end. Once it lapses, its row
    // looks like a grandfathered subscription unless the trial stamp rules it
    // out — purchasing clears trialEndsAt, so this only rejects expired trials.
    if (!r.currentPeriodEnd && r.trialEndsAt) continue;
    return p;
  }
  return "free";
}

/**
 * Current publishing standing for the signed-in exhibitor.
 *
 * Expiry is read lazily (there is no cron in this app). Products already
 * published are intentionally NOT retired when the trial ends: they stay on
 * the exhibition hub, while new publishing is blocked and buyer enquiries are
 * disabled until the exhibitor subscribes.
 */
export async function getTrialState(): Promise<TrialState> {
  const uid = await requireUserId();

  const [co] = await db
    .select({ id: company.id })
    .from(company)
    .where(eq(company.ownerUserId, uid))
    .limit(1);

  if (!co) {
    return { isExhibitor: false, subscribed: false, hasActivePlan: false, trialEnded: false, plan: "free", inTrial: false, daysLeft: 0, publishedCount: 0, listingCap: 0, canPublish: false, reason: "not_exhibitor" };
  }

  // Check for active 14-day plan trial
  const trial = await getActiveTrial(uid, "exhibitor");
  const inPlanTrial = !!trial;
  const plan = inPlanTrial ? (trial.plan as ExhibitorPlan) : await resolveExhibitorPlan(uid);
  const subscribed = plan !== "free" && !inPlanTrial;

  // A trial that ran out without a paid plan taking over — drives the
  // "subscribe to continue" prompt. Purchasing clears trialEndsAt.
  const [role] = await db
    .select({ trialEndsAt: userRole.trialEndsAt })
    .from(userRole)
    .where(and(eq(userRole.userId, uid), eq(userRole.role, "exhibitor"), eq(userRole.status, "active")))
    .limit(1);
  const trialEnded = !inPlanTrial && !!role?.trialEndsAt && role.trialEndsAt.getTime() <= Date.now();

  const [pub] = await db
    .select({ n: count() })
    .from(product)
    .where(and(eq(product.companyId, co.id), eq(product.status, "active")));
  const publishedCount = Number(pub?.n ?? 0);

  // A 14-day trial grants the plan's full listing allowance. Losing that
  // entitlement only blocks NEW listings — existing ones stay public.
  const hasActivePlan = subscribed || inPlanTrial;
  const listingCap = hasActivePlan ? getExhibitorTotalListingCap(plan) : 0;
  const canPublish = publishedCount < listingCap;
  const reason: TrialState["reason"] = canPublish
    ? "ok"
    : hasActivePlan ? "plan_limit_reached"
    : "plan_required";

  return {
    isExhibitor: true,
    subscribed,
    hasActivePlan,
    trialEnded,
    plan,
    inTrial: inPlanTrial,
    daysLeft: inPlanTrial ? Math.max(0, Math.ceil((trial!.endsAt.getTime() - Date.now()) / DAY_MS)) : 0,
    publishedCount,
    listingCap,
    canPublish,
    reason
  };
}

/**
 * Throws when the caller may not publish. Called by createProduct and
 * setProductStatus so the limit holds even if the request never touched our UI.
 */
export async function assertCanPublish(): Promise<void> {
  const t = await getTrialState();
  if (t.canPublish) return;
  throw new Error(
    t.reason === "plan_limit_reached"
      ? `You've reached your plan's total product limit — ${t.listingCap} active product${t.listingCap === 1 ? "" : "s"} allowed in total, in any category.${upgradeHint(t.plan)} Unpublish one to make room.`
      : "Choose an exhibitor plan to publish products to your showroom.",
  );
}

/** ", Upgrade to Exhibitors to add more." — empty once on the top tier. */
function upgradeHint(plan: ExhibitorPlan): string {
  const next = getNextPlan(plan, "exhibitor");
  return next ? ` Upgrade to ${PLAN_LABEL[next]} to add more.` : "";
}

/**
 * The exhibitor's plan plus how much of it is used — powers the plan-limit
 * banner. Null when there's no company (the caller isn't an exhibitor yet).
 */
export async function getExhibitorLimitSummary(): Promise<ExhibitorLimitSummary | null> {
  const uid = await requireUserId();
  const [co] = await db
    .select({ id: company.id, categories: company.categories })
    .from(company)
    .where(eq(company.ownerUserId, uid))
    .limit(1);
  if (!co) return null;

  const plan = await resolveExhibitorPlan(uid);
  const categoryCap = EXHIBITOR_CATEGORY_CAP[plan];
  const totalCap = getExhibitorTotalListingCap(plan);

  const grouped = await db
    .select({ category: product.category, n: count() })
    .from(product)
    .where(and(eq(product.companyId, co.id), eq(product.status, "active")))
    .groupBy(product.category);
  const byCategory = new Map<string, number>();
  for (const g of grouped) if (g.category) byCategory.set(g.category, Number(g.n ?? 0));
  // Count every grouped row, including products with no category. Enforcement
  // in getTrialState() counts all active products, so the banner must agree or
  // an exhibitor could be blocked without ever seeing the total-limit message.
  const totalActive = grouped.reduce((sum, g) => sum + Number(g.n ?? 0), 0);

  const registered = co.categories ?? [];
  const categories = registered.map((name) => ({ name, count: byCategory.get(name) ?? 0 }));
  const atCategoryLimit = registered.length >= categoryCap;
  const atUploadLimit = totalActive >= totalCap;

  const next = getNextPlan(plan, "exhibitor");
  return {
    plan,
    planLabel: PLAN_LABEL[plan],
    categoryCap,
    categoryUsed: registered.length,
    totalCap,
    totalActive,
    categories,
    atCategoryLimit,
    atUploadLimit,
    nextPlanLabel: next ? PLAN_LABEL[next] : null,
  };
}
