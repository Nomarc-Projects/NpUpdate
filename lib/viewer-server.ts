import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { getImpersonatedUserId } from "@/lib/impersonation";
import { normalizeViewer, type Viewer } from "@/lib/entitlements";
import { getHeldRoles, getActiveRole } from "@/lib/roles-internal";

/**
 * The current viewer (auth state + role + plan + held roles). Reflects
 * impersonation. Resilient: any session/DB hiccup resolves to a signed-out
 * viewer rather than throwing, so a gated page shows its upgrade/locked
 * screen instead of a 500.
 */
export async function getViewer(): Promise<Viewer> {
  // Apply any downgrade whose paid term has elapsed before resolving
  // entitlements — otherwise a lapsed subscriber keeps their old tier until
  // something else happens to touch the row.
  try {
    const { sweepExpiredPlans } = await import("@/lib/services/roles");
    await sweepExpiredPlans();
  } catch { /* never block the viewer on the sweep */ }
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const real = session?.user as { id: string; role?: string; plan?: string } | undefined;
    const impersonated = await getImpersonatedUserId(real);
    if (impersonated) {
      const res = await db.execute(sql`SELECT role, plan, active_role FROM "user" WHERE id = ${impersonated} LIMIT 1`);
      const t = (res.rows as { role?: string; plan?: string; active_role?: string | null }[])[0];
      const heldRoles = await getHeldRoles(impersonated).catch(() => []);
      return normalizeViewer({ signedIn: true, role: t?.role, plan: t?.plan, heldRoles, activeRole: t?.active_role });
    }
    const heldRoles = real ? await getHeldRoles(real.id).catch(() => []) : [];
    const activeRole = real ? await getActiveRole(real.id).catch(() => null) : null;
    return normalizeViewer({ signedIn: !!session, role: real?.role, plan: real?.plan, heldRoles, activeRole });
  } catch {
    return normalizeViewer({ signedIn: false });
  }
}
