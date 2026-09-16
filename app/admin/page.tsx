import { headers } from "next/headers";
import Link from "next/link";
import { Users, ShieldCheck, Megaphone, MessageSquare, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAdminStats, getAdmins, getAdminWeeklyImpact, getAdminUpcoming, getAuditLog, type AdminStats } from "@/lib/services/admin";
import { KpiTileRow, ActivityFeed, type Stat, type ActivityItem } from "@/components/dashboard/kit";
import { InviteAdminButton } from "@/components/admin/invite-admin-button";
import { AdminAvatar } from "@/components/admin/admin-avatar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

const EMPTY_STATS: AdminStats = {
  totalUsers: 0, professionals: 0, exhibitors: 0, buyers: 0, admins: 0,
  jobs: 0, products: 0, applications: 0, quotes: 0,
  pendingRecommendations: 0, openReports: 0, unverified: 0,
  totalOrders: 0, totalRevenue: 0, totalCommission: 0,
  pendingOrders: 0, completedOrders: 0,
  newSignupsThisMonth: 0, newSignupsChangePct: 0,
  pendingTier1: 0, pendingTier2: 0,
  pendingAdReviews: 0, pendingAdProfiles: 0, pendingAdProducts: 0,
  activeProfessionals: 0, activeExhibitors: 0,
  activeJobListings: 0, liveCatalogProducts: 0, activeAdCampaigns: 0,
};

