"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShieldCheck, MessageSquare, LogOut, ChevronDown, LayoutGrid, ArrowLeft,
  Fingerprint, Building2, Users, ShoppingBag, Package, Megaphone, Radio, UsersRound, Mail, LineChart,
  type LucideIcon,
} from "lucide-react";
import { useSession, signOut as authSignOut } from "@/lib/auth-client";
import { NomarcAvatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TourLauncher } from "@/components/tour/tour-launcher";
import { cn } from "@/lib/utils";

/** Every admin destination the search box can jump to. */
type Dest = { label: string; group: string; href: string; icon: LucideIcon };
const DESTINATIONS: Dest[] = [
  { label: "Dashboard", group: "Overview", href: "/admin", icon: LayoutGrid },
  { label: "Support Inbox", group: "Overview", href: "/admin/support-inbox", icon: MessageSquare },
  { label: "Identity Checks", group: "Verifications", href: "/admin/verifications/identity", icon: Fingerprint },
  { label: "Corporate Checks", group: "Verifications", href: "/admin/verifications/corporate", icon: Building2 },
  { label: "Professionals", group: "User Management", href: "/admin/user-management/professionals", icon: Users },
  { label: "Exhibitors", group: "User Management", href: "/admin/user-management/exhibitors", icon: ShieldCheck },
  { label: "Job Board", group: "Marketplace & Catalog", href: "/admin/marketplace/jobs", icon: ShoppingBag },
  { label: "Exhibition Hub", group: "Marketplace & Catalog", href: "/admin/marketplace/products", icon: Package },
  { label: "Ad Reviews", group: "Advertising", href: "/admin/advertising/reviews", icon: Megaphone },
  { label: "Active Campaigns", group: "Advertising", href: "/admin/advertising/campaigns", icon: Radio },
  { label: "Ad Board", group: "Advertising", href: "/admin/adverts", icon: Megaphone },
  { label: "Audience Segments", group: "Communications", href: "/admin/audience-segments", icon: UsersRound },
  { label: "Email Campaigns", group: "Communications", href: "/admin/email-campaigns", icon: Mail },
  { label: "Campaign Tracking", group: "Communications", href: "/admin/campaigns", icon: LineChart },
];

function IconLink({ href, label, count, children }: { href: string; label: string; count: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label} (${count})` : label}
      title={label}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#9a9a9a] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:hover:bg-white/5 dark:hover:text-white"
    >
      {children}
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white ring-1 ring-white dark:ring-[#1e1e1e]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/**
 * Admin top bar — the console's counterpart to the app's DashTopBar, so the two
 * shells feel like one product: ⌘K search across admin sections, the guided-tour
 * launcher, theme toggle, live queue badges, and the profile menu.
 */
export function AdminTopBar({ pendingVerifications = 0, openTickets = 0 }: { pendingVerifications?: number; openTickets?: number }) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string; image?: string | null } | undefined;

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DESTINATIONS.filter((d) => `${d.label} ${d.group}`.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  // Reset the keyboard cursor whenever the result set changes, so Enter can't
  // fire against a stale index.
  useEffect(() => setHighlight(0), [query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        setSearchOpen(false);
        searchRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function go(href: string) {
    setQuery("");
    setSearchOpen(false);
    searchRef.current?.blur();
    router.push(href);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!matches.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % matches.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + matches.length) % matches.length); }
    if (e.key === "Enter") { e.preventDefault(); go(matches[highlight].href); }
  }

  async function handleSignOut() {
    setMenuOpen(false);
    await authSignOut();
    router.push("/login");
  }

  const name = user?.name ?? "Administrator";
  const email = user?.email ?? "";

  return (
    <div className="hidden lg:flex items-center justify-end gap-2 border-b border-[#ececec] bg-white/95 px-5 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-[#1e1e1e]/95 sticky top-0 z-30">
      <ThemeToggle />

      {/* Guided tours — same launcher the app shell uses. */}
      <TourLauncher />

      {/* Search across admin sections — ⌘K to focus, ↑/↓ + Enter to pick. */}
      <div className="relative" ref={searchWrapRef}>
        <div className="flex h-9 w-[240px] items-center gap-2 rounded-full border border-[#ececec] bg-[#f7f7f7] px-3 transition-colors focus-within:border-[#ffd716] focus-within:bg-white dark:border-white/10 dark:bg-white/5 dark:focus-within:bg-[#161616]">
          <Search size={15} className="flex-shrink-0 text-[#9a9a9a]" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search admin"
            aria-label="Search admin sections"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1e1e1e] placeholder:text-[#9a9a9a] focus:outline-none dark:text-white"
          />
          <kbd className="flex-shrink-0 rounded-md border border-[#e3e3e3] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#9a9a9a] dark:border-white/15 dark:bg-white/5">⌘K</kbd>
        </div>

        <AnimatePresence>
          {searchOpen && query.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-0 mt-2 w-[300px] rounded-2xl border border-[#ececec] bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] z-50"
            >
              {matches.length === 0 ? (
                <p className="px-3 py-2.5 text-[12.5px] text-[#9a9a9a]">No admin section matches “{query.trim()}”.</p>
              ) : (
                matches.map((m, i) => (
                  <button
                    key={m.href}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => go(m.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      i === highlight ? "bg-[#fff7cc] dark:bg-white/10" : "hover:bg-[#f5f5f5] dark:hover:bg-white/5"
                    )}
                  >
                    <m.icon size={15} className="flex-shrink-0 text-[#9a9a9a] dark:text-white/50" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[#1e1e1e] dark:text-white">{m.label}</span>
                      <span className="block truncate text-[11px] text-[#9a9a9a]">{m.group}</span>
                    </span>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Queue badges — the two things an admin needs to notice immediately. */}
      <IconLink href="/admin/verifications/identity" label="Pending verifications" count={pendingVerifications}>
        <ShieldCheck size={16} />
      </IconLink>
      <IconLink href="/admin/support-inbox" label="Open support tickets" count={openTickets}>
        <MessageSquare size={16} />
      </IconLink>

      {/* Profile menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Account menu"
          className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-white/5"
        >
          <NomarcAvatar
            src={user?.image ?? undefined}
            name={name}
            size="sm"
            className="ring-2 ring-[#ffd716]/50 ring-offset-1 ring-offset-white dark:ring-offset-[#1e1e1e]"
          />
          <ChevronDown size={12} className={cn("text-[#9a9a9a] transition-transform duration-200", menuOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#ececec] bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] z-50"
            >
              <div className="mb-1 flex items-center gap-3 px-3 py-2.5">
                <NomarcAvatar src={user?.image ?? undefined} name={name} size="sm" online />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{name}</p>
                  <p className="truncate text-[11px] text-[#9a9a9a]">{email}</p>
                </div>
              </div>
              <div className="my-1.5 h-px bg-[#ececec] dark:bg-white/10" />
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[#1e1e1e] transition-colors hover:bg-[#f5f5f5] dark:text-white dark:hover:bg-white/10">
                <LayoutGrid size={15} className="text-[#9a9a9a] dark:text-white/50" /> Admin overview
              </Link>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[#1e1e1e] transition-colors hover:bg-[#f5f5f5] dark:text-white dark:hover:bg-white/10">
                <ArrowLeft size={15} className="text-[#9a9a9a] dark:text-white/50" /> Exit to app
              </Link>
              <div className="my-1.5 h-px bg-[#ececec] dark:bg-white/10" />
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[#e5484d] transition-colors hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10">
                <LogOut size={15} /> Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
