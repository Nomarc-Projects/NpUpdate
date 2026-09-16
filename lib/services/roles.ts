"use server";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { userRole } from "@/lib/db/schema";

export type StackableRole = "professional" | "exhibitor" | "employer";
export type RoleGrantSource = "signup_legacy" | "self_serve_tier1" | "kyc_approved" | "admin_grant";

export interface HeldRole {
  role: StackableRole;
  plan: string;
}

/** Every role currently held (active, not revoked) by a user. */
export async function getHeldRoles(userId: string): Promise<HeldRole[]> {
  const rows = await db
    .select({ role: userRole.role, plan: userRole.plan })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.status, "active")));
  return rows as HeldRole[];
}

/**
 * Recomputes the legacy `user.role` scalar (a Better Auth additionalField,
 * not a Drizzle table) from the held-roles set, so code not yet migrated to
 * `heldRoles`/`activeRole` keeps seeing a sane single value. Admins are never
 * touched here — admin isn't a stackable role.
 */
export async function syncPrimaryRole(userId: string): Promise<void> {
  const current = await db.execute(sql`SELECT role FROM "user" WHERE id = ${userId} LIMIT 1`);
  const currentRole = (current.rows as { role?: string }[])[0]?.role;
  if (currentRole === "admin") return;

  const held = await getHeldRoles(userId);
  const roles = new Set(held.map((h) => h.role));
  const next = roles.has("exhibitor")
    ? "exhibitor"
    : roles.has("professional")
      ? "professional"
      : roles.has("employer")
        ? "employer"
        : "client";
  await db.execute(sql`UPDATE "user" SET role = ${next} WHERE id = ${userId}`);
}

/** The role the dashboard should currently show (NULL = use primary-role precedence). */
export async function getActiveRole(userId: string): Promise<string | null> {
  const res = await db.execute(sql`SELECT active_role FROM "user" WHERE id = ${userId} LIMIT 1`);
  return (res.rows as { active_role?: string | null }[])[0]?.active_role ?? null;
}

/**
 * Switches which held role the dashboard shows. Ignored if the user doesn't
 * actually hold that role (you can't activate a role you haven't unlocked).
 * Returns the role that ended up active.
 */
export async function setActiveRole(userId: string, role: StackableRole): Promise<StackableRole | null> {
  const held = await getHeldRoles(userId);
  if (!held.some((h) => h.role === role)) return null;
  await db.execute(sql`UPDATE "user" SET active_role = ${role} WHERE id = ${userId}`);
  return role;
}

/**
 * Server action for the role switcher — resolves the caller from the session so
 * the client never passes a userId. Returns the role that ended up active (or
 * null if not signed in / the role isn't held).
 */
export async function switchActiveRole(role: StackableRole): Promise<StackableRole | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;
  return setActiveRole(userId, role);
}

/**
 * Grants the current user the `employer` role after they set up an employer
 * profile — the hiring analogue of the exhibitor wizard's `saveCompany` grant.
 * Job publishing is still gated on Tier-2 verification at the point of posting.
 */
export async function becomeEmployer(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return false;
  await grantRole(userId, "employer", "self_serve_tier1");
  return true;
}

/**
 * Syncs a plan purchase/cancellation onto the user's currently active
 * stackable role. `normalizeViewer()` reads `plans[activeRole]` (from
 * `userRole.plan`), not the legacy `user.plan` scalar, whenever `heldRoles`
 * is present — which server-side `getViewer()` always passes. Without this,
 * a professional's plan upgrade is invisible to server-side plan gates.
 * No-op if the active role isn't stackable (client/admin have no plan).
 */
/**
 * Applies any downgrade whose billing period has elapsed.
 *
 * Lazy, on read, like the exhibitor trial sweep — there is no cron here, and a
 * scheduled downgrade only matters at the moment someone's entitlements are
 * resolved. Idempotent: pending_plan is cleared as it is applied.
 */
export async function sweepExpiredPlans(userId?: string): Promise<void> {
  try {
    if (userId) {
      await db.execute(sql`
        UPDATE user_role
        SET plan = pending_plan, pending_plan = NULL, current_period_end = NULL, updated_at = now()
        WHERE user_id = ${userId} AND pending_plan IS NOT NULL
          AND current_period_end IS NOT NULL AND current_period_end < now()
      `);
    } else {
      await db.execute(sql`
        UPDATE user_role
        SET plan = pending_plan, pending_plan = NULL, current_period_end = NULL, updated_at = now()
        WHERE pending_plan IS NOT NULL AND current_period_end IS NOT NULL AND current_period_end < now()
      `);
    }
  } catch { /* never block a render on the sweep */ }
}

