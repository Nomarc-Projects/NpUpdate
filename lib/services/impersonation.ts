"use server";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/authz";
import { setImpersonationCookie, clearImpersonationCookie, getImpersonatedUserId } from "@/lib/impersonation";

/** The signed-in admin (either tier), or null. Used by the read/stop paths, which
 *  must keep working for whoever already holds a session. */
async function realAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { id: string; role?: string } | undefined;
  if (!u || !isAdminRole(u.role)) return null;
  return u;
}

export type ImpersonationState = { impersonating: boolean; target?: { id: string; name: string; email: string; role: string; plan: string } };

/**
 * Begin acting as another user. **Admin tier only**, and a reason is required.
 *
 * This is the most powerful capability in the console: it grants the
 * caller the target's full session, including their messages, documents,
 * payment history and the ability to act irreversibly as them. Only admin-tier
 * accounts (`admin` or `super_admin`) may start one.
 *
 * Impersonating another admin is refused outright: it would be a route around
 * every admin gate (impersonate an admin, then release a campaign or
 * grant yourself privilege as them, with the audit trail pointing at them).
 */
export async function startImpersonation(targetUserId: string, reason: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { id: string; role?: string } | undefined;
  if (!u || !isAdminRole(u.role)) throw new Error("Forbidden — only admins can impersonate a user");
  if (targetUserId === u.id) throw new Error("You can't impersonate yourself");

  const why = reason.trim();
  // A free-text reason is what turns the audit row from "this happened" into
  // "this happened, and here is what it was for".
  if (why.length < 10) throw new Error("Give a reason for this impersonation (at least 10 characters).");
  if (why.length > 300) throw new Error("Keep the reason under 300 characters.");

  const res = await db.execute(sql`SELECT id, role FROM "user" WHERE id = ${targetUserId} LIMIT 1`);
  const target = (res.rows as { id: string; role?: string }[])[0];
  if (!target) throw new Error("User not found");
  if (isAdminRole(target.role)) throw new Error("You can't impersonate another admin.");

  await setImpersonationCookie(targetUserId, u.id);
  await db.execute(sql`
    INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
    VALUES (${u.id}, 'impersonate_start', 'user', ${targetUserId}, ${why})
  `);
}

export async function stopImpersonation() {
  // Anyone holding the cookie can stop — it's bound to a single admin anyway.
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { id: string; role?: string } | undefined;
  const target = await getImpersonatedUserId(u);
  await clearImpersonationCookie();
  if (u && target) {
    await db.execute(sql`INSERT INTO audit_log (actor_user_id, action, target_type, target_id) VALUES (${u.id}, 'impersonate_stop', 'user', ${target})`);
  }
}

export async function getImpersonationState(): Promise<ImpersonationState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { id: string; role?: string } | undefined;
  const targetId = await getImpersonatedUserId(u);
  if (!targetId) return { impersonating: false };
  const res = await db.execute(sql`SELECT id, name, email, COALESCE(role,'professional') AS role, COALESCE(plan,'free') AS plan FROM "user" WHERE id = ${targetId} LIMIT 1`);
  const t = (res.rows as Record<string, unknown>[])[0];
  if (!t) return { impersonating: false };
  return { impersonating: true, target: { id: String(t.id), name: String(t.name ?? ""), email: String(t.email ?? ""), role: String(t.role), plan: String(t.plan) } };
}
