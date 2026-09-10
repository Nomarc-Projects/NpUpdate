"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { paymentTransaction, promotion } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { CAMPAIGN_PLANS, type CampaignDuration } from "@/lib/entitlements";
import { requirePromotionEligibility } from "@/lib/services/promotions";
import { activeProvider, getProvider, type ProviderName } from "@/lib/payments";
import { resolveSiteUrl } from "@/lib/site-url";

const APP_URL = resolveSiteUrl();

/**
 * Buying a campaign run for a promotion.
 *
 * The order matters: a promotion is composed as `draft` and only enters
 * `pending_review` once money has settled. Queuing it for an admin before
 * payment would mean an ad could be approved and go live unpaid.
 *
 * Rejection does not void the payment. `payment_reference` and `paid_at` stay
 * on the row, so `resubmitPromotion` can put a corrected ad back in the queue
 * at no extra cost — the "held as a credit" guarantee in the campaign-duration
 * modal.
 */

export type StartPromotionResult = { demo?: boolean; checkoutUrl?: string };

/**
 * Which gateways can take a payment right now. Exposed as an action because the
 * Ads Board is a client component several levels below any server page, and
 * threading it through two dashboard homes that take no props would be worse
 * than one small round trip.
 */
export async function getConfiguredProviders(): Promise<ProviderName[]> {
  const { configuredProviders } = await import("@/lib/payments");
  return configuredProviders();
}

async function ownedDraft(id: string, uid: string) {
  const [row] = await db
    .select()
    .from(promotion)
    .where(and(eq(promotion.id, id), eq(promotion.ownerUserId, uid)))
    .limit(1);
  if (!row) throw new Error("That promotion no longer exists.");
  return row;
}

export async function startPromotionCheckout(
  promotionId: string,
  duration: CampaignDuration,
  preferred?: ProviderName,
): Promise<StartPromotionResult> {
  const uid = await requireUserId();
  const row = await ownedDraft(promotionId, uid);
  if (row.status === "active" || row.status === "completed") throw new Error("That campaign has already run.");

  // Restriction gate at the money: only Key players exhibitors and Nomarc
  // partners can buy a campaign run.
  const eligibility = await requirePromotionEligibility(uid);
  if (!eligibility.eligible) throw new Error("Promotions are reserved for Key players on the Exhibition Hub and for Nomarc partners.");

  const plan = CAMPAIGN_PLANS[duration];
  if (!plan) throw new Error("Pick a campaign duration.");

  // Already paid — a rejected ad keeps its credit, so resubmitting is free.
  if (row.paidAt) {
    await db
      .update(promotion)
      .set({ status: "pending_review", durationDays: plan.days, updatedAt: new Date() })
      .where(eq(promotion.id, promotionId));
    revalidatePath("/dashboard");
    return { demo: true };
  }

  const amount = plan.amount; // server-computed — never trust the client
  const reference = `nmp_${crypto.randomBytes(12).toString("hex")}`;
  const chosen = preferred ? getProvider(preferred) : null;
  const provider = chosen?.isConfigured() ? chosen : activeProvider();

  if (!provider) {
    // Same rule as subscriptions: a missing gateway must fail closed rather
    // than hand out free campaign runs.
    if (process.env.ALLOW_DEMO_PAYMENTS !== "true") {
      throw new Error("Payments are unavailable right now. Please try again shortly.");
    }
    await db.insert(paymentTransaction).values({
      userId: uid, plan: `promotion_${duration}`, cycle: duration, amount,
      provider: "demo", reference, status: "success", kind: "promotion", verifiedAt: new Date(),
    });
    await markPaid(promotionId, reference, plan.days, amount);
    revalidatePath("/dashboard");
    return { demo: true };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? "";
  await db.insert(paymentTransaction).values({
    userId: uid, plan: `promotion_${duration}`, cycle: duration, amount,
    provider: provider.name, reference, status: "pending", kind: "promotion",
  });
  // Bind the reference now so the webhook can find the campaign without
  // trusting anything the provider echoes back.
  await db
    .update(promotion)
    .set({ paymentReference: reference, durationDays: plan.days, amount, updatedAt: new Date() })
    .where(eq(promotion.id, promotionId));

  const callbackUrl = `${APP_URL}/dashboard/promotions/verify?reference=${reference}`;
  const { checkoutUrl } = await provider.init({
    email, amountNaira: amount, reference, callbackUrl,
    metadata: { uid, promotionId, duration },
  });
  return { checkoutUrl };
}

/** Moves a paid campaign into the review queue. Idempotent. */
async function markPaid(promotionId: string, reference: string, days: number, amount: number) {
  await db
    .update(promotion)
    .set({
      status: "pending_review",
      paymentReference: reference,
      durationDays: days,
      amount,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(promotion.id, promotionId), sql`${promotion.paidAt} IS NULL`));
}

/**
 * Called by the payments webhook once a `kind='promotion'` transaction settles.
 * Resolves the campaign from the reference alone.
 */
export async function applyPromotionPayment(reference: string): Promise<void> {
  const [tx] = await db
    .select()
    .from(paymentTransaction)
    .where(eq(paymentTransaction.reference, reference))
    .limit(1);
  if (!tx || tx.status !== "success") return;

  const [row] = await db.select().from(promotion).where(eq(promotion.paymentReference, reference)).limit(1);
  if (!row) return;
  const days = row.durationDays ?? (tx.cycle === "week" ? 7 : 30);
  await markPaid(row.id, reference, days, tx.amount);
  revalidatePath("/dashboard");
}

/** Post-checkout callback page — scoped to the payer. */
export async function verifyPromotionPayment(reference: string): Promise<{ status: string }> {
  const uid = await requireUserId();
  const [tx] = await db
    .select()
    .from(paymentTransaction)
    .where(and(eq(paymentTransaction.reference, reference), eq(paymentTransaction.userId, uid)))
    .limit(1);
  if (!tx) throw new Error("Transaction not found");

  const { settleByWebhook } = await import("@/lib/services/billing");
  const status = await settleByWebhook(reference);
  if (status === "success") await applyPromotionPayment(reference);
  return { status };
}

/**
 * Retires campaigns whose window has closed.
 *
 * Swept lazily on read, like the exhibitor trial: there is no cron in this app,
 * and read time is the only moment the state matters. Idempotent.
 */
export async function sweepExpiredPromotions(): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE promotion SET status = 'completed', updated_at = now()
      WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at < now()
    `);
  } catch { /* never block a render on the sweep */ }
}
