"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { and, desc, eq, lt, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { paymentTransaction, paymentRetry } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { planPrice, isExhibitorPlan, PLAN_LABEL, type Plan, type BillingCycle } from "@/lib/entitlements";
import { setRolePlan } from "@/lib/services/roles";
import { activeProvider, getProvider, type ProviderName } from "@/lib/payments";
import { resolveSiteUrl } from "@/lib/site-url";

const APP_URL = resolveSiteUrl();

/**
 * Apply a settled purchase to the buyer. The plan slug identifies its ladder,
 * so exhibitor tiers land on the exhibitor role row only — writing one to the
 * legacy `user.plan` scalar would leak it into professional plan gates for
 * anyone holding both roles.
 */
async function applyPlan(userId: string, plan: string, cycle?: string): Promise<void> {
  // The paid term the purchase buys. Renewal is manual today, so this doubles
  // as when access lapses — and it is what a deferred downgrade waits for.
  const months = cycle === "annual" ? 12 : cycle === "biannual" ? 6 : 1;
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + months);

  if (isExhibitorPlan(plan)) {
    await setRolePlan(userId, plan, "exhibitor", periodEnd);
    return;
  }
  await db.execute(sql`UPDATE "user" SET plan = ${plan} WHERE id = ${userId}`);
  await setRolePlan(userId, plan, "professional", periodEnd);
}

export type StartResult = { demo?: boolean; checkoutUrl?: string };

