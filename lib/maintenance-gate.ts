import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMaintenance } from "@/lib/services/platform-settings-read";
import type { MaintenanceSetting } from "@/lib/services/platform-settings-shared";

/**
 * Maintenance gate. Called from the route-group layouts rather than from
 * middleware: the Better Auth session cookie is opaque at the edge (see the
 * comment in middleware.ts), so middleware can tell that *somebody* is signed
 * in but not whether they're an admin — and admin bypass is the whole point.
 *
 * Not applied to the (auth) group, /admin, /admlogin or /suspended. Sign-in has
 * to stay reachable so admins can get in, and regular users are deliberately
 * still allowed to authenticate: they keep a valid session and land straight in
 * the dashboard the moment maintenance is switched off, with no second login.
 */

export interface MaintenanceViewer {
  maintenance: MaintenanceSetting;
  /** True when maintenance is on AND this viewer is exempt (admin/allowlist). */
  bypassing: boolean;
}

/**
 * Resolve the setting plus whether the current viewer is exempt. Uses the REAL
 * session role, not the impersonated one — an admin impersonating a user must
 * not be able to lock themselves out of the console mid-maintenance.
 */
export async function resolveMaintenance(): Promise<MaintenanceViewer> {
  const maintenance = await getMaintenance();
  if (!maintenance.enabled) return { maintenance, bypassing: false };

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as { role?: string; email?: string } | undefined;
    const role = user?.role;
    if (role === "admin" || role === "super_admin") return { maintenance, bypassing: true };

    const email = user?.email?.trim().toLowerCase();
    if (email && maintenance.allowEmails.includes(email)) return { maintenance, bypassing: true };
  } catch {
    // Can't establish who this is → treat as a regular visitor and gate them.
  }
  return { maintenance, bypassing: false };
}

/**
 * Redirect to /maintenance unless the viewer is exempt. Call at the top of a
 * layout's server component body. Returns the resolved state so the caller can
 * render the admin "maintenance is ON" banner without a second lookup.
 */
export async function enforceMaintenance(): Promise<MaintenanceViewer> {
  const state = await resolveMaintenance();
  if (state.maintenance.enabled && !state.bypassing) redirect("/maintenance");
  return state;
}

/** Thrown by `assertNotFrozen`. Named so callers can tell it apart from auth failures. */
export class MaintenanceFrozenError extends Error {
  constructor() {
    super("The platform is in maintenance mode and is not accepting changes right now.");
    this.name = "MaintenanceFrozenError";
  }
}

/**
 * The actual freeze, as opposed to the redirect above, which only hides pages.
 *
 * Redirecting a layout stops someone *seeing* the app; it does nothing to stop
 * them *using* it. Server actions and route handlers are plain HTTP endpoints —
 * a signed-in non-admin with a stale tab, a queued offline mutation, or a
 * half-finished multi-step form can still post to them while the curtain is
 * down. During a user migration that is exactly what must not happen: rows
 * written after the legacy export is taken are silently lost when the import
 * lands on top of them.
 *
 * Called from `requireUserId`, which every authenticated action funnels
 * through, so the freeze covers all of them without touching 200-odd call
 * sites. Admins pass, since they are the ones running the migration.
 *
 * Costs one cached lookup when maintenance is off — `resolveMaintenance`
 * returns before reading the session in that case, which is the common path.
 */
export async function assertNotFrozen(): Promise<void> {
  const { maintenance, bypassing } = await resolveMaintenance();
  if (maintenance.enabled && !bypassing) throw new MaintenanceFrozenError();
}

/**
 * Route-handler form of the freeze.
 *
 * API routes resolve their caller with `getCurrentUserId()`, which returns null
 * rather than throwing, so they never passed through `requireUserId` and the
 * freeze did not reach them — during a migration, `POST /api/helm/documents`
 * would happily keep writing rows. Route handlers answer with a status rather
 * than an exception, so this returns a 503 to send back, or null to continue.
 */
export async function frozenResponse(): Promise<Response | null> {
  const { maintenance, bypassing } = await resolveMaintenance();
  if (!maintenance.enabled || bypassing) return null;
  return Response.json(
    { error: "The platform is in maintenance mode and is not accepting changes right now." },
    { status: 503, headers: { "Retry-After": "3600" } },
  );
}
