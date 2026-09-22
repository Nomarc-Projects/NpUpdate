"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BarChart3, Users, ShieldCheck, Fingerprint, Building2, LogOut, X, Menu,
  ArrowLeft, Sun, Moon, PanelLeft, PanelLeftClose,
  ShoppingBag, Package, MessageSquare, Megaphone, Radio as CampaignIcon,
  UsersRound, Mail, Wrench, ScrollText, LineChart, CalendarDays, Store, CreditCard,
  Newspaper, Activity, Tags, Landmark, GalleryHorizontalEnd, Handshake,
  Smartphone, type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/theme";
import { Logo } from "@/components/ui/logo";
import { NomarcMark } from "@/components/ui/nomarc-mark";
import { useAuth } from "@/lib/store/auth";
import { signOut as authSignOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { animateThemeChange } from "@/lib/theme-transition";
import { HelmIcon } from "@/components/ui/helm-icon";
import { TourLauncher } from "@/components/tour/tour-launcher";

/** Lucide icons plus our own glyphs (HelmIcon), which take the same props. */
type NavIcon = LucideIcon | ((props: { className?: string; size?: number | string }) => React.ReactElement);
/** `superOnly` hides the entry from plain admins. The nav previously showed every
 *  destination to both tiers, so a plain admin could open a page and only discover
 *  at the point of action that it was not theirs. Hiding is cosmetic; the real
 *  enforcement is always the server-side gate. */
type Item = { label: string; href: string; icon: NavIcon; soon?: boolean; superOnly?: boolean };
type Group = { title?: string; items: Item[] };

// Redesign IA (images 111/113): slim nav — Dashboard, Support Inbox,
// Verifications, User Management, Marketplace & Catalog, Advertising, plus
// Helm (kept per direction, not in the redesign screens). Everything the
// old nav had beyond this (Finance, Disputes, Blog, Announcements, News
// ticker, Quiz mgmt, CRM, Broadcasts, Insights, Taxonomy, PM, Templates,
// Settings) is unlinked here — routes still exist (plans/PARKED-FEATURES.md).
const NAV: Group[] = [
  { items: [{ label: "Dashboard", href: "/admin", icon: BarChart3 }] },
  { items: [{ label: "Support Inbox", href: "/admin/support-inbox", icon: MessageSquare }] },
  { title: "Verifications", items: [
    { label: "Identity Checks", href: "/admin/verifications/identity", icon: Fingerprint },
    { label: "Corporate Checks", href: "/admin/verifications/corporate", icon: Building2 },
  ]},
  { title: "User Management", items: [
    // The combined table at /admin/users existed but was unlinked, so the only
    // way to see every account in one place — and the only place role, status,
    // KYC and plan sit side by side — was to know the URL.
    { label: "All Users", href: "/admin/users", icon: UsersRound },
    { label: "Professionals", href: "/admin/user-management/professionals", icon: Users },
    { label: "Exhibitors", href: "/admin/user-management/exhibitors", icon: ShieldCheck },
  ]},
  { title: "Marketplace & Catalog", items: [
    { label: "Job Board", href: "/admin/marketplace/jobs", icon: ShoppingBag },
    { label: "Exhibition Hub", href: "/admin/marketplace/products", icon: Package },
  ]},
  { title: "Content", items: [
    { label: "News Feed", href: "/admin/newsfeed", icon: Newspaper },
    { label: "News Ticker", href: "/admin/news-ticker", icon: Activity },
    { label: "Taxonomy", href: "/admin/taxonomy", icon: Tags },
  ]},
  { title: "Directory", items: [
    { label: "Institutions & Ministries", href: "/admin/directory", icon: Landmark },
  ]},
  { title: "Industry", items: [
    { label: "Events", href: "/admin/events", icon: CalendarDays },
  ]},
  { title: "Advertising & Promotions", items: [
    // The Promotions section's content lives here: the homepage/hub promoted
    // slots render whatever rows are active on the Ad Board, so this is the
    // admin control for that section.
    { label: "Ad Board", href: "/admin/adverts", icon: GalleryHorizontalEnd },
    { label: "Ad Reviews", href: "/admin/advertising/reviews", icon: Megaphone },
    { label: "Active Campaigns", href: "/admin/advertising/campaigns", icon: CampaignIcon },
    // Partnerships gate who can run promotions without the Key players plan;
    // the flag is toggled per user on the All Users console.
    { label: "Partners", href: "/admin/users", icon: Handshake },
  ]},
  { title: "Communications", items: [
    { label: "Send Email", href: "/admin/broadcasts", icon: Mail },
    { label: "Audience Segments", href: "/admin/audience-segments", icon: UsersRound },
    { label: "Email Campaigns", href: "/admin/email-campaigns", icon: Mail },
    { label: "Campaign Tracking", href: "/admin/campaigns", icon: LineChart },
  ]},
  { title: "AI", items: [
    { label: "Nomabot", href: "/admin/helm", icon: HelmIcon },
  ]},
  // Linked on its own rather than by un-parking /admin/settings, which stays
  // deliberately unlinked (plans/PARKED-FEATURES.md). A switch that takes the
  // public site down has to be findable without hunting.
  { title: "Platform", items: [
    // The audit log has existed at /admin/audit since it was built but was linked
    // from nowhere, so the one screen that answers "who did what, and when" was
    // reachable only by typing the URL.
    { label: "Audit Logs", href: "/admin/audit", icon: ScrollText },
  ]},
  // Both switches are super-admin only (see setMaintenance / setExhibitionHub):
  // nav hides them from plain admins, the server actions enforce it.
  { title: "Features", items: [
    // About page team section is super-admin only (see setAboutTeam).
    { label: "About Team Section", href: "/admin/platform/about-team", icon: Users, superOnly: true },
    // Homepage Key Players strip is super-admin only (see setKeyPlayers).
    { label: "Key Players Section", href: "/admin/platform/key-players", icon: Megaphone, superOnly: true },
    // Opening/locking the marketplace is super-admin only (see setExhibitionHub).
    { label: "Exhibition Hub Config", href: "/admin/platform/exhibition-hub", icon: Store, superOnly: true },
    // Hiding/showing the tools directory is super-admin only (see setTools).
    { label: "Tools Page Config", href: "/admin/platform/tools", icon: Wrench, superOnly: true },
    // Pausing/relaunching payment plans is super-admin only (see setPaymentPlans).
    { label: "Payment Plans", href: "/admin/platform/payment-plans", icon: CreditCard, superOnly: true },
    // Enabling/disabling PWA installability is super-admin only (see setPwa).
    { label: "PWA Config", href: "/admin/platform/pwa", icon: Smartphone, superOnly: true },
    // Taking the public site offline is super-admin only (see setMaintenance).
    { label: "Maintenance Page Config", href: "/admin/maintenance", icon: Wrench, superOnly: true },
  ]},
];

/** Drop super-admin-only entries, then any group left with nothing in it. */
function navFor(role: string | undefined): Group[] {
  if (role === "super_admin") return NAV;
  return NAV
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.superOnly) }))
    .filter((g) => g.items.length > 0);
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "AD";
}

function SegmentedTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  return (
    <div className="flex items-center bg-[#f0f0f0] dark:bg-white/5 rounded-full p-1 gap-1">
      <button type="button" onClick={(e) => animateThemeChange("light", setTheme, { x: e.clientX, y: e.clientY })} className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[13px] font-medium transition-all", !isDark ? "bg-white text-[#1e1e1e] shadow-sm" : "text-[#9a9a9a]")}>
        <Sun size={14} /> Light
      </button>
      <button type="button" onClick={(e) => animateThemeChange("dark", setTheme, { x: e.clientX, y: e.clientY })} className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[13px] font-medium transition-all", isDark ? "bg-[#1e1e1e] text-white shadow-sm ring-1 ring-white/10" : "text-[#9a9a9a]")}>
        <Moon size={14} /> Dark
      </button>
    </div>
  );
}

function NavLink({ item, collapsed, active, onNavigate }: { item: Item; collapsed: boolean; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-[#fff7cc] dark:bg-white/[0.08] text-[#1e1e1e] dark:text-white font-semibold"
          : "text-[#6b6b6b] dark:text-white/55 hover:bg-[#f7f7f7] dark:hover:bg-white/5 hover:text-[#1e1e1e] dark:hover:text-white",
      )}
    >
      <Icon size={18} className={cn("flex-shrink-0", active ? "text-[#1e1e1e] dark:text-[#ffd716]" : "")} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.soon && <span className="flex-shrink-0 text-[9px] font-bold text-[#8a7400] bg-[#ffd716]/20 px-1.5 py-0.5 rounded-full">Soon</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-[#1e1e1e] dark:bg-white px-2 py-1 text-[12px] font-medium text-white dark:text-[#1e1e1e] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg">
          {item.label}
        </span>
      )}
    </Link>
  );
}

