"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid, Search, MessageSquare, Briefcase, Bookmark,
  Upload, FileText, User, BookmarkCheck, PlusCircle,
  Settings, LifeBuoy, PanelLeftClose, PanelLeft, LogOut, Menu, X,
  Bell, Sun, Moon, Package, Store, ArrowUpRight, Plus, CreditCard, type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/theme";
import { animateThemeChange } from "@/lib/theme-transition";
import { NomarcAvatar } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { NomarcMark } from "@/components/ui/nomarc-mark";
import { useAuth } from "@/lib/store/auth";
import { signOut as authSignOut } from "@/lib/auth-client";
import { getUnreadCount } from "@/lib/services/messaging";
import { getUnreadNotificationCount } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";
import { useViewer } from "@/lib/use-viewer";
import { PLAN_LABEL, getNextPlan } from "@/lib/entitlements";

/** Lucide icons plus our own glyphs (e.g. HelmIcon), which take the same props. */
type NavIcon = LucideIcon | ((props: { className?: string; size?: number | string }) => React.ReactElement);
type Item = { label: string; href: string; icon: NavIcon; badge?: number; tour?: string };
/** A group whose `title` doubles as a link (e.g. Find Jobs → the job board). */
type Group = { title?: string; href?: string; items: Item[] };

const secondary: Group = {
  title: undefined,
  items: [
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
    { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  ],
};

/* The menu, exactly as specified: two top-level entries, then three titled
 * sections. Deliberately role-agnostic — every doorway is always visible, so
 * no role switch can ever hide a destination. Utility links (notifications,
 * settings, support) stay pinned at the bottom under a divider.
 */
const navGroups: Group[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard",          icon: LayoutGrid },
      { label: "Messages",  href: "/dashboard/messages", icon: MessageSquare },
    ],
  },
  { title: "Directory", items: [
    { label: "Directory",           href: "/dashboard/directory",          icon: User },
    { label: "Find professionals",  href: "/dashboard/find-professionals", icon: Search },
    { label: "Saved Profile",       href: "/dashboard/people/saved",       icon: BookmarkCheck },
  ]},
  { title: "Jobs", items: [
    { label: "Find Jobs",    href: "/dashboard/jobs",          icon: Search },
    { label: "Post Jobs",    href: "/dashboard/jobs/post",     icon: PlusCircle },
    { label: "Posted Jobs",  href: "/dashboard/jobs/posted",   icon: Briefcase },
    { label: "Draft",        href: "/dashboard/jobs/posted/drafts", icon: FileText },
    { label: "Applications", href: "/dashboard/applications",  icon: Upload },
    { label: "Saved jobs",   href: "/dashboard/jobs/saved",    icon: Bookmark },
  ]},
  { title: "Exhibition Hub", items: [
    { label: "View Product",     href: "/exhibition-hub",           icon: Package },
    { label: "Saved Product",    href: "/dashboard/products/saved", icon: Bookmark },
    { label: "Showcase Product", href: "/dashboard/my-products",    icon: Store },
  ]},
  { title: "Exhibitor", items: [
    { label: "Add Product",    href: "/dashboard/add-product",    icon: Plus },
    { label: "My Products",    href: "/dashboard/my-products",    icon: Package },
    { label: "Company Profile", href: "/dashboard/company",       icon: Store },
    { label: "Plans & Billing", href: "/dashboard/plans/exhibitor", icon: CreditCard },
  ]},
  secondary,
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "NM";
}

function UpgradeSidebar() {
  const viewer = useViewer();
  const nextPlan = getNextPlan(viewer.plan, viewer.role);
  if (!nextPlan) return null;

  return (
    <Link
      href="/dashboard/plans"
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0",
        "bg-[#ffd716]/15 text-[#caa400] hover:bg-[#ffd716]/25 border border-[#ffd716]/30"
      )}
    >
      <ArrowUpRight size={10} />
      Upgrade to {PLAN_LABEL[nextPlan]}
    </Link>
  );
}

