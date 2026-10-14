"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userRole } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { isStackableRole, type StackableRole } from "@/lib/roles-internal";
import { type Plan, isExhibitorPlan } from "@/lib/entitlements";
import { TRIAL_DAYS, DAY_MS } from "@/lib/services/trial-rules";

/**
 * Starts a 14-day trial for the given plan on the user's active role.
 * Idempotent: re-starting the same plan extends the trial (one trial per plan).
 * Returns the trial end date.
 */
export async function startTrial(plan: Plan): Promise<{ trialEndsAt: Date } | { error: string }> {
  const uid = await requireUserId();

  // Determine which role this plan belongs to
  const role = isExhibitorPlan(plan) ? "exhibitor" : "professional";

  if (!isStackableRole(role)) {
    return { error: "Invalid role for trial" };
  }

  // Check if user holds this role
  const held = await db
    .select({ role: userRole.role })
    .from(userRole)
    .where(and(eq(userRole.userId, uid), eq(userRole.role, role), eq(userRole.status, "active")))
    .limit(1);

  if (held.length === 0) {
    return { error: `You need to be a ${role} to trial this plan. Complete the ${role} setup first.` };
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * DAY_MS);

  await db
    .insert(userRole)
    .values({
      userId: uid,
      role,
      status: "active",
      source: "trial",
      plan,
      trialEndsAt,
      trialPlan: plan,
    })
    .onConflictDoUpdate({
      target: [userRole.userId, userRole.role],
      set: {
        status: "active",
        plan,
        trialEndsAt,
        trialPlan: plan,
        pendingPlan: null,
      },
    });

  return { trialEndsAt };
}

/**
 * Checks if the user has an active trial for the given role.
 * Returns the trial plan and end date if active, null otherwise.
 */
export async function getActiveTrial(userId: string, role: StackableRole): Promise<{ plan: Plan; endsAt: Date } | null> {
  const [row] = await db
    .select({ plan: userRole.plan, trialEndsAt: userRole.trialEndsAt, trialPlan: userRole.trialPlan })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.role, role), eq(userRole.status, "active")))
    .limit(1);

  if (!row || !row.trialEndsAt || !row.trialPlan) return null;
  if (row.trialEndsAt.getTime() <= Date.now()) return null;

  return { plan: row.trialPlan as Plan, endsAt: row.trialEndsAt };
}

/**
 * Clears any trial state for a role (used when user subscribes).
 */
export async function clearTrial(userId: string, role: StackableRole): Promise<void> {
  await db
    .update(userRole)
    .set({ trialEndsAt: null, trialPlan: null })
    .where(and(eq(userRole.userId, userId), eq(userRole.role, role)));
}