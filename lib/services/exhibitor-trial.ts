"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { company, product, userRole } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { asExhibitorPlan, PLAN_LABEL, type ExhibitorPlan } from "@/lib/entitlements";
import { TRIAL_DAYS, FREE_PUBLISHED_LIMIT, type TrialState } from "@/lib/services/exhibitor-trial-rules";
import { EXHIBITOR_LISTING_CAP } from "@/lib/services/exhibitor-plan-rules";

/**
 * Exhibitor free trial: one published listing for the first 30 days.
 *
 * The rule lives here alone. `createProduct`, `setProductStatus`, the catalog
 * UI and the billing panel all defer to `getTrialState()` — a second copy of
 * "is this allowed" would drift from this one within a release. Constants and
 * types are in ./exhibitor-trial-rules.ts, since a "use server" module may only
 * export async functions.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The exhibitor tier this account is on. "free" means unsubscribed — either on
 * trial or lapsed. `asExhibitorPlan` also absorbs rows still holding a
 * professional slug from before the exhibitor ladder existed; those grant
 * nothing rather than being mistaken for a paid tier.
 */
async function exhibitorPlan(uid: string): Promise<ExhibitorPlan> {
  const rows = await db
    .select({ plan: userRole.plan })
    .from(userRole)
    .where(and(eq(userRole.userId, uid), eq(userRole.role, "exhibitor"), eq(userRole.status, "active")));
  for (const r of rows) {
    const p = asExhibitorPlan(r.plan);
    if (p !== "free") return p;
  }
  return "free";
}

/**
 * Current trial standing for the signed-in exhibitor.
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

  const plan = await exhibitorPlan(uid);
  const subscribed = plan !== "free";

  // Companies created before 0029 ran fall back to createdAt, matching the
  // migration's own backfill.
  const started = co.trialStartedAt ?? co.createdAt;
  const elapsed = Date.now() - new Date(started).getTime();
  const daysLeft = Math.max(0, Math.ceil((TRIAL_DAYS * DAY_MS - elapsed) / DAY_MS));
  const inTrial = daysLeft > 0;

  const [pub] = await db
    .select({ n: count() })
    .from(product)
    .where(and(eq(product.companyId, co.id), eq(product.status, "active")));
  let publishedCount = Number(pub?.n ?? 0);

  // Lapsed and unpaid: retire the listings rather than leaving them live for free.
  if (!subscribed && !inTrial && publishedCount > 0) {
    await db
      .update(product)
      .set({ status: "draft", draft: true, updatedAt: new Date() })
      .where(and(eq(product.companyId, co.id), ne(product.status, "draft")));
    publishedCount = 0;
  }

  // A paid tier caps how many listings may be live at once; an unpaid account
  // gets the trial allowance while the window is open, and nothing after.
  const listingCap = subscribed ? EXHIBITOR_LISTING_CAP[plan] : inTrial ? FREE_PUBLISHED_LIMIT : 0;
  const canPublish = publishedCount < listingCap;
  const reason: TrialState["reason"] = canPublish
    ? "ok"
    : subscribed ? "plan_limit_reached"
    : !inTrial ? "trial_expired"
    : "trial_limit_reached";

  return { isExhibitor: true, subscribed, plan, inTrial, daysLeft, publishedCount, listingCap, canPublish, reason };
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
      ? `Your ${PLAN_LABEL[t.plan]} plan covers ${t.listingCap} active listing${t.listingCap === 1 ? "" : "s"}. Upgrade, or unpublish one to make room.`
      : t.reason === "trial_expired"
        ? "Your 30-day free trial has ended. Activate a subscription to publish products."
        : "Your free trial covers one published product. Activate a subscription to list more.",
  );
}
