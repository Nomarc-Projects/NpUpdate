"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUserId } from "@/lib/server-user";
import type { Plan, BillingCycle } from "@/lib/entitlements";
import { setRolePlan, scheduleDowngrade, type StackableRole } from "@/lib/services/roles";

const VALID: Plan[] = ["free", "plus", "pro", "premium"];

/**
 * Legacy free plan-flip. Superseded by startCheckout (lib/services/billing.ts),
 * which charges before granting; kept only because older call sites still
 * import it. Do not add new callers.
 */
export async function subscribePlan(plan: Plan, _cycle: BillingCycle = "monthly") {
  const uid = await requireUserId();
  if (!VALID.includes(plan)) throw new Error("Invalid plan");
  if (plan === "premium") throw new Error("Premium is coming soon");
  if (process.env.ALLOW_DEMO_PAYMENTS !== "true") {
    throw new Error("Payments are unavailable right now. Please try again shortly.");
  }
  await db.execute(sql`UPDATE "user" SET plan = ${plan} WHERE id = ${uid}`);
  await setRolePlan(uid, plan);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/plans");
}

/**
 * Drop to Free at the end of the paid term, per the Confirm Downgrade modal —
 * "you will keep your current limits until your billing cycle ends". This used
 * to take effect instantly, which threw away time the user had already paid
 * for. Returns when it lands so the UI can say so.
 */
export async function cancelPlan(role: StackableRole = "professional"): Promise<{ effective: "immediately" | string }> {
  const uid = await requireUserId();
  const res = await scheduleDowngrade(uid, role, "free");
  // The legacy scalar only mirrors the professional ladder, and only once the
  // change is actually live.
  if (res.effective === "immediately" && role === "professional") {
    await db.execute(sql`UPDATE "user" SET plan = 'free' WHERE id = ${uid}`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/plans");
  return res;
}