function NavLink({ item, collapsed, active, onNavigate }: { item: Item; collapsed: boolean; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-tour={item.tour}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-[#fff7cc] dark:bg-white/[0.08] text-[#1e1e1e] dark:text-white font-semibold"
          : "text-[#6b6b6b] dark:text-white/55 hover:bg-[#f7f7f7] dark:hover:bg-white/5 hover:text-[#1e1e1e] dark:hover:text-white",
      )}
    >
      <span className="relative flex-shrink-0">
        <Icon size={18} className={active ? "text-[#1e1e1e] dark:text-[#ffd716]" : ""} />
        {item.badge && collapsed && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ef4444]" />}
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#ef4444] text-white text-[11px] font-bold flex items-center justify-center">{item.badge}</span>
      )}
      {/* collapsed tooltip */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-[#1e1e1e] dark:bg-white px-2 py-1 text-[12px] font-medium text-white dark:text-[#1e1e1e] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg">
          {item.label}
        </span>
      )}
    </Link>
  );
}

function SidebarInner({ collapsed, exhibitionEnabled, onNavigate }: { collapsed: boolean; exhibitionEnabled: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  // The super-admin Exhibition Hub availability toggle decides whether members
  // see the Exhibition Hub doorways. Off = withheld from the sidebar; on = shown.
  const nav = exhibitionEnabled ? navGroups : navGroups.filter((g) => g.title !== "Exhibition Hub");
  const name = user?.name || "My Account";
  const email = user?.email || "";
  // Only the single best (longest) prefix match is active, so e.g.
  // /dashboard/applications/drafts lights up Drafts only (not Submitted), and
  // /dashboard stays active only on the exact route. Group titles that are
  // themselves links (Find Jobs → /dashboard/jobs) compete too, but any deeper
  // item match outranks them because it is the longer prefix.
  const activeHref = nav
    .flatMap((g) => [...g.items.map((i) => i.href), ...(g.href ? [g.href] : [])])
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  // live unread counts → Messages + Notifications badges (polls)
  const [unread, setUnread] = useState(0);
  const [notif, setNotif] = useState(0);
  useEffect(() => {
    let alive = true;
    const tick = () => {
      getUnreadCount().then((n) => alive && setUnread(n)).catch(() => {});
      getUnreadNotificationCount().then((n) => alive && setNotif(n)).catch(() => {});
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [pathname]);
  const badgeFor = (href: string) =>
    href === "/dashboard/messages" && unread > 0 ? unread
    : href === "/dashboard/notifications" && notif > 0 ? notif
    : undefined;

  async function handleSignOut() {
    onNavigate?.();
    await authSignOut();
    router.push("/");
  }

  return (
    <>
      {/* search */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input className="w-full rounded-lg bg-[#f4f4f4] dark:bg-white/5 pl-9 pr-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:ring-2 focus:ring-[#ffd716]/40" placeholder="Search..." />
          </div>
        </div>
      )}

      <nav data-tour="sidebar-nav" className={cn("flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 space-y-5", collapsed && "[scrollbar-gutter:stable_both-edges]")}>
        {nav.map((group, gi) => (
          <div key={gi} className={cn(!collapsed && gi > 0 && group.href && "-mt-5")}>
            {group.title && !collapsed && (
              group.href ? (
                /* A linked title renders as a standard nav row — same height,
                   type and icon treatment as the items around it — so the
                   listing reads uniformly (Find Jobs sits between Applications
                   and Saved jobs looking exactly like them). */
                <Link href={group.href} className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 mb-0.5 text-sm transition-colors",
                  isActive(group.href)
                    ? "bg-[#fff7cc] dark:bg-white/[0.08] text-[#1e1e1e] dark:text-white font-semibold"
                    : "text-[#6b6b6b] dark:text-white/55 hover:bg-[#f7f7f7] dark:hover:bg-white/5 hover:text-[#1e1e1e] dark:hover:text-white",
                )}>
                  <span className="relative flex-shrink-0">
                    <Search size={18} className={isActive(group.href) ? "text-[#1e1e1e] dark:text-[#ffd716]" : ""} />
                  </span>
                  <span className="flex-1 truncate">{group.title}</span>
                </Link>
              ) : (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3]">{group.title}</p>
              )
            )}
            {!group.title && gi > 0 && <div className={cn("mb-3 border-t border-[#ececec] dark:border-white/10", collapsed ? "mx-2" : "mx-3")} />}
            {group.title && collapsed && gi > 0 && <div className="mx-2 mb-3 border-t border-[#ececec] dark:border-white/10" />}
            <div className="space-y-0.5">
              {group.items.map((item) => <NavLink key={item.href} item={{ ...item, badge: badgeFor(item.href) ?? item.badge }} collapsed={collapsed} active={isActive(item.href)} onNavigate={onNavigate} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* footer */}
      <div className="p-3 border-t border-[#ececec] dark:border-white/10">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-sm flex-shrink-0">{initials(name)}</div>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{name}</p>
                <p className="text-[11px] text-[#9a9a9a] truncate">{email}</p>
              </div>
              <UpgradeSidebar />
              <button onClick={handleSignOut} aria-label="Log out" className="text-[#9a9a9a] hover:text-[#e5484d] transition-colors flex-shrink-0"><LogOut size={17} /></button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function DashboardSidebar({ exhibitionEnabled }: { exhibitionEnabled: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const mobileUser = useAuth((s) => s.user);
  function toggleTheme(e?: React.MouseEvent) {
    const next = theme === "dark" ? "light" : "dark";
    const origin = e ? { x: e.clientX, y: e.clientY } : undefined;
    animateThemeChange(next as "light" | "dark", setTheme, origin);
  }
  // When collapsed, hovering temporarily expands the rail (as a floating
  // overlay, so the page content never reflows). Clicking the toggle pins it.
  const expanded = !collapsed || hovered;

  return (
    <>
      {/* desktop — in-flow: collapse/expand/hover reflow the page (never overlaps page content like filter sidebars) */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn("hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-white dark:bg-[#1e1e1e] border-r border-[#e5e5e5] dark:border-white/10 transition-[width] duration-300", expanded ? "w-[262px]" : "w-[76px]")}
      >
        {!expanded ? (
          /* Collapsed rail — rows mirror NavLink exactly (px-3 container,
             full-width justify-center, py-2.5) so the logo + toggle sit on the
             same vertical axis as every nav icon below. */
          <div className="px-3 pt-4 pb-2 space-y-0.5">
            <Link href="/" aria-label="Nomarc home" className="flex w-full items-center justify-center rounded-xl py-2.5 hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">
              <NomarcMark size={20} className="text-[#1e1e1e] dark:text-white" />
            </Link>
            <button onClick={() => setCollapsed(false)} className="flex w-full items-center justify-center rounded-xl py-2.5 text-[#9a9a9a] hover:bg-[#f7f7f7] dark:hover:bg-white/5 hover:text-[#1e1e1e] dark:hover:text-white transition-colors" aria-label="Pin sidebar open"><PanelLeft size={18} /></button>
          </div>
        ) : (
          <div className="px-4 py-5 flex items-center justify-between">
            <Link href="/" aria-label="Nomarc home"><Logo size="sm" className="text-[#1e1e1e] dark:text-white" /></Link>
            <button onClick={() => { if (collapsed) { setCollapsed(false); } else { setCollapsed(true); setHovered(false); } }} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors" aria-label={collapsed ? "Pin sidebar open" : "Collapse sidebar"}>{collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}</button>
          </div>
        )}
        <SidebarInner collapsed={!expanded} exhibitionEnabled={exhibitionEnabled} />
      </aside>

      {/* mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white dark:bg-[#1e1e1e] border-b border-[#e5e5e5] dark:border-white/10 flex items-center justify-between px-4">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="text-[#1e1e1e] dark:text-white"><Menu size={22} /></button>
        <Link href="/" aria-label="Nomarc home"><Logo size="sm" className="text-[#1e1e1e] dark:text-white" /></Link>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => toggleTheme(e)}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
          >
            <Sun size={16} className="dark:hidden" />
            <Moon size={16} className="hidden dark:block" />
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-full"
            aria-label="Open profile menu"
          >
            <NomarcAvatar
              src={mobileUser?.avatar}
              name={mobileUser?.name ?? "Me"}
              size="sm"
              className="ring-2 ring-[#ffd716]/50 ring-offset-1 ring-offset-white dark:ring-offset-[#1e1e1e]"
            />
          </button>
        </div>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="absolute left-0 top-0 h-full w-[280px] max-w-[85%] bg-white dark:bg-[#1e1e1e] flex flex-col shadow-2xl" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
              <div className="px-4 py-5 flex items-center justify-between">
                <Link href="/" onClick={() => setMobileOpen(false)} aria-label="Nomarc home"><Logo size="sm" className="text-[#1e1e1e] dark:text-white" /></Link>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={20} /></button>
              </div>
              <SidebarInner collapsed={false} exhibitionEnabled={exhibitionEnabled} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
