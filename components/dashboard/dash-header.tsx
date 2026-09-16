"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, X, Settings, User, LayoutGrid, LogOut, ChevronDown, CheckCheck, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { signOut as authSignOut } from "@/lib/auth-client";
import { NomarcAvatar } from "@/components/ui/avatar";
import { CartButton } from "@/components/exhibition-hub/cart-button";
import { getMyNotifications, markNotificationRead, markAllNotificationsRead, type NotificationRow } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";

/* ── Demo collaborator data (replace with real API data when available) ── */
const DEMO_COLLABORATORS = [
  { id: "1", name: "Amara Okonkwo", avatar: null },
  { id: "2", name: "Bode Adeleke", avatar: null },
  { id: "3", name: "Chisom Eze",   avatar: null },
  { id: "4", name: "Dayo Bello",   avatar: null },
  { id: "5", name: "Emeka Nwosu",  avatar: null },
];

// "Profile" removed per the redesign — see components/dashboard/dash-top-bar.tsx.
// This component is currently unreferenced; kept in step so it can't
// reintroduce the removed item if it is ever wired up.
const MENU_ITEMS = [
  { label: "Dashboard",        href: "/dashboard",               Icon: LayoutGrid },
  { label: "Notifications",    href: "/dashboard/notifications", Icon: Bell },
  { label: "Account Settings", href: "/dashboard/settings",      Icon: Settings },
];

/* ─── Notification type icon map ──────────────────────────────────────────── */
const TYPE_ICON: Record<string, string> = {
  welcome: "👋", job: "💼", application: "📋", order: "📦", quote: "💬",
  payout: "💰", kyc: "🛡️", message: "✉️", system: "⚙️", recommendation: "⭐",
};

function NotificationBell({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [notes, setNotes] = useState<NotificationRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    getMyNotifications().then((n) => { setNotes(n); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (open && !loaded) load();
  }, [open, loaded, load]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const displayed = tab === "unread" ? notes.filter((n) => !n.read) : notes;
  const unreadCount = notes.filter((n) => !n.read).length;

  async function handleMarkAllRead() {
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead().catch(() => {});
  }

  async function handleClick(n: NotificationRow) {
    if (!n.read) {
      setNotes((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.href) { setOpen(false); window.location.href = n.href; }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
      >
        <Bell size={16} />
        {count > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white">
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute right-0 mt-2 w-[360px] max-h-[480px] rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.5)] z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">Notifications</h3>
                <button onClick={() => setOpen(false)} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={16} /></button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 p-0.5 rounded-xl bg-[#f5f5f5] dark:bg-white/5">
                {(["all", "unread"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors capitalize",
                      tab === t ? "bg-white dark:bg-[#2a2a2a] text-[#1e1e1e] dark:text-white shadow-sm" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"
                    )}>
                    {t} {t === "unread" && unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">{unreadCount}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {!loaded ? (
                <div className="py-8 text-center text-[13px] text-[#9a9a9a]">Loading…</div>
              ) : displayed.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-[22px]">🔔</div>
                  <p className="text-[13px] font-medium text-[#9a9a9a]">{tab === "unread" ? "All caught up!" : "No notifications yet"}</p>
                </div>
              ) : (
                displayed.slice(0, 8).map((n) => (
                  <button key={n.id} onClick={() => handleClick(n)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#fafafa] dark:hover:bg-white/[0.03] transition-colors border-b border-[#f5f5f5] dark:border-white/5 last:border-0",
                      !n.read && "bg-[#fffdf2] dark:bg-[#ffd716]/[0.04]"
                    )}>
                    <div className="w-9 h-9 rounded-full bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[16px] flex-shrink-0 mt-0.5">
                      {TYPE_ICON[n.type] ?? "📌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] leading-tight", n.read ? "text-[#6b6b6b] dark:text-white/60" : "text-[#1e1e1e] dark:text-white font-semibold")}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-[11.5px] text-[#9a9a9a] mt-0.5 line-clamp-1">{n.body}</p>}
                      <p className="text-[10.5px] text-[#c0c0c0] dark:text-white/30 mt-1">{n.time}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#ffd716] flex-shrink-0 mt-2" />}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between gap-2">
              {unreadCount > 0 ? (
                <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
                  <CheckCheck size={13} /> Mark all as read
                </button>
              ) : <span />}
              <Link href="/dashboard/notifications" onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12px] font-bold hover:bg-[#e6c114] transition-colors">
                View All Notifications <ExternalLink size={11} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface DashHeaderProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
  collaborators?: { id: string; name: string; avatar?: string | null }[];
  showCollaborators?: boolean;
}

export function DashHeader({
  title,
  subtitle,
  notificationCount = 0,
  collaborators,
  showCollaborators = true,
}: DashHeaderProps) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const collab = collaborators ?? DEMO_COLLABORATORS;
  const visible = collab.slice(0, 3);
  const overflow = collab.length - visible.length;

  /* close dropdown on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ⌘K / Ctrl+K opens search */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await authSignOut();
    signOut();
    router.push("/");
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 md:px-7 py-4 border-b border-[#ececec] dark:border-white/10 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-sm sticky top-0 z-30">
      {/* Left — title */}
      <div className="min-w-0">
        <h1 className="text-[17px] md:text-[19px] font-bold text-[#1e1e1e] dark:text-white leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] text-[#9a9a9a] mt-px truncate">{subtitle}</p>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Collaborator stack */}
        {showCollaborators && collab.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-2 mr-1">
            {visible.map((c) => (
              <div key={c.id} className="ring-2 ring-white dark:ring-[#1e1e1e] rounded-full">
                <NomarcAvatar src={c.avatar} name={c.name} size="xs" />
              </div>
            ))}
            {overflow > 0 && (
              <div className="h-6 min-w-6 px-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 ring-2 ring-white dark:ring-[#1e1e1e] flex items-center justify-center text-[10px] font-bold text-[#6b6b6b] dark:text-white/70">
                +{overflow}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                key="search-input"
                initial={{ width: 32, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 32, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="flex items-center gap-1.5 h-8 rounded-lg border border-[#ffd716] bg-white dark:bg-[#161616] px-2.5 overflow-hidden"
              >
                <Search size={13} className="text-[#9a9a9a] flex-shrink-0" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search anything…"
                  className="flex-1 text-[12.5px] bg-transparent text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none"
                />
                <button onClick={() => { setSearchOpen(false); setQuery(""); }} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white">
                  <X size={13} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="search-icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
                title="Search (⌘K)"
              >
                <Search size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Cart — quick access to the Exhibition Hub cart drawer */}
        <CartButton />

        {/* Notification bell + panel */}
        <NotificationBell count={notificationCount} />

        {/* Profile avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 py-0.5 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors group"
          >
            <NomarcAvatar
              src={user?.avatar}
              name={user?.name ?? "Me"}
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
                {/* user info */}
                {user && (
                  <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                    <NomarcAvatar src={user.avatar} name={user.name} size="sm" online />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-[#9a9a9a] truncate">{user.email}</p>
                    </div>
                  </div>
                )}
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
    </div>
  );
}
