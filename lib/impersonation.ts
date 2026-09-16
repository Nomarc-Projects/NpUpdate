import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { isAdminRole } from "@/lib/authz";

const COOKIE = "nm-impersonate";

/** No fallback. A hardcoded default here meant that if every secret env var
 *  were missing, the impersonation cookie's HMAC key would be a value published
 *  in this repository — forgeable by anyone reading it. Failing closed is the
 *  only safe behaviour for a signing key. */
function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set — refusing to sign an impersonation cookie.");
  return s;
}

// Signature binds the target to the impersonating admin, so the cookie can't be
// tampered with or reused by another account.
function sign(targetId: string, adminId: string) {
  return crypto.createHmac("sha256", secret()).update(`${targetId}.${adminId}`).digest("hex");
}

export async function setImpersonationCookie(targetId: string, adminId: string) {
  const c = await cookies();
  c.set(COOKIE, `${targetId}.${sign(targetId, adminId)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 4,
  });
}

export async function clearImpersonationCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

/** The impersonated target user id, only if a valid cookie exists for this admin. */
export async function getImpersonatedUserId(realUser: { id: string; role?: string } | undefined | null): Promise<string | null> {
  // Any admin tier, matching startImpersonation. Previously super_admin only —
  // a plain admin demoted from super_admin kept working, blocking every other
  // way to read a held cookie. Now both admin tiers share the capability.
  if (!realUser || !isAdminRole(realUser.role)) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 0) return null;
  const targetId = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  if (!targetId || targetId === realUser.id) return null;
  // timingSafeEqual THROWS on a length mismatch, so a stale or truncated cookie
  // (an old secret, a hand-edited value) would take down every page that asks
  // who's being impersonated — treat any malformed cookie as "not impersonating".
  const expected = Buffer.from(sign(targetId, realUser.id));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return null;
  return crypto.timingSafeEqual(expected, actual) ? targetId : null;
}
