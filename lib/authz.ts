import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";

/**
 * Authorization guards, in one place.
 *
 * These used to be copy-pasted into each service that needed them —
 * `admin.ts`, `promotions.ts`, `platform-settings.ts`, `crm.ts` and
 * `impersonation.ts` each carried their own — and the copies had drifted: two
 * of them tested `role !== "admin"` and so locked `super_admin` out of CRM and
 * of starting an impersonation, contradicting the rest of the codebase.
 *
 * `import "server-only"` matters here: this module must never be reachable
 * from a `"use server"` boundary, where every export would become a public
 * endpoint.
 */

export type AdminRole = "admin" | "super_admin";

/** The signed-in user's role, or undefined when signed out. */
async function sessionRole(): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  return (session?.user as { role?: string } | undefined)?.role;
}

/** True for both admin tiers. `super_admin` is an admin everywhere. */
export function isAdminRole(role: string | undefined): role is AdminRole {
  return role === "admin" || role === "super_admin";
}

/** Require any admin. Returns the caller's user id. */
export async function requireAdmin(): Promise<string> {
  const uid = await requireUserId();
  if (!isAdminRole(await sessionRole())) throw new Error("Forbidden");
  return uid;
}

/** Require `super_admin` specifically — admin management and other actions an
 *  ordinary admin must not be able to perform on their own account. */
export async function requireSuperAdmin(): Promise<string> {
  const uid = await requireUserId();
  if ((await sessionRole()) !== "super_admin") throw new Error("Forbidden — super admin only");
  return uid;
}

/** Admin check that answers rather than throws — for read paths that render a
 *  different view instead of failing. */
export async function isAdmin(): Promise<boolean> {
  return isAdminRole(await sessionRole());
}
