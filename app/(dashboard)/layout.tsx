import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getImpersonatedUserId } from "@/lib/impersonation";
import { getViewer } from "@/lib/viewer-server";
import { enforceMaintenance } from "@/lib/maintenance-gate";
import { RoleProvider } from "@/lib/roles-context";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { MessagesFab } from "@/components/dashboard/messages-fab";
import { DashTopBar } from "@/components/dashboard/dash-top-bar";
import { SessionHydrator } from "@/components/session-hydrator";
import { PresenceHeartbeat } from "@/components/dashboard/presence-heartbeat";
import { TourProvider } from "@/components/tour/tour-provider";
import { getUnreadNotificationCount } from "@/lib/services/notifications";
import { getExhibitionHub } from "@/lib/services/platform-settings-read";

// Dashboard is authenticated + session-driven — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  // A throw HERE is not catchable by (dashboard)/error.tsx — error boundaries
  // wrap a segment's children, not its own layout — so it escaped to Next's bare
  // default error page instead of the styled one. A session lookup that fails is
  // treated as no session, which falls into the sign-in redirect below.
  const session = await auth.api.getSession({ headers: h }).catch(() => null);

  // The middleware guard is a cookie-*presence* check at the edge; it can't
  // tell a live session from an expired or revoked one. Without this, a stale
  // cookie walked straight past it and every page's `requireUserId()` threw
  // "Unauthorized" into the error boundary — a "Something went wrong" screen
  // where the honest answer is "your session ended, sign in again".
  if (!session?.user) {
    const from = h.get("x-nm-pathname") || "/dashboard";
    redirect(`/login?redirect=${encodeURIComponent(from)}`);
  }

  // Suspended accounts are bounced out of the app (sessions are also deleted on ban).
  if ((session.user as { banned?: boolean }).banned) redirect("/suspended");

  // Maintenance mode: non-admins are held at /maintenance. Their session stays
  // valid on purpose, so when the toggle goes off they land here without having
  // to sign in again. Admins fall through to the /admin redirect below.
  await enforceMaintenance();

  // Admins belong in the admin console, not the professional/exhibitor dashboard
  // shell. Bouncing them at the dashboard *root* avoids a flash of the wrong
  // homepage, but member sub-pages (find-professionals, directory, people, …)
  // stay reachable so admins can browse the app a regular user would. Skipped
  // while impersonating (getImpersonatedUserId already requires the real user
  // to be an admin, so presence of the cookie is enough).
  const rawRole = (session.user as { role?: string }).role;
  const isRealAdmin = rawRole === "admin" || rawRole === "super_admin";
  const requestedPath = h.get("x-nm-pathname") || "/dashboard";
  if (isRealAdmin && requestedPath === "/dashboard" && !(await getImpersonatedUserId(session.user as { id: string; role?: string }))) {
    redirect("/admin");
  }

  // Email-verification gate. A fresh signup can hold a live session before the
  // OTP is confirmed (`requireEmailVerification` is off so invited/imported
  // accounts aren't locked out of sign-in itself), so an unverified user could
  // type /dashboard and walk the whole app. Every dashboard route funnels
  // through this layout, so this single check closes that hole. The verify
  // page is outside /dashboard and keeps the session, so there's no loop.
  // Deliberately after the admin redirect — elevated accounts are never held
  // out of the platform by this gate.
  if (!(session.user as { emailVerified?: boolean }).emailVerified) {
    const from = h.get("x-nm-pathname") || "/dashboard";
    const q = new URLSearchParams({ email: session.user.email ?? "", redirect: from });
    redirect(`/verify-email?${q.toString()}`);
  }

  // Viewer (impersonation-aware) drives the client role context + tour audience.
  // Tour audience === the active role (client/professional/exhibitor/employer/
  // admin/super_admin) so the welcome + tours adapt per intent.
  const viewer = await getViewer();
  // Real unread count — this badge used to be hardcoded to 3, so every account
  // (including brand-new ones) showed 3 phantom notifications.
  const unreadNotifications = await getUnreadNotificationCount().catch(() => 0);
  // The super-admin Exhibition Hub availability toggle controls whether the
  // Exhibition Hub nav entries are shown in the member dashboard. Off = hidden,
  // on = visible.
  const exhibitionEnabled = (await getExhibitionHub().catch(() => ({ enabled: false }))).enabled;

  return (
    <TourProvider audience={viewer.activeRole}>
      <RoleProvider heldRoles={Array.from(viewer.heldRoles)} activeRole={viewer.activeRole} plans={viewer.plans}>
        <div className="flex h-screen overflow-hidden bg-[#f9f9f9] dark:bg-[#161616]">
          <SessionHydrator />
          <PresenceHeartbeat />
          <DashboardSidebar exhibitionEnabled={exhibitionEnabled} />
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
            <div className="pt-14 lg:pt-0 pb-20 md:pb-0 max-w-full">
              <ImpersonationBanner />
              <DashTopBar notificationCount={unreadNotifications} />
              {children}
            </div>
          </main>
          <MessagesFab />
          <MobileBottomNav exhibitionEnabled={exhibitionEnabled} />
        </div>
      </RoleProvider>
    </TourProvider>
  );
}