export async function startCheckout(plan: Plan, cycle: BillingCycle, preferred?: ProviderName): Promise<StartResult> {
  const uid = await requireUserId();
  if (plan === "free") throw new Error("Pick a paid plan");
  // Professional Premium is still unbuilt; the exhibitor top tier (key_player)
  // is a different ladder and is purchasable.
  if (plan === "premium") throw new Error("Premium is coming soon");
  const amount = planPrice(plan, cycle); // server-computed — never trust the client
  const reference = `nm_${crypto.randomBytes(12).toString("hex")}`;
  // Honour the buyer's pick, but only if that gateway is really configured —
  // otherwise the choice was cosmetic and they'd be sent to a dead redirect.
  const chosen = preferred ? getProvider(preferred) : null;
  const provider = chosen?.isConfigured() ? chosen : activeProvider();

  if (!provider) {
    // No gateway configured. Granting the plan here hands out paid tiers for
    // free, so it stays behind an explicit opt-in: an environment that simply
    // forgot its keys must fail loudly rather than start giving away
    // subscriptions.
    if (process.env.ALLOW_DEMO_PAYMENTS !== "true") {
      throw new Error("Payments are unavailable right now. Please try again shortly.");
    }
    await db.insert(paymentTransaction).values({ userId: uid, plan, cycle, amount, provider: "demo", reference, status: "success", verifiedAt: new Date() });
    await applyPlan(uid, plan, cycle);
    revalidatePath("/dashboard"); revalidatePath("/dashboard/plans"); revalidatePath("/dashboard/billing");
    return { demo: true };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? "";
  await db.insert(paymentTransaction).values({ userId: uid, plan, cycle, amount, provider: provider.name, reference, status: "pending" });
  const callbackUrl = `${APP_URL}/dashboard/billing/verify?reference=${reference}`;
  const { checkoutUrl } = await provider.init({ email, amountNaira: amount, reference, callbackUrl, metadata: { uid, plan, cycle } });
  return { checkoutUrl };
}

/** Settle a transaction by RE-VERIFYING with the provider (source of truth).
 *  Uses SELECT FOR UPDATE to prevent concurrent webhook + callback races.
 *  Idempotent: only flips pending→success once. Amount-verified server-side. */
async function settle(reference: string): Promise<"success" | "failed" | "pending"> {
  // Row-level lock: acquire exclusive lock on this transaction row
  const lockResult = await db.execute(sql`
    SELECT id, user_id, plan, cycle, amount, provider, status
    FROM payment_transaction
    WHERE reference = ${reference}
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `);
  const tx = (lockResult.rows as Record<string, unknown>[])[0];
  if (!tx) return "pending";
  if (tx.status === "success") return "success";

  const provider = getProvider(tx.provider as ProviderName);
  if (!provider || !provider.isConfigured()) return "pending";

  const result = await provider.verify(reference);

  if (result.status === "success") {
    // Amount guard: provider must have charged at least what we expected
    if (result.amountNaira < (tx.amount as number)) {
      await db.update(paymentTransaction).set({ status: "failed" })
        .where(and(eq(paymentTransaction.id, String(tx.id)), eq(paymentTransaction.status, "pending")));
      throw new Error(`Amount mismatch: expected ${tx.amount}, got ${result.amountNaira}`);
    }
    // Atomic flip: only the row still pending gets updated (CAS)
    const updated = await db.update(paymentTransaction)
      .set({ status: "success", verifiedAt: new Date() })
      .where(and(eq(paymentTransaction.id, String(tx.id)), eq(paymentTransaction.status, "pending")))
      .returning({ id: paymentTransaction.id });

    if (updated.length > 0) {
      await applyPlan(String(tx.user_id), String(tx.plan), String(tx.cycle ?? "monthly"));
      revalidatePath("/dashboard"); revalidatePath("/dashboard/plans"); revalidatePath("/dashboard/billing");
    }
    return "success";
  }

  if (result.status === "failed") {
    await db.update(paymentTransaction).set({ status: "failed" })
      .where(and(eq(paymentTransaction.id, String(tx.id)), eq(paymentTransaction.status, "pending")));
    return "failed";
  }

  return "pending";
}

/** Internal — called by the webhook route after signature verification. */
export async function settleByWebhook(reference: string) {
  return settle(reference);
}

/** Handle transfer.success / transfer.failed webhooks (vendor payouts). */
export async function settleTransferWebhook(reference: string, status: string) {
  // Transfer events are informational — log them and update the wallet ledger
  // when the wallet/payout system uses transfer references.
  // For now, just mark the payout as confirmed/failed in the wallet service.
  try {
    const { updatePayoutStatus } = await import("@/lib/services/payouts");
    await updatePayoutStatus(reference, status === "success" ? "completed" : "failed");
  } catch { /* payout service may not have this transfer */ }
}

/** Process pending retries — call from a cron/scheduled endpoint. */
export async function processRetryQueue(): Promise<number> {
  let processed = 0;
  try {
    const pending = await db.select().from(paymentRetry)
      .where(and(isNull(paymentRetry.resolvedAt), lt(paymentRetry.nextRetryAt, new Date())))
      .limit(20);

    for (const r of pending) {
      try {
        const result = await settle(r.reference);
        if (result === "success" || result === "failed") {
          await db.update(paymentRetry).set({ resolvedAt: new Date() }).where(eq(paymentRetry.id, r.id));
        } else {
          // Exponential backoff: 1m, 5m, 30m, 2h, 12h
          const delays = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
          const nextDelay = delays[Math.min(r.attempts ?? 0, delays.length - 1)];
          await db.update(paymentRetry).set({
            attempts: (r.attempts ?? 0) + 1,
            nextRetryAt: new Date(Date.now() + nextDelay),
          }).where(eq(paymentRetry.id, r.id));
        }
        processed++;
      } catch (e) {
        await db.update(paymentRetry).set({
          attempts: (r.attempts ?? 0) + 1,
          lastError: e instanceof Error ? e.message : "Retry failed",
          nextRetryAt: new Date(Date.now() + 300_000),
        }).where(eq(paymentRetry.id, r.id));
      }
    }
  } catch { /* retry table may not exist */ }
  return processed;
}

/** Reconcile stale pending transactions older than 1 hour.
 *  Re-verifies each with the provider. */
export async function reconcilePending(): Promise<{ settled: number; failed: number; stillPending: number }> {
  const oneHourAgo = new Date(Date.now() - 3_600_000);
  const stale = await db.select().from(paymentTransaction)
    .where(and(eq(paymentTransaction.status, "pending"), lt(paymentTransaction.createdAt, oneHourAgo)))
    .limit(50);

  let settled = 0, failed = 0, stillPending = 0;
  for (const tx of stale) {
    try {
      const result = await settle(tx.reference);
      if (result === "success") settled++;
      else if (result === "failed") failed++;
      else stillPending++;
    } catch { failed++; }
  }
  return { settled, failed, stillPending };
}

/** Called from the post-checkout callback page (scoped to the user). */
export async function verifyAndApply(reference: string): Promise<{ status: "success" | "failed" | "pending"; plan?: string }> {
  const uid = await requireUserId();
  const [tx] = await db.select().from(paymentTransaction).where(and(eq(paymentTransaction.reference, reference), eq(paymentTransaction.userId, uid))).limit(1);
  if (!tx) throw new Error("Transaction not found");
  const status = await settle(reference);
  return { status, plan: status === "success" ? tx.plan : undefined };
}

export type TxRow = { id: string; reference: string; plan: string; planLabel: string; cycle: string; amount: number; provider: string; status: string; date: string };

const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
const toRow = (t: typeof paymentTransaction.$inferSelect): TxRow => ({
  id: t.id, reference: t.reference, plan: t.plan, planLabel: PLAN_LABEL[t.plan as Plan] ?? t.plan, cycle: t.cycle,
  amount: t.amount, provider: t.provider, status: t.status ?? "pending", date: fmtDate(t.createdAt),
});

export async function getMyTransactions(): Promise<TxRow[]> {
  // requireUserId() belongs inside the try — sitting above it, it read as
  // guarded while its throw sailed straight past the catch to the page.
  try {
    const uid = await requireUserId();
    const rows = await db.select().from(paymentTransaction).where(eq(paymentTransaction.userId, uid)).orderBy(desc(paymentTransaction.createdAt)).limit(50);
    return rows.map(toRow);
  } catch { return []; }
}

/** A single transaction (for the invoice page), scoped to the current user. */
export async function getTransaction(id: string): Promise<TxRow | null> {
  try {
    const uid = await requireUserId();
    const [t] = await db.select().from(paymentTransaction).where(and(eq(paymentTransaction.id, id), eq(paymentTransaction.userId, uid))).limit(1);
    return t ? toRow(t) : null;
  } catch { return null; }
}
