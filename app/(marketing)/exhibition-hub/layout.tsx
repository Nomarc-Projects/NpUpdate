import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";
import { getExhibitionHub } from "@/lib/services/platform-settings-read";

/**
 * Exhibition Hub availability.
 *
 * Controlled by the super-admin "Exhibition Hub" toggle (a DB-backed setting):
 *   - ON  → open to everyone.
 *   - OFF → non-admins see the Coming Soon screen; admins always get through.
 *
 * Gated in a layout rather than per page so the whole subtree is covered by one
 * check — browse, product detail, compare, cart and the three checkout steps.
 * Gating only the index would leave the commerce routes reachable by direct
 * URL, which is the part that actually takes money.
 *
 * Not in middleware, for the same reason the maintenance gate isn't: the Better
 * Auth session cookie is opaque at the edge, so role is unreadable there and
 * admin bypass is the whole point (see lib/maintenance-gate.ts).
 *
 * Uses the REAL session role, so an admin impersonating a user sees what that
 * user sees rather than bypassing on the impersonator's behalf.
 */
export const dynamic = "force-dynamic";

export default async function ExhibitionHubLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  // Require login — the Exhibition Hub marketplace is for signed-in users only.
  if (!session?.user) {
    const pathname = h.get("x-nm-pathname") || "/exhibition-hub";
    redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  const role = (session.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "super_admin";

  // Fail open to CLOSED: if the setting can't be read, the hub stays locked
  // rather than accidentally going public.
  const { enabled } = await getExhibitionHub();
  const openToPublic = enabled || isAdmin;

  if (!openToPublic) {
    return (
      <ComingSoon
        headline="The Exhibition Hub is almost ready"
        message="We're putting the finishing touches to the marketplace — verified suppliers, product catalogues and direct quote requests, all in one place. It opens to everyone shortly."
        primaryHref="/"
        primaryLabel="Back to home"
      />
    );
  }

  return <>{children}</>;
}