export default async function AdminOverviewPage() {
  // getAdminStats runs ~20 queries across most of the schema — a single stale
  // column/table shouldn't 500 the whole console when every other query below
  // already degrades gracefully via .catch().
  const [session, s] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getAdminStats().catch(() => EMPTY_STATS),
  ]);
  const user = session?.user as { name?: string; role?: string } | undefined;
  const isSuperAdmin = user?.role === "super_admin";
  const [admins, weekly, upcoming, audit] = await Promise.all([
    isSuperAdmin ? getAdmins().catch(() => []) : Promise.resolve([]),
    isSuperAdmin ? Promise.resolve(null) : getAdminWeeklyImpact().catch(() => null),
    getAdminUpcoming().catch(() => []),
    getAuditLog().catch(() => []),
  ]);
  const adminName = user?.name || "Admin";

  const stats: Stat[] = [
    { label: "Total Users", value: s.totalUsers, hint: `${s.professionals} professionals · ${s.exhibitors} exhibitors`, href: "/admin/users" },
    { label: "New Signups", value: s.newSignupsThisMonth, hint: `${s.newSignupsChangePct >= 0 ? "+" : ""}${s.newSignupsChangePct}% vs last month`, positive: s.newSignupsChangePct >= 0 },
    { label: "Pending Verifications", value: s.pendingTier1 + s.pendingTier2, hint: `${s.pendingTier1} Tier 1 · ${s.pendingTier2} Tier 2` },
    { label: "Pending Ad Reviews", value: s.pendingAdReviews, hint: `${s.pendingAdProfiles} Profiles, ${s.pendingAdProducts} Products` },
    { label: "Open Disputes", value: s.openReports, hint: s.openReports > 0 ? `${s.openReports} urgent report${s.openReports === 1 ? "" : "s"}` : "All clear" },
  ];

  const priority = [
    s.pendingTier1 + s.pendingTier2 > 0 && { label: `${s.pendingTier1 + s.pendingTier2} verification${s.pendingTier1 + s.pendingTier2 === 1 ? "" : "s"} awaiting review`, reason: "In the verification queue", href: "/admin/verifications/identity", icon: ShieldCheck },
    s.pendingAdReviews > 0 && { label: `${s.pendingAdReviews} ad${s.pendingAdReviews === 1 ? "" : "s"} pending review`, reason: "Awaiting review", href: "/admin/advertising/reviews", icon: Megaphone },
    s.openReports > 0 && { label: `${s.openReports} open report${s.openReports === 1 ? "" : "s"}`, reason: "Needs attention", href: "/admin/support-inbox", icon: MessageSquare },
  ].filter(Boolean) as { label: string; reason: string; href: string; icon: typeof ShieldCheck }[];

  // The audit `detail` column holds JSON for machine-written events, and dumping
  // it raw put `{"ip":"105.113.21.45","userAgent":"Mozilla/5.0 (Windows NT 10.0…"}`
  // across three lines of every "session created" row: unreadable, and it put
  // full user-agent strings on screen for no benefit. Summarise instead, and let
  // the audit page show the whole record for anyone who needs it.
  function summarizeAuditDetail(raw: string | null | undefined): string {
    if (!raw) return "";
    const text = raw.trim();
    if (!text.startsWith("{")) return text.length > 80 ? `${text.slice(0, 80)}…` : text;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const ip = typeof parsed.ip === "string" ? parsed.ip : "";
      if (ip) return `from ${ip}`;
      // Any other object: show its keys rather than its contents, so the row
      // stays one line and nothing sensitive is surfaced by accident.
      const keys = Object.keys(parsed);
      return keys.length ? keys.slice(0, 3).join(", ") : "";
    } catch {
      return text.length > 80 ? `${text.slice(0, 80)}…` : text;
    }
  }

  // `iconName`, not `icon`: this is a Server Component and ActivityFeed is a
  // client one, so a component reference cannot cross the boundary. Passing the
  // function threw "Functions cannot be passed directly to Client Components"
  // and blanked the whole overview the moment the audit log had its first row.
  const recent: ActivityItem[] = audit.slice(0, 6).map((a) => {
    const action = a.action ?? "";
    const detail = summarizeAuditDetail(a.detail);
    return {
      id: a.id,
      iconName: /verify|kyc/.test(action) ? "shield" : /promo|ad|maintenance/.test(action) ? "megaphone" : "users",
      text: <><span className="font-semibold text-[#1e1e1e] dark:text-white">{a.actor}</span> {action.replace(/_/g, " ")}{detail ? <span className="text-[#9a9a9a]"> · {detail}</span> : null}</>,
      meta: a.date,
    } satisfies ActivityItem;
  });
  const upcomingItems: ActivityItem[] = upcoming.map((u) => ({ id: u.id, text: u.title, meta: u.when }));

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title={`Welcome back, ${adminName}`} subtitle="Here is the current pulse of the Nomarc ecosystem" />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full flex-shrink-0 lg:w-[320px]">
          <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e1e1e] text-[15px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]">
              {adminName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <h2 className="mt-3 text-[16px] font-bold text-[#1e1e1e] dark:text-white">{adminName}</h2>
            <p className="text-[13px] text-[#6b6b6b] dark:text-white/60">{isSuperAdmin ? "Super Administrator" : "System Administrator"}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#1a7f43]"><span className="h-1.5 w-1.5 rounded-full bg-[#1a7f43]" /> System Status • Online</p>

            {isSuperAdmin ? (
              <div className="mt-5">
                <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">
                  Admins {admins.length > 0 && <span className="font-medium text-[#9a9a9a]">({admins.length})</span>}
                </h3>
                {/* Avatars rather than a stacked name list: this is a roster, not
                    a directory, and a full-width row per admin pushed the rest of
                    the sidebar down for information that is the same every time.
                    Name, role and email live in the hover card. */}
                {admins.length === 0 ? (
                  <p className="text-[12.5px] text-[#9a9a9a]">Just you, so far.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {admins.map((a) => (
                      <AdminAvatar key={a.id} name={a.name} email={a.email} role={a.role} />
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <InviteAdminButton />
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Weekly Impact</h3>
                {/* Was a list of "Label • value" lines, where the number was the
                    thing you wanted and the label got equal weight. StatTile
                    leads with the figure; two per row keeps the sidebar narrow. */}
                <KpiTileRow
                  className="mt-2.5"
                  stats={[
                    { label: "Tasks Completed", value: weekly?.tasksCompleted ?? 0 },
                    { label: "Avg Resolution", value: weekly?.avgResolutionMins ? `${weekly.avgResolutionMins}m` : "—" },
                  ]}
                />
              </div>
            )}

            <div className="mt-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Network at a glance</h3>
              <KpiTileRow
                className="mt-2.5"
                stats={[
                  { label: "Professionals", value: s.activeProfessionals, hint: "Active" },
                  { label: "Exhibitors", value: s.activeExhibitors, hint: "Active" },
                ]}
              />
            </div>

            <div className="mt-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Marketplace at a glance</h3>
              <KpiTileRow
                className="mt-2.5"
                stats={[
                  { label: "Job Listings", value: s.activeJobListings, hint: "Active" },
                  { label: "Catalog Products", value: s.liveCatalogProducts, hint: "Live" },
                  { label: "Ad Campaigns", value: s.activeAdCampaigns, hint: "Active" },
                ]}
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <KpiTileRow stats={stats} />

          {priority.length > 0 && (
            <div className="rounded-2xl border border-[#ffd716]/40 bg-[#fffdf2] p-5 dark:border-[#ffd716]/20 dark:bg-[#ffd716]/[0.04]">
              <h3 className="text-[14px] font-bold text-[#caa400]">Priority</h3>
              <div className="mt-3 space-y-2">
                {priority.map((p) => (
                  <Link key={p.label} href={p.href} className="flex items-center justify-between gap-3 rounded-xl border border-[#ececec] bg-white p-3.5 transition-colors hover:border-[#ffd716] dark:border-white/10 dark:bg-[#1e1e1e]">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#1e1e1e] dark:bg-white/5 dark:text-white"><p.icon size={16} /></span>
                      <span className="truncate text-[13.5px] font-medium text-[#1e1e1e] dark:text-white">{p.label}</span>
                    </span>
                    <span className="flex-shrink-0 text-[12px] text-[#9a9a9a]">{p.reason}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ActivityFeed recent={recent} upcoming={upcomingItems} title="Activity" viewMoreHref="/admin/audit" viewMoreLabel="View all activity" />
        </div>
      </div>
    </div>
  );
}
