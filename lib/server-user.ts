import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getImpersonatedUserId } from "@/lib/impersonation";
import { assertNotFrozen } from "@/lib/maintenance-gate";

/**
 * Current effective user id. If an admin is impersonating someone (valid signed
 * cookie), returns the impersonated user's id so all data/actions act as them;
 * otherwise the real Better Auth session user. Server-only.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const real = session?.user as { id: string; role?: string; banned?: boolean } | undefined;
  // A suspended account is not a caller. Suspension is applied by
  // `setUserBanned`, which also deletes the user's sessions — but that is the
  // only path that does, and a ban applied any other way (direct SQL, a future
  // admin tool) would otherwise leave full access until the session expired.
  // Checking here covers every action and route that resolves a user.
  if (real?.banned) return null;
  const impersonated = await getImpersonatedUserId(real);
  return impersonated ?? real?.id ?? null;
}

/**
 * Same, but throws if not signed in — for mutations behind the dashboard guard.
 *
 * Also enforces the maintenance freeze. This is the single point every
 * authenticated server action and route handler funnels through, so putting the
 * check here covers all of them; the alternative was editing 200-odd call
 * sites, where the ones that got missed would be exactly the silent holes that
 * matter. Admins are exempt — they are the ones doing the maintenance.
 */
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new Error("Unauthorized");
  await assertNotFrozen();
  return id;
}
