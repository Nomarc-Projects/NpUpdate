import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";
import { getTools } from "@/lib/services/platform-settings-read";

/**
 * Tools page availability.
 *
 * Controlled by the super-admin "Tools Page" toggle (a DB-backed setting):
 *   - ON  → open to everyone.
 *   - OFF → non-admins see the Coming Soon screen; admins always get through.
 *
 * Gated in a layout so the whole subtree (grid, hero, anything added later)
 * is covered by one check rather than per page.
 *
 * Same fail-open-to-CLOSED posture as the Exhibition Hub gate: if the setting
 * can't be read, the page stays locked rather than accidentally going public.
 * Uses the REAL session role, so an admin impersonating a user sees what that
 * user sees rather than bypassing on the impersonator's behalf.
 */
export const dynamic = "force-dynamic";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "super_admin";

  const { enabled } = await getTools();
  const openToPublic = enabled || isAdmin;

  if (!openToPublic) {
    return (
      <ComingSoon
        headline="The Tools page is almost ready"
        message="We're putting the finishing touches on comprehensive tools for the construction industry — everything you need to manage projects, grow your career and stay connected. It opens to everyone shortly."
        primaryHref="/"
        primaryLabel="Back to home"
      />
    );
  }

  return <>{children}</>;
}