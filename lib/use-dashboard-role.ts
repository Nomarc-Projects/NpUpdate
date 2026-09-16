"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useViewer } from "@/lib/use-viewer";
import { useRoles } from "@/lib/roles-context";

export type Role = "professional" | "exhibitor" | "employer";

/**
 * The authenticated user's dashboard role. Drives which sidebar nav is shown
 * and which home the dashboard renders. Follows the active role from the role
 * switcher when present, else the viewer's role. Reflects impersonation.
 *
 * Employer is its own role rather than folding into professional: an employer
 * has no portfolio and no catalog, so the professional shell offered them Saved
 * jobs, Applications and the Exhibition Hub — none of which they can use. Every
 * other role still resolves to professional, which is the general-user shell.
 */
export function useDashboardRole(): Role {
  const roles = useRoles();
  const { role } = useViewer();
  const active = roles?.activeRole ?? role;
  if (active === "exhibitor") return "exhibitor";
  if (active === "employer") return "employer";
  return "professional";
}

/**
 * Client guard: redirect to /dashboard if the user's role isn't allowed on this
 * page. Waits for the session to load before deciding (avoids false redirects).
 * Returns `true` while still loading/allowed so callers can render normally.
 */
export function useRequireRole(allowed: Role | Role[]) {
  const router = useRouter();
  const { data, isPending } = useSession();
  const role = useDashboardRole();
  const ok = (Array.isArray(allowed) ? allowed : [allowed]).includes(role);
  useEffect(() => {
    if (isPending || !data) return; // session still loading
    if (!ok) router.replace("/dashboard");
  }, [isPending, data, ok, router]);
  return !data || isPending || ok;
}
