"use client";

import { useSession } from "@/lib/auth-client";
import { useImpersonation } from "@/lib/impersonation-context";
import { useRoles } from "@/lib/roles-context";
import { normalizeViewer, type Viewer } from "@/lib/entitlements";

/** The current viewer (auth state + role + plan + held/active roles). Reflects
 *  impersonation so the whole client UI behaves as the impersonated user while
 *  an admin is acting. Inside the dashboard, held roles + the active role come
 *  from the RoleProvider (server-sourced), giving client/server parity. */
export function useViewer(): Viewer {
  const { data } = useSession();
  const imp = useImpersonation();
  const roles = useRoles();
  if (imp.impersonating && imp.target) {
    return normalizeViewer({ signedIn: true, role: imp.target.role, plan: imp.target.plan });
  }
  const u = data?.user as { role?: string; plan?: string } | undefined;
  if (roles) {
    return normalizeViewer({
      signedIn: !!data,
      role: u?.role,
      plan: u?.plan,
      heldRoles: roles.heldRoles.map((r) => ({ role: r, plan: roles.plans[r] })),
      activeRole: roles.activeRole,
    });
  }
  return normalizeViewer({ signedIn: !!data, role: u?.role, plan: u?.plan });
}