/**
 * Schedule a drop to a cheaper tier at the end of the paid term, per the
 * Confirm Downgrade modal. Without a period to defer to (a free row, or a
 * subscription predating 0038) it applies immediately, since there is nothing
 * left to honour.
 */
export async function scheduleDowngrade(userId: string, role: StackableRole, toPlan: string): Promise<{ effective: "immediately" | string }> {
  const [row] = await db
    .select({ currentPeriodEnd: userRole.currentPeriodEnd })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.role, role)))
    .limit(1);

  const end = row?.currentPeriodEnd;
  if (!end || end.getTime() <= Date.now()) {
    await db.update(userRole).set({ plan: toPlan, pendingPlan: null, currentPeriodEnd: null })
      .where(and(eq(userRole.userId, userId), eq(userRole.role, role)));
    return { effective: "immediately" };
  }
  await db.update(userRole).set({ pendingPlan: toPlan })
    .where(and(eq(userRole.userId, userId), eq(userRole.role, role)));
  return { effective: end.toISOString() };
}

export async function setRolePlan(userId: string, plan: string, target?: StackableRole, periodEnd?: Date): Promise<void> {
  // `target` pins the plan to a specific role. Callers that know which ladder
  // they sold (billing does — the plan slug says so) must pass it: relying on
  // the active role lands an exhibitor purchase on the professional row when
  // the buyer happened to be viewing the professional dashboard.
  const activeRole = target ?? (await getActiveRole(userId));
  const role = (["professional", "exhibitor", "employer"] as const).find((r) => r === activeRole);
  if (!role) return;
  await db
    .insert(userRole)
    .values({ userId, role, status: "active", source: "self_serve_tier1", plan, currentPeriodEnd: periodEnd ?? null })
    .onConflictDoUpdate({
      target: [userRole.userId, userRole.role],
      // Paying clears any queued downgrade — buying a tier cancels a scheduled
      // drop rather than letting it fire over the top of the new purchase.
      set: { plan, currentPeriodEnd: periodEnd ?? null, pendingPlan: null },
    });
}

/**
 * Revokes a held role (Account Settings "Delete this profile" flows) — flips
 * the `user_role` row to revoked, re-syncs the legacy primary-role scalar,
 * and — if the deleted role was the currently active dashboard role — moves
 * `active_role` onto another still-held role (or clears it to null so the
 * viewer falls back to primary-role precedence). Does not touch role-scoped
 * data (profile/company/job rows etc.) — callers delete that separately
 * (see `deleteRoleProfile` in `lib/services/account.ts`) before calling this.
 */
export async function revokeRole(userId: string, role: StackableRole): Promise<void> {
  await db
    .update(userRole)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(userRole.userId, userId), eq(userRole.role, role)));
  await syncPrimaryRole(userId);

  const active = await getActiveRole(userId);
  if (active === role) {
    const held = await getHeldRoles(userId);
    const fallback = held[0]?.role ?? null;
    await db.execute(sql`UPDATE "user" SET active_role = ${fallback} WHERE id = ${userId}`);
  }
}

/**
 * Grants (or re-activates) a role for a user and keeps the legacy scalar in
 * sync. Idempotent — re-granting an already-held role is a no-op beyond the
 * status flip. Not yet called from any page; wired up starting Phase 2's
 * intent-trigger and tier-1 KYC completion flows.
 */
export async function grantRole(userId: string, role: StackableRole, source: RoleGrantSource): Promise<void> {
  await db
    .insert(userRole)
    .values({ userId, role, status: "active", source })
    .onConflictDoUpdate({
      target: [userRole.userId, userRole.role],
      set: { status: "active", revokedAt: null },
    });
  await syncPrimaryRole(userId);
  // Land the user in the freshly unlocked dashboard the first time they gain a
  // role; leave an already-chosen active role untouched.
  await db.execute(sql`UPDATE "user" SET active_role = COALESCE(active_role, ${role}) WHERE id = ${userId}`);
}
