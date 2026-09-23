"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, Settings, User, LayoutGrid, LogOut, ChevronDown, ArrowUpRight } from "lucide-react";
import { useSession, signOut as authSignOut } from "@/lib/auth-client";
import { NomarcAvatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TourLauncher } from "@/components/tour/tour-launcher";
import { ResetAccountButton } from "@/components/dashboard/reset-account-button";
import { CartButton } from "@/components/exhibition-hub/cart-button";
import { useViewer } from "@/lib/use-viewer";
import { PLAN_LABEL, getNextPlan } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

// "Profile" was removed per the redesign — profile editing is reached through
// Account Settings, so the dropdown no longer offers two routes to it.
const MENU_ITEMS = [
  { label: "Dashboard",        href: "/dashboard",               Icon: LayoutGrid },
  { label: "Notifications",    href: "/dashboard/notifications", Icon: Bell },
  { label: "Account Settings", href: "/dashboard/settings",      Icon: Settings },
];

function UpgradeButton() {
  const viewer = useViewer();
  const nextPlan = getNextPlan(viewer.plan, viewer.role);
  if (!nextPlan) return null; // Already on highest plan

  return (
    <Link
      href="/dashboard/plans"
      className={cn(
        "inline-flex items-center gap-1.5 w-full justify-center px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors",
        "bg-[#ffd716]/15 text-[#caa400] hover:bg-[#ffd716]/25 border border-[#ffd716]/30"
      )}
    >
      <ArrowUpRight size={11} />
      Upgrade to {PLAN_LABEL[nextPlan]}
    </Link>
  );
}

export function DashTopBar({ notificationCount = 0 }: { notificationCount?: number }) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string; image?: string | null } | undefined;

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await authSignOut();
    router.push("/");
  }

  const name = user?.name ?? "Me";
  const email = user?.email ?? "";
  const avatar = user?.image ?? undefined;

  return (
    <div className="hidden lg:flex items-center justify-end gap-2 px-5 py-2.5 border-b border-[#ececec] dark:border-white/10 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-sm sticky top-0 z-30">

      {/* TEMPORARY — QA-only, wipes the caller's own onboarding state. Remove before launch. */}
      <ResetAccountButton />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Guided tours ("?" launcher — page tour / full tour / replay welcome) */}
      <TourLauncher />

      {/* Search — always-visible pill, ⌘K to focus */}
      <div className="flex items-center gap-2 h-9 w-[240px] rounded-full border border-[#ececec] dark:border-white/10 bg-[#f7f7f7] dark:bg-white/5 px-3 transition-colors focus-within:border-[#ffd716] focus-within:bg-white dark:focus-within:bg-[#161616]">
        <Search size={15} className="text-[#9a9a9a] flex-shrink-0" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="flex-1 min-w-0 text-[13px] bg-transparent text-[#1e1e1e] dark:text-white placeholder:text-[#9a9a9a] focus:outline-none"
        />
        <kbd className="flex-shrink-0 rounded-md border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[#9a9a9a]">⌘K</kbd>
      </div>

      {/* Cart is PARKED — purchases are arranged with the seller directly, so
          there's nothing to check out. The CartButton, cart drawer, and the
          /exhibition-hub/cart + /checkout routes all still exist, just unlinked. */}

      {/* Notification bell */}
      <Link
        href="/dashboard/notifications"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
      >
        <Bell size={16} />
        {notificationCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white ring-1 ring-white dark:ring-[#1e1e1e]"
          >
            {notificationCount > 99 ? "99+" : notificationCount}
          </motion.span>
        )}
      </Link>

      {/* Profile dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 py-0.5 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
        >
          <NomarcAvatar
            src={avatar}
            name={name}
            size="sm"
            className="ring-2 ring-[#ffd716]/50 ring-offset-1 ring-offset-white dark:ring-offset-[#1e1e1e]"
          />
          <ChevronDown
            size={12}
            className={`text-[#9a9a9a] transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-2 z-50"
            >
              <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                <NomarcAvatar src={avatar} name={name} size="sm" online />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{name}</p>
                  <p className="text-[11px] text-[#9a9a9a] truncate">{email}</p>
                </div>
              </div>
              <div className="my-1.5 h-px bg-[#ececec] dark:bg-white/10" />

              <UpgradeButton />

              <div className="my-1.5 h-px bg-[#ececec] dark:bg-white/10" />

              {MENU_ITEMS.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[#1e1e1e] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors"
                >
                  <Icon size={15} className="text-[#9a9a9a] dark:text-white/50" />
                  {label}
                </Link>
              ))}

              <div className="my-1.5 h-px bg-[#ececec] dark:bg-white/10" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10 transition-colors"
              >
                <LogOut size={15} />
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