function SidebarInner({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const name = user?.name || "Administrator";
  const email = user?.email || "admin@nomarc.test";
  const nav = navFor((user as { role?: string } | undefined)?.role);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  async function handleSignOut() {
    onNavigate?.();
    await authSignOut();
    router.push("/login");
  }

  return (
    <>
      <nav data-tour="sidebar-nav" className={cn("flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 space-y-5", collapsed && "[scrollbar-gutter:stable_both-edges]")}>
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.title && !collapsed && <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3]">{group.title}</p>}
            {group.title && collapsed && gi > 0 && <div className="mx-2 mb-3 border-t border-[#ececec] dark:border-white/10" />}
            {!group.title && gi > 0 && <div className={cn("mb-3 border-t border-[#ececec] dark:border-white/10", collapsed ? "mx-2" : "mx-3")} />}
            <div className="space-y-0.5">
              {group.items.map((item) => <NavLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} onNavigate={onNavigate} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* footer */}
      <div className="p-3 space-y-3 border-t border-[#ececec] dark:border-white/10">
        {/* Theme + tour also live in the admin top bar, which is desktop-only —
            keep them here for the mobile drawer, hide them where they'd double up. */}
        {!collapsed && (
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex-1"><SegmentedTheme /></div>
            <TourLauncher />
          </div>
        )}
        <Link href="/dashboard" onClick={onNavigate} title={collapsed ? "Exit to app" : undefined}
          className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors", collapsed && "justify-center px-0")}>
          <ArrowLeft size={16} className="flex-shrink-0" />{!collapsed && "Exit to app"}
        </Link>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-full bg-[#1e1e1e] dark:bg-white flex items-center justify-center text-white dark:text-[#1e1e1e] font-bold text-sm flex-shrink-0">{initials(name)}</div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{name}</p>
                <p className="text-[11px] text-[#9a9a9a] truncate">{email}</p>
              </div>
              <button onClick={handleSignOut} aria-label="Sign out" className="text-[#9a9a9a] hover:text-[#e5484d] transition-colors flex-shrink-0"><LogOut size={17} /></button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Admin badge shown beside the logo so the console is distinct from the app. */
function AdminChip() {
  return <span className="inline-flex items-center gap-1 rounded-md bg-[#1e1e1e] dark:bg-[#ffd716] text-[#ffd716] dark:text-[#1e1e1e] text-[10px] font-bold px-1.5 py-0.5"><ShieldCheck size={11} /> ADMIN</span>;
}

/** Full admin chrome: collapsible desktop sidebar + mobile top bar & drawer —
 *  mirrors the main DashboardSidebar so the admin console matches the app. */
export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const expanded = !collapsed || hovered;

  return (
    <>
      {/* desktop */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn("hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-white dark:bg-[#1e1e1e] border-r border-[#e5e5e5] dark:border-white/10 transition-[width] duration-300", expanded ? "w-[262px]" : "w-[76px]")}
      >
        {!expanded ? (
          <div className="px-3 pt-4 pb-2 space-y-0.5">
            <Link href="/" aria-label="Nomarc home" className="flex w-full items-center justify-center rounded-xl py-2.5 hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">
              <NomarcMark size={20} className="text-[#1e1e1e] dark:text-white" />
            </Link>
            <button onClick={() => setCollapsed(false)} className="flex w-full items-center justify-center rounded-xl py-2.5 text-[#9a9a9a] hover:bg-[#f7f7f7] dark:hover:bg-white/5 hover:text-[#1e1e1e] dark:hover:text-white transition-colors" aria-label="Pin sidebar open"><PanelLeft size={18} /></button>
          </div>
        ) : (
          /* px-6 so the wordmark's left edge lines up with the nav rows below
             (nav container px-3 + each row's own px-3 = 24px). */
          <div className="px-6 py-5 flex items-center justify-between">
<Link href="/" aria-label="Nomarc home" className="flex items-center gap-2"><Logo size="sm" className="text-[#1e1e1e] dark:text-white" /><AdminChip /></Link>
            <button onClick={() => { setCollapsed(true); setHovered(false); }} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors" aria-label="Collapse sidebar"><PanelLeftClose size={18} /></button>
          </div>
        )}
        <SidebarInner collapsed={!expanded} />
      </aside>

      {/* mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white dark:bg-[#1e1e1e] border-b border-[#e5e5e5] dark:border-white/10 flex items-center justify-between px-4">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="text-[#1e1e1e] dark:text-white"><Menu size={22} /></button>
        <Link href="/" aria-label="Nomarc home" className="flex items-center gap-2"><Logo size="sm" className="text-[#1e1e1e] dark:text-white" /><AdminChip /></Link>
        <span className="w-9" />
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="absolute left-0 top-0 h-full w-[280px] max-w-[85%] bg-white dark:bg-[#1e1e1e] flex flex-col shadow-2xl" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
              <div className="px-6 py-5 flex items-center justify-between">
                <Link href="/" onClick={() => setMobileOpen(false)} aria-label="Nomarc home" className="flex items-center gap-2"><Logo size="sm" className="text-[#1e1e1e] dark:text-white" /><AdminChip /></Link>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={20} /></button>
              </div>
              <SidebarInner collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/** @deprecated — chrome now lives in AdminSidebar (top bar + drawer included). */
export function AdminMobileNav() {
  return null;
}
