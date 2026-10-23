"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { company, product, userRole } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { asExhibitorPlan, getNextPlan, PLAN_LABEL, type ExhibitorPlan } from "@/lib/entitlements";
import { TRIAL_DAYS, type ExhibitorLimitSummary, type TrialState } from "@/lib/services/exhibitor-trial-rules";
import {
  EXHIBITOR_CATEGORY_CAP,
  getExhibitorTotalListingCap,
} from "@/lib/services/exhibitor-plan-rules";
import { getActiveTrial } from "@/lib/services/trial";

/**
 * Exhibitor publishing requires an active paid plan. Account setup (the
 * onboarding wizard) grants the exhibitor role; the plan is chosen and paid
 * for afterwards, and nothing can be published until it is. The 30-day trial
 * window is retained only to retire listings that predate this gate — it no
 * longer grants any publish allowance.
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
async function exhibitorPlan(uid: string): Promise<ExhibitorPlan> {
  // Check for active trial first
  const trial = await getActiveTrial(uid, "exhibitor");
  if (trial) return trial.plan as ExhibitorPlan;

  const rows = await db
    .select({ plan: userRole.plan, currentPeriodEnd: userRole.currentPeriodEnd })
    .from(userRole)
    .where(and(eq(userRole.userId, uid), eq(userRole.role, "exhibitor"), eq(userRole.status, "active")));
  for (const r of rows) {
    const p = asExhibitorPlan(r.plan);
    if (p === "free") continue;
    // A null period end is a pre-0038 subscription — grandfathered. A past one
    // is lapsed, so it grants nothing until renewed.
    if (r.currentPeriodEnd && r.currentPeriodEnd.getTime() <= Date.now()) continue;
    return p;
  }
  return "free";
}

/**
 * Current publishing standing for the signed-in exhibitor.
 *
 * Also performs the expiry sweep: when the window has lapsed and there's no
 * subscription, that exhibitor's active products are flipped to draft. This is
 * done lazily on read rather than by a scheduled job — there is no cron in this
 * app, and read time is the only moment the state actually matters (someone is
 * looking at the catalogue). It is idempotent: once flipped, the UPDATE matches
 * nothing on later reads.
 */
export async function getTrialState(): Promise<TrialState> {
  const uid = await requireUserId();

  const [co] = await db
    .select({ id: company.id, trialStartedAt: company.trialStartedAt, createdAt: company.createdAt })
    .from(company)
    .where(eq(company.ownerUserId, uid))
    .limit(1);

  if (!co) {
    return { isExhibitor: false, subscribed: false, plan: "free", inTrial: false, daysLeft: 0, publishedCount: 0, listingCap: 0, canPublish: false, reason: "not_exhibitor" };
  }

  // Check for active 14-day plan trial
  const trial = await getActiveTrial(uid, "exhibitor");
  const inPlanTrial = !!trial;
  const plan = inPlanTrial ? (trial.plan as ExhibitorPlan) : await exhibitorPlan(uid);
  const subscribed = plan !== "free" && !inPlanTrial;

  // Legacy 30-day company trial (for grandfathering old free listings)
  const started = co.trialStartedAt ?? co.createdAt;
  const elapsed = Date.now() - new Date(started).getTime();
  const legacyDaysLeft = Math.max(0, Math.ceil((TRIAL_DAYS * DAY_MS - elapsed) / DAY_MS));
  const inLegacyTrial = legacyDaysLeft > 0;

  const [pub] = await db
    .select({ n: count() })
    .from(product)
    .where(and(eq(product.companyId, co.id), eq(product.status, "active")));
  let publishedCount = Number(pub?.n ?? 0);

  // Lapsed and unpaid: retire the listings rather than leaving them live for free.
  // But don't retire if user is in an active 14-day plan trial.
  if (!subscribed && !inPlanTrial && !inLegacyTrial && publishedCount > 0) {
    await db
      .update(product)
      .set({ status: "draft", draft: true, updatedAt: new Date() })
      .where(and(eq(product.companyId, co.id), ne(product.status, "draft")));
    publishedCount = 0;
  }

  // Publishing allowed if: subscribed OR in 14-day plan trial
  const listingCap = (subscribed || inPlanTrial) ? getExhibitorTotalListingCap(plan) : 0;
  const canPublish = publishedCount < listingCap;
  const reason: TrialState["reason"] = canPublish
    ? "ok"
    : subscribed || inPlanTrial ? "plan_limit_reached"
    : "plan_required";

  return {
    isExhibitor: true,
    subscribed,
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
      ? `Your ${PLAN_LABEL[t.plan]} plan covers ${t.listingCap} active listing${t.listingCap === 1 ? "" : "s"}.${upgradeHint(t.plan)} Unpublish one to make room.`
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

  const plan = await exhibitorPlan(uid);
  const categoryCap = EXHIBITOR_CATEGORY_CAP[plan];
  const totalCap = getExhibitorTotalListingCap(plan);

  const grouped = await db
    .select({ category: product.category, n: count() })
    .from(product)
    .where(and(eq(product.companyId, co.id), eq(product.status, "active")))
    .groupBy(product.category);
  const byCategory = new Map<string, number>();
  for (const g of grouped) if (g.category) byCategory.set(g.category, Number(g.n ?? 0));
  const totalActive = [...byCategory.values()].reduce((a, b) => a + b, 0);

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
