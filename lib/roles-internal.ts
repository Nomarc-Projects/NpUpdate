import "server-only";
import { sql } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userRole } from "@/lib/db/schema";

/**
 * Role primitives — server-internal.
 *
 * These take a `userId` and write privileged state, so they must never sit
 * behind a `"use server"` boundary: every export of such a module is a public
 * POST endpoint, whether or not any UI calls it. They previously did, which
 * meant an anonymous request could call `grantRole(<any id>, "exhibitor", …)`
 * followed by `setRolePlan(<any id>, "premium")` and take a paid tier for free,
 * bypassing KYC and quiz gating entirely — or call `revokeRole` to strip any
 * account's access. `StackableRole` is a TypeScript type and is erased at
 * runtime, so the role string was fully attacker-controlled.
 *
 * The caller-resolved server actions that wrap these live in
 * `lib/services/roles.ts`; they read the user id from the session and never
 * accept one as an argument.
 */

export type StackableRole = "professional" | "exhibitor" | "employer";
export type RoleGrantSource = "signup_legacy" | "self_serve_tier1" | "kyc_approved" | "admin_grant";

export const STACKABLE_ROLES: readonly StackableRole[] = ["professional", "exhibitor", "employer"];

export interface HeldRole {
  role: StackableRole;
  plan: string;
}

/** Reject anything that isn't a real stackable role before it reaches the DB. */
export function isStackableRole(value: unknown): value is StackableRole {
  return typeof value === "string" && (STACKABLE_ROLES as readonly string[]).includes(value);
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
  if (currentRole === "admin" || currentRole === "super_admin") return;

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
  if (!isStackableRole(role)) return null;
  const held = await getHeldRoles(userId);
  if (!held.some((h) => h.role === role)) return null;
  await db.execute(sql`UPDATE "user" SET active_role = ${role} WHERE id = ${userId}`);
  return role;
}

/**
 * Syncs a plan purchase/cancellation onto the user's currently active
 * stackable role. `normalizeViewer()` reads `plans[activeRole]` (from
 * `userRole.plan`), not the legacy `user.plan` scalar, whenever `heldRoles`
 * is present — which server-side `getViewer()` always passes. Without this,
 * a professional's plan upgrade is invisible to server-side plan gates.
 * No-op if the active role isn't stackable (client/admin have no plan).
 */
export async function setRolePlan(userId: string, plan: string): Promise<void> {
  const activeRole = await getActiveRole(userId);
  const role = STACKABLE_ROLES.find((r) => r === activeRole);
  if (!role) return;
  await db
    .insert(userRole)
    .values({ userId, role, status: "active", source: "self_serve_tier1", plan })
    .onConflictDoUpdate({
      target: [userRole.userId, userRole.role],
      set: { plan },
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
 * status flip.
 */
export async function grantRole(userId: string, role: StackableRole, source: RoleGrantSource): Promise<void> {
  if (!isStackableRole(role)) throw new Error("Unknown role");
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
