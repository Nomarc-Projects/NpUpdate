"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, BadgeCheck, Trash2, ShieldCheck, Ban, RotateCcw, Download, ChevronLeft, ChevronRight, ChevronDown, X, Sparkles, Eye, KeyRound, Pencil, LogIn, Users, UserX, MailCheck, Loader2, Store, Briefcase, Handshake } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, GhostButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { KebabMenu, type KebabItem } from "@/components/dashboard/kit";
import { setUserRole, setUserPlan, setUserBanned, setUserPartner, exportUsersCsv, adminDeleteUser, requestPasswordResetAsAdmin, type AdminUser, type AdminUserStats } from "@/lib/services/admin";
import { startImpersonation } from "@/lib/services/impersonation";
import { cn } from "@/lib/utils";

/** Roles an admin can assign from the row dropdowns. `super_admin` is deliberately
 *  absent — that promotion shouldn't be a two-click action in a table. */
const ROLES = ["professional", "exhibitor", "employer", "admin"];
const PLANS = ["free", "plus", "pro", "premium"];
const PER_PAGE_OPTS = ["10", "20", "50", "100", "200", "500"];
const cap = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
const roleLabel = cap;

function StatusBadge({ u }: { u: AdminUser }) {
  if (u.banned) return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c0392b] bg-[#fde8e8] dark:bg-[#ef4444]/15 dark:text-[#f87171] px-2 py-0.5 rounded-full">Suspended</span>;
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#16803c] bg-[#dcfce7] dark:bg-[#22c55e]/15 dark:text-[#4ade80] px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-[#16803c] dark:bg-[#4ade80]" /> Active</span>;
}
function Avatar({ u }: { u: AdminUser }) {
  return <div className="w-9 h-9 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-sm flex-shrink-0">{(u.name || u.email).slice(0, 1).toUpperCase()}</div>;
}
function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn("w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center flex-shrink-0 transition-colors", checked ? "bg-[#ffd716] border-[#ffd716] text-[#1e1e1e]" : "border-[#d4d4d4] dark:border-white/25 hover:border-[#ffd716]")}>
      {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatTile({ icon: Icon, label, value, color, bg, active, onClick }: {
  icon: typeof Users; label: string; value: number; color: string; bg: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={cn(
      "rounded-2xl border bg-white dark:bg-[#1e1e1e] p-4 flex flex-col items-center gap-2 text-center transition-all hover:shadow-md",
      active ? "border-[#ffd716] shadow-md ring-1 ring-[#ffd716]/30" : "border-[#ececec] dark:border-white/10"
    )}>
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", bg)}>
        <Icon size={19} className={color} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[#9a9a9a]">{label}</p>
        <p className="text-[22px] font-black text-[#1e1e1e] dark:text-white leading-tight mt-0.5">{value.toLocaleString()}</p>
      </div>
    </button>
  );
}

function RolePill({ role }: { role: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    professional: { color: "text-[#1d4ed8] dark:text-[#818cf8]", bg: "bg-[#e0edff] dark:bg-[#6366f1]/15" },
    exhibitor: { color: "text-[#8a7400] dark:text-[#ffd716]", bg: "bg-[#fff7cc] dark:bg-[#ffd716]/15" },
    buyer: { color: "text-[#16803c] dark:text-[#4ade80]", bg: "bg-[#dcfce7] dark:bg-[#22c55e]/15" },
    admin: { color: "text-white dark:text-[#1e1e1e]", bg: "bg-[#1e1e1e] dark:bg-white" },
  };
  const c = cfg[role] ?? cfg.professional;
  return <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full capitalize", c.color, c.bg)}>{role}</span>;
}

function KycBadge({ verified }: { verified: boolean }) {
  return verified
    ? <span className="text-[11px] font-semibold text-[#16a34a] bg-[#dcfce7] dark:bg-[#22c55e]/15 dark:text-[#4ade80] px-2 py-0.5 rounded-full">Verified</span>
    : <span className="text-[11px] font-semibold text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 px-2 py-0.5 rounded-full">Unverified</span>;
}

/* ─── Per-row action dropdown ────────────────────────────────────────────── */
function RowActions({ u, onImpersonate, onToggleBan, onDelete, onViewDetails, onResetPassword, onTogglePartner }: {
  u: AdminUser; onImpersonate: () => void; onToggleBan: () => void; onDelete: () => void; onViewDetails: () => void; onResetPassword: () => void; onTogglePartner: () => void;
}) {
  // Portal-based KebabMenu so the dropdown is never clipped by the table's
  // overflow-x-auto container (the inline absolute menu used to be cut off).
  const items: KebabItem[] = [
    { icon: Eye, label: "View details", onClick: onViewDetails },
    { icon: KeyRound, label: "Reset password", onClick: onResetPassword },
    { icon: Pencil, label: "Edit user", onClick: () => toast.info("Edit user — coming soon") },
    { icon: LogIn, label: "Login as user", hidden: u.role === "admin", onClick: onImpersonate },
    { icon: Handshake, label: u.isPartner ? "Remove Partner" : "Mark as Partner", onClick: onTogglePartner },
    { icon: u.banned ? RotateCcw : Ban, label: u.banned ? "Activate" : "Deactivate", onClick: onToggleBan },
    { icon: Trash2, label: "Delete user", danger: true, onClick: onDelete },
  ];
  return <KebabMenu items={items} />;
}

/* ─── User detail slide-over panel ───────────────────────────────────────── */
function UserDetailPanel({ u, onClose, onChangeRole, onChangePlan, onToggleBan, onImpersonate, onDelete, onResetPassword, onTogglePartner }: {
  u: AdminUser; onClose: () => void;
  onChangeRole: (role: string) => void; onChangePlan: (plan: string) => void;
  onToggleBan: () => void; onImpersonate: () => void; onDelete: () => void; onResetPassword: () => void; onTogglePartner: () => void;
}) {
  const initials = (u.name || u.email).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
        <span className="text-[12px] font-medium text-[#9a9a9a]">{label}</span>
        <div className="text-right">{children}</div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex justify-end">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="relative z-10 w-full max-w-[420px] h-full overflow-y-auto bg-white dark:bg-[#111] shadow-2xl flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#f0f0f0] dark:border-white/10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40">User Details</p>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-white/5 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
              <X size={17} />
            </button>
          </div>

          {/* Profile header */}
          <div className="px-5 pt-6 pb-5 flex flex-col items-center text-center border-b border-[#f0f0f0] dark:border-white/10">
            <div className="w-20 h-20 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-black text-2xl mb-3">
              {initials}
            </div>
            <h2 className="text-[18px] font-bold text-[#1e1e1e] dark:text-white flex items-center gap-1.5">
              {u.name || "Unnamed"}
              {u.verified && <BadgeCheck size={16} className="text-[#1e9df5]" />}
            </h2>
            <p className="text-[13px] text-[#9a9a9a] mt-0.5">{u.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <RolePill role={u.role} />
              <StatusBadge u={u} />
            </div>
          </div>

          {/* Details */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-2">Account Info</p>

            <DetailRow label="User ID">
              <span className="text-[11px] font-mono text-[#6b6b6b] dark:text-white/60">{u.id.slice(0, 16)}…</span>
            </DetailRow>
            <DetailRow label="Role">
              <div className="w-[128px]">
                <SelectMenu value={roleLabel(u.role)} options={ROLES.map(roleLabel)} onChange={(l) => onChangeRole(l.toLowerCase())} />
              </div>
            </DetailRow>
            <DetailRow label="Plan">
              <div className="w-[108px]">
                <SelectMenu value={cap(u.plan)} options={PLANS.map(cap)} onChange={(l) => onChangePlan(l.toLowerCase())} />
              </div>
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge u={u} />
            </DetailRow>
            <DetailRow label="KYC Verification">
              <KycBadge verified={u.verified} />
            </DetailRow>
            <DetailRow label="Partnership">
              {u.isPartner
                ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8a7400] bg-[#fff7cc] dark:bg-[#ffd716]/15 dark:text-[#ffd716] px-2 py-0.5 rounded-full"><Handshake size={11} /> Partner</span>
                : <span className="text-[12.5px] font-medium text-[#9a9a9a]">—</span>}
            </DetailRow>
            <DetailRow label="Registered">
              <span className="text-[12.5px] font-medium text-[#1e1e1e] dark:text-white">{u.joined}</span>
            </DetailRow>
          </div>

          {/* Quick actions */}
          <div className="px-5 py-4 border-t border-[#f0f0f0] dark:border-white/10 mt-auto">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-3">Quick Actions</p>
            <div className="space-y-2">
              <button onClick={() => { onResetPassword(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] transition-colors text-left">
                <KeyRound size={15} className="text-[#9a9a9a]" />
                <div>
                  <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Reset password</p>
                  <p className="text-[11px] text-[#9a9a9a]">Send a password reset link via email</p>
                </div>
              </button>

              {u.role !== "admin" && (
                <button onClick={() => { onImpersonate(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] transition-colors text-left">
                  <LogIn size={15} className="text-[#9a9a9a]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Login as user</p>
                    <p className="text-[11px] text-[#9a9a9a]">View their dashboard as if you were them</p>
                  </div>
                </button>
              )}

              <button onClick={() => { onTogglePartner(); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left",
                  u.isPartner ? "border-[#f59e0b]/30 hover:border-[#f59e0b]" : "border-[#8a7400]/30 hover:border-[#ffd716]"
                )}>
                <Handshake size={15} className={u.isPartner ? "text-[#f59e0b]" : "text-[#8a7400]"} />
                <div>
                  <p className={cn("text-[13px] font-semibold", u.isPartner ? "text-[#f59e0b]" : "text-[#8a7400]")}>
                    {u.isPartner ? "Remove Partner" : "Mark as Partner"}
                  </p>
                  <p className="text-[11px] text-[#9a9a9a]">{u.isPartner ? "Revoke promotion rights" : "Allow promotions without the Key players plan"}</p>
                </div>
              </button>

              <button onClick={() => { onToggleBan(); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left",
                  u.banned ? "border-[#16a34a]/30 hover:border-[#16a34a]" : "border-[#f59e0b]/30 hover:border-[#f59e0b]"
                )}>
                {u.banned ? <RotateCcw size={15} className="text-[#16a34a]" /> : <Ban size={15} className="text-[#f59e0b]" />}
                <div>
                  <p className={cn("text-[13px] font-semibold", u.banned ? "text-[#16a34a]" : "text-[#f59e0b]")}>
                    {u.banned ? "Activate user" : "Suspend user"}
                  </p>
                  <p className="text-[11px] text-[#9a9a9a]">{u.banned ? "Restore access to the platform" : "Temporarily block access"}</p>
                </div>
              </button>

              <button onClick={() => { onDelete(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/20 hover:border-red-400 transition-colors text-left">
                <Trash2 size={15} className="text-red-500" />
                <div>
                  <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">Delete user</p>
                  <p className="text-[11px] text-[#9a9a9a]">Permanently remove this account and all data</p>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const COLS = ["Name", "Email", "Role", "Plan", "Status", "Joined"];
const rowOf = (u: AdminUser) => [u.name || "", u.email, u.role, u.plan, u.banned ? "Suspended" : "Active", u.joined];
function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function toCsv(rows: AdminUser[]) {
  const esc = (c: string) => `"${String(c).replace(/"/g, '""')}"`;
  return [COLS, ...rows.map(rowOf)].map((r) => r.map((c) => esc(String(c))).join(",")).join("\n");
}
function toXls(rows: AdminUser[]) {
  const esc = (c: string) => String(c).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = [COLS, ...rows.map(rowOf)].map((r, i) => `<tr>${r.map((c) => `<t${i === 0 ? "h" : "d"}>${esc(String(c))}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join("");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`;
}

/** Icon + palette per role tile. Unknown/legacy roles fall back to the last entry. */
const ROLE_TILE: Record<string, { Icon: typeof Users; color: string; bg: string }> = {
  professional: { Icon: MailCheck,   color: "text-[#6366f1]", bg: "bg-[#e0edff] dark:bg-[#6366f1]/15" },
  exhibitor:    { Icon: Store,       color: "text-[#8a7400]", bg: "bg-[#fff7cc] dark:bg-[#ffd716]/15" },
  employer:     { Icon: Briefcase,   color: "text-[#0891b2]", bg: "bg-[#cffafe] dark:bg-[#06b6d4]/15" },
  admin:        { Icon: ShieldCheck, color: "text-[#7c3aed]", bg: "bg-[#ede9fe] dark:bg-[#8b5cf6]/15" },
  super_admin:  { Icon: ShieldCheck, color: "text-[#be123c]", bg: "bg-[#ffe4e6] dark:bg-[#f43f5e]/15" },
  client:       { Icon: Users,       color: "text-[#6b6b6b]", bg: "bg-[#f0f0f0] dark:bg-white/10" },
};
const ROLE_TILE_FALLBACK = { Icon: Users, color: "text-[#6b6b6b]", bg: "bg-[#f0f0f0] dark:bg-white/10" };
/** "super_admin" → "Super Admins"; pluralised for a count tile. */
function roleTileLabel(role: string) {
  const words = role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return words.endsWith("s") ? words : `${words}s`;
}

export function AdminUsers({ users = [], stats, search = "" }: { users?: AdminUser[]; stats?: AdminUserStats; search?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(search);
  const [list, setList] = useState(users);
  const [delUser, setDelUser] = useState<AdminUser | null>(null);
  const [bulkDel, setBulkDel] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [searching, setSearching] = useState(false);

  // `list` is seeded from props and then edited in place by the row actions, so
  // it has to be re-synced whenever the server sends a new set. Without this the
  // search navigated, the server returned matching rows, and the table went on
  // rendering the stale ones — which is why a search only appeared to work after
  // a hard refresh, and why clearing the box never restored the full list.
  useEffect(() => { setList(users); setSel(new Set()); setSearching(false); }, [users]);

  // Search as you type. Submitting still works (and fires immediately) for
  // anyone who hits Enter.
  const navigateSearch = useCallback((term: string) => {
    router.push(`/admin/users${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ""}`);
  }, [router]);

  useEffect(() => {
    if (q === search) return;
    setSearching(true);
    const t = setTimeout(() => { setPage(0); navigateSearch(q); }, 350);
    return () => clearTimeout(t);
  }, [q, search, navigateSearch]);

  const runSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(0); navigateSearch(q); };

  // Fall back to counting the loaded rows only if the server didn't send stats,
  // so the tiles still render something rather than blanking out.
  const s: AdminUserStats = stats ?? {
    total: list.length,
    active: list.filter((u) => !u.banned).length,
    banned: list.filter((u) => u.banned).length,
    verified: list.filter((u) => u.verified).length,
    unverified: list.filter((u) => !u.verified).length,
    byRole: list.reduce<Record<string, number>>((acc, u) => {
      for (const r of u.roles?.length ? u.roles : [u.role]) acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {}),
  };

  // Biggest cohorts first; drop empty roles so the row only shows what exists.
  const roleTiles = useMemo(() =>
    Object.entries(s.byRole)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({ role, count, ...(ROLE_TILE[role] ?? ROLE_TILE_FALLBACK) })),
    [s.byRole],
  );

  const filtered = useMemo(() => list.filter((u) => {
    // Matched against every held role, not the single scalar — otherwise a tile
    // counting 206 employers filtered down to the 73 whose scalar happened to
    // say "employer".
    if (roleFilter !== "all" && !(u.roles?.length ? u.roles : [u.role]).includes(roleFilter)) return false;
    if (statusFilter === "active" && u.banned) return false;
    if (statusFilter === "banned" && !u.banned) return false;
    if (statusFilter === "verified" && !u.verified) return false;
    if (statusFilter === "unverified" && u.verified) return false;
    return true;
  }), [list, roleFilter, statusFilter]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const paged = useMemo(() => filtered.slice(safePage * perPage, safePage * perPage + perPage), [filtered, safePage, perPage]);

  const selectedRows = useMemo(() => list.filter((u) => sel.has(u.id)), [list, sel]);
  const allOnPage = paged.length > 0 && paged.every((u) => sel.has(u.id));
  const toggleOne = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllOnPage = () => setSel((s) => { const n = new Set(s); if (allOnPage) paged.forEach((u) => n.delete(u.id)); else paged.forEach((u) => n.add(u.id)); return n; });
  const clearSel = () => setSel(new Set());

  const toggleBan = (u: AdminUser) => {
    const next = !u.banned; const prev = list;
    setList((l) => l.map((x) => (x.id === u.id ? { ...x, banned: next } : x)));
    toast.success(next ? "User suspended" : "User reinstated");
    setUserBanned(u.id, next).then(() => router.refresh()).catch((e) => { setList(prev); toast.error(e instanceof Error ? e.message : "Failed"); });
  };
  const resetPassword = (u: AdminUser) => {
    toast.loading(`Sending reset link to ${u.email}…`, { id: "reset" });
    requestPasswordResetAsAdmin(u.id)
      .then((r) => {
        if (r.sent) toast.success(`Reset link sent to ${u.email}`, { id: "reset" });
        else toast.error(r.error, { id: "reset" });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not send reset email.", { id: "reset" }));
  };
  const impersonate = (u: AdminUser) => {
    toast.loading(`Switching to ${u.name || u.email}…`, { id: "imp" });
    // Reason is recorded in the audit log; the server rejects anything too short.
    const why = window.prompt(`Why are you signing in as ${u.name || u.email}? This is recorded in the audit log.`);
    if (why === null) return;
    startImpersonation(u.id, why).then(() => { window.location.href = "/dashboard"; }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed", { id: "imp" }));
  };
  const changeRole = (u: AdminUser, role: string) => {
    const prev = list;
    setList((l) => l.map((x) => (x.id === u.id ? { ...x, role } : x)));
    toast.success(`${u.name || u.email} is now ${roleLabel(role)}`);
    setUserRole(u.id, role as "professional").then(() => router.refresh()).catch((e) => { setList(prev); toast.error(e instanceof Error ? e.message : "Failed"); });
  };
  const changePlan = (u: AdminUser, plan: string) => {
    const prev = list;
    setList((l) => l.map((x) => (x.id === u.id ? { ...x, plan } : x)));
    toast.success(`${u.name || u.email} → ${cap(plan)} plan`);
    setUserPlan(u.id, plan as "free").then(() => router.refresh()).catch((e) => { setList(prev); toast.error(e instanceof Error ? e.message : "Failed"); });
  };
  const togglePartner = (u: AdminUser) => {
    const next = !u.isPartner; const prev = list;
    setList((l) => l.map((x) => (x.id === u.id ? { ...x, isPartner: next } : x)));
    toast.success(next ? `${u.name || u.email} is now a Nomarc partner` : `Partner status removed for ${u.name || u.email}`);
    setUserPartner(u.id, next).then(() => router.refresh()).catch((e) => { setList(prev); toast.error(e instanceof Error ? e.message : "Failed"); });
  };
  const confirmDelete = () => {
    if (!delUser) return;
    const prev = list; const u = delUser;
    setList((l) => l.filter((x) => x.id !== u.id)); setDelUser(null);
    toast.success("User deleted");
    adminDeleteUser(u.id).then(() => router.refresh()).catch((e) => { setList(prev); toast.error(e instanceof Error ? e.message : "Failed"); });
  };

  // ── bulk actions ──
  function bulkBan(next: boolean) {
    const ids = [...sel]; const prev = list;
    setList((l) => l.map((x) => (sel.has(x.id) ? { ...x, banned: next } : x)));
    toast.success(`${ids.length} user${ids.length > 1 ? "s" : ""} ${next ? "suspended" : "reinstated"}`);
    Promise.all(ids.map((id) => setUserBanned(id, next))).then(() => router.refresh()).catch(() => { setList(prev); toast.error("Some updates failed"); });
    clearSel();
  }
  function bulkPlan(plan: string) {
    const ids = [...sel]; const prev = list;
    setList((l) => l.map((x) => (sel.has(x.id) ? { ...x, plan } : x)));
    toast.success(`${ids.length} user${ids.length > 1 ? "s" : ""} → ${cap(plan)}`);
    Promise.all(ids.map((id) => setUserPlan(id, plan as "free"))).then(() => router.refresh()).catch(() => { setList(prev); toast.error("Some updates failed"); });
    clearSel();
  }
  function confirmBulkDelete() {
    const ids = [...sel]; const prev = list;
    setList((l) => l.filter((x) => !sel.has(x.id))); setBulkDel(false);
    toast.success(`${ids.length} user${ids.length > 1 ? "s" : ""} deleted`);
    Promise.all(ids.map((id) => adminDeleteUser(id))).then(() => router.refresh()).catch(() => { setList(prev); toast.error("Some deletions failed"); });
    clearSel();
  }
  async function exportAll(fmt: "csv" | "xls") {
    try {
      const date = new Date().toISOString().slice(0, 10);
      if (fmt === "csv") download(`nomarc-users-${date}.csv`, "text/csv", await exportUsersCsv());
      else download(`nomarc-users-${date}.xls`, "application/vnd.ms-excel", toXls(list));
      toast.success("Users exported");
    } catch { toast.error("Export failed"); }
  }
  function exportSelected(fmt: "csv" | "xls") {
    const date = new Date().toISOString().slice(0, 10);
    if (fmt === "csv") download(`nomarc-users-selected-${date}.csv`, "text/csv", toCsv(selectedRows));
    else download(`nomarc-users-selected-${date}.xls`, "application/vnd.ms-excel", toXls(selectedRows));
    toast.success(`${selectedRows.length} exported`);
  }

  return (
    <div>
      {/* Stat tiles — clickable filters. Values come from a platform-wide SQL
          aggregate, not from `list`: that only ever holds the rows fetched for
          the table, so every tile used to top out at the query's row cap.
          One per row on mobile — six half-width tiles were unreadable there. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatTile icon={Users} label="Total Users" value={s.total} color="text-[#6b6b6b]" bg="bg-[#f0f0f0] dark:bg-white/10"
          active={statusFilter === "all" && roleFilter === "all"} onClick={() => { setStatusFilter("all"); setRoleFilter("all"); setPage(0); }} />
        <StatTile icon={Users} label="Active Users" value={s.active} color="text-[#16a34a]" bg="bg-[#dcfce7] dark:bg-[#22c55e]/15"
          active={statusFilter === "active"} onClick={() => { setStatusFilter(statusFilter === "active" ? "all" : "active"); setPage(0); }} />
        <StatTile icon={UserX} label="Banned" value={s.banned} color="text-[#e5484d]" bg="bg-[#fee2e2] dark:bg-[#ef4444]/15"
          active={statusFilter === "banned"} onClick={() => { setStatusFilter(statusFilter === "banned" ? "all" : "banned"); setPage(0); }} />
        <StatTile icon={ShieldCheck} label="KYC Verified" value={s.verified} color="text-[#3b82f6]" bg="bg-[#dbeafe] dark:bg-[#3b82f6]/15"
          active={statusFilter === "verified"} onClick={() => { setStatusFilter(statusFilter === "verified" ? "all" : "verified"); setPage(0); }} />
        <StatTile icon={ShieldCheck} label="KYC Unverified" value={s.unverified} color="text-[#f59e0b]" bg="bg-[#fef3c7] dark:bg-[#f59e0b]/15"
          active={statusFilter === "unverified"} onClick={() => { setStatusFilter(statusFilter === "unverified" ? "all" : "unverified"); setPage(0); }} />
        {/* One tile per role actually present, so exhibitors, employers, admins
            and any legacy role are all represented rather than professionals alone. */}
        {roleTiles.map(({ role, count, Icon, color, bg }) => (
          <StatTile key={role} icon={Icon} label={roleTileLabel(role)} value={count} color={color} bg={bg}
            active={roleFilter === role} onClick={() => { setRoleFilter(roleFilter === role ? "all" : role); setPage(0); }} />
        ))}
      </div>

      {/* Search + Filter + Export toolbar */}
      <div className="mt-5 flex items-center gap-3 flex-wrap">
        {/* The field reports its own state: an amber border and a spinner while a
            query is in flight, so a slow search reads as working rather than
            broken. */}
        <form onSubmit={runSearch} className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            aria-busy={searching}
            className={cn(
              "w-full rounded-xl border bg-white dark:bg-[#1e1e1e] pl-10 pr-10 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none transition-colors",
              searching ? "border-[#ffd716] ring-2 ring-[#ffd716]/25" : "border-[#e3e3e3] dark:border-white/15 focus:border-[#ffd716]",
            )}
          />
          {searching ? (
            <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#caa400]" />
          ) : q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-[#1e1e1e] dark:hover:text-white">
              <X size={15} />
            </button>
          ) : null}
        </form>

        {/* Role filter chips — driven by the roles actually present, with the
            same platform-wide counts as the tiles. The old fixed list of three
            hid employers and super-admins entirely and counted only loaded rows. */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", ...roleTiles.map((t) => t.role)].map((r) => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(0); }}
              className={cn("px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all",
                roleFilter === r ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]" : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"
              )}>
              {r === "all" ? `All (${s.total.toLocaleString()})` : `${roleTileLabel(r)} (${(s.byRole[r] ?? 0).toLocaleString()})`}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => exportAll("csv")} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors"><Download size={14} /> CSV</button>
          <button onClick={() => exportAll("xls")} className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors"><Download size={14} /> Excel</button>
        </div>
      </div>

      {/* bulk action bar */}
      {sel.size > 0 && (
        <div className="mt-4 flex items-center gap-3 flex-wrap rounded-xl border border-[#ffd716]/50 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] px-4 py-2.5">
          <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{sel.size} selected</span>
          <button onClick={() => clearSel()} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={15} /></button>
          <div className="h-4 w-px bg-[#e3e3e3] dark:bg-white/15" />
          <button onClick={() => bulkBan(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white"><Ban size={14} /> Suspend</button>
          <button onClick={() => bulkBan(false)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white"><RotateCcw size={14} /> Reinstate</button>
          <div className="w-[120px]"><SelectMenu value="Set plan…" options={PLANS.map(cap)} onChange={(l) => bulkPlan(l.toLowerCase())} /></div>
          <button onClick={() => exportSelected("csv")} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white"><Download size={14} /> Export</button>
          <button onClick={() => setBulkDel(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#e5484d] hover:text-[#d33a3f]"><Trash2 size={14} /> Delete</button>
        </div>
      )}

      {total === 0 ? (
        <div className="mt-5 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] py-12 text-center text-[13px] text-[#9a9a9a]">No users found</div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left min-w-[860px]">
              <thead>
                <tr className="border-b border-[#f0f0f0] dark:border-white/10 text-[10.5px] uppercase tracking-wider text-[#b0b0b0] dark:text-white/35 bg-[#fafafa] dark:bg-white/[0.02]">
                  <th className="w-10 px-3 py-3"><Check checked={allOnPage} onChange={toggleAllOnPage} /></th>
                  <th className="w-10 font-semibold px-2 py-3">#</th>
                  <th className="font-semibold px-3 py-3">User Details</th>
                  <th className="font-semibold px-3 py-3">Role</th>
                  <th className="font-semibold px-3 py-3">Status</th>
                  <th className="font-semibold px-3 py-3">KYC</th>
                  <th className="font-semibold px-3 py-3">Plan</th>
                  <th className="font-semibold px-3 py-3">Registered</th>
                  <th className="w-14 font-semibold px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u, idx) => (
                  <tr key={u.id} className={cn(
                    "border-b border-[#f5f5f5] dark:border-white/5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors",
                    u.banned && "bg-[#fdf2f2] dark:bg-[#e5484d]/[0.04]",
                    sel.has(u.id) && "bg-[#fffdf2] dark:bg-[#ffd716]/[0.04]"
                  )}>
                    <td className="px-3 py-3.5"><Check checked={sel.has(u.id)} onChange={() => toggleOne(u.id)} /></td>
                    <td className="px-2 py-3.5 text-[12px] font-bold text-[#c0c0c0] dark:text-white/20">#{safePage * perPage + idx + 1}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar u={u} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1.5 truncate">{u.name || "—"} {u.verified && <BadgeCheck size={14} className="text-[#1e9df5] flex-shrink-0" />} {u.isPartner && <Handshake size={14} className="text-[#f59e0b] flex-shrink-0" />}</p>
                          <p className="text-[11.5px] text-[#9a9a9a] truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><RolePill role={u.role} /></td>
                    <td className="px-3 py-3.5"><StatusBadge u={u} /></td>
                    <td className="px-3 py-3.5"><KycBadge verified={u.verified} /></td>
                    <td className="px-3 py-3.5"><div className="w-[100px]"><SelectMenu value={cap(u.plan)} options={PLANS.map(cap)} onChange={(l) => changePlan(u, l.toLowerCase())} /></div></td>
                    <td className="px-3 py-3.5 text-[12px] text-[#6b6b6b] dark:text-white/60 whitespace-nowrap">{u.joined}</td>
                    <td className="px-3 py-3.5 text-right">
                      <RowActions u={u} onImpersonate={() => impersonate(u)} onToggleBan={() => toggleBan(u)} onDelete={() => setDelUser(u)} onViewDetails={() => setDetailUser(u)} onResetPassword={() => resetPassword(u)} onTogglePartner={() => togglePartner(u)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#f5f5f5] dark:divide-white/5">
            {paged.map((u) => (
              <div key={u.id} className={cn("p-4", u.banned && "bg-[#fdf2f2] dark:bg-[#e5484d]/[0.05]", sel.has(u.id) && "bg-[#fffdf2] dark:bg-[#ffd716]/[0.05]")}>
                <div className="flex items-start gap-3">
                  <div className="pt-1"><Check checked={sel.has(u.id)} onChange={() => toggleOne(u.id)} /></div>
                  <Avatar u={u} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1.5">{u.name || "—"} {u.verified && <BadgeCheck size={14} className="text-[#1e9df5]" />}</p>
                    <p className="text-[12px] text-[#9a9a9a] truncate">{u.email}</p>
                    <div className="mt-1.5 flex items-center gap-2"><StatusBadge u={u} /><span className="text-[11px] text-[#9a9a9a]">Joined {u.joined}</span></div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <SelectMenu value={roleLabel(u.role)} options={ROLES.map(roleLabel)} onChange={(l) => changeRole(u, l.toLowerCase())} />
                  <SelectMenu value={cap(u.plan)} options={PLANS.map(cap)} onChange={(l) => changePlan(u, l.toLowerCase())} />
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <RowActions u={u} onImpersonate={() => impersonate(u)} onToggleBan={() => toggleBan(u)} onDelete={() => setDelUser(u)} onViewDetails={() => setDetailUser(u)} onResetPassword={() => resetPassword(u)} onTogglePartner={() => togglePartner(u)} />
                </div>
              </div>
            ))}
          </div>

          {/* footer: numbered pagination */}
          {/* Footer: rows-per-page + range on the left, pagination on the right.
              Both halves are full-width and centred on mobile, where they stack —
              at 500 rows per page the number strip needs the whole row. */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-[#f0f0f0] dark:border-white/10 text-[13px] text-[#9a9a9a] flex-wrap max-sm:justify-center">
            <div className="flex items-center gap-2 flex-shrink-0">
              <label htmlFor="rows-per-page" className="text-[12px] whitespace-nowrap">Rows per page</label>
              {/* A native select on purpose. The popup panel of the custom
                  SelectMenu is absolutely positioned, and this footer sits
                  inside the card's `overflow-hidden` (needed for its rounded
                  corners), which clipped the options away entirely. A native
                  control renders its list above everything and, on mobile,
                  gets the OS picker. */}
              <div className="relative">
                <select
                  id="rows-per-page"
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }}
                  className="appearance-none w-[76px] pl-3 pr-7 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] text-[12.5px] font-medium text-[#1e1e1e] dark:text-white cursor-pointer hover:border-[#ffd716] focus:outline-none focus:border-[#ffd716] focus:ring-2 focus:ring-[#ffd716]/30 transition-colors tabular-nums"
                >
                  {PER_PAGE_OPTS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
              </div>
              {total > 0 && (
                <span className="hidden md:inline text-[12px] whitespace-nowrap tabular-nums">
                  {(safePage * perPage + 1).toLocaleString()}–{Math.min((safePage + 1) * perPage, total).toLocaleString()} of {total.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {/* Previous — the word is dropped on mobile so the number strip fits. */}
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} aria-label="Previous page"
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[12.5px] font-medium hover:bg-[#f5f5f5] dark:hover:bg-white/5 disabled:opacity-30 transition-colors">
                <ChevronLeft size={14} /> <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Page numbers */}
              {(() => {
                const pages: (number | "…")[] = [];
                if (pageCount <= 7) {
                  for (let i = 0; i < pageCount; i++) pages.push(i);
                } else {
                  pages.push(0);
                  if (safePage > 2) pages.push("…");
                  for (let i = Math.max(1, safePage - 1); i <= Math.min(pageCount - 2, safePage + 1); i++) pages.push(i);
                  if (safePage < pageCount - 3) pages.push("…");
                  pages.push(pageCount - 1);
                }
                return pages.map((p, i) =>
                  p === "…"
                    ? <span key={`e${i}`} className="w-8 text-center text-[#c0c0c0]">…</span>
                    : <button key={p} onClick={() => setPage(p)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-colors",
                          p === safePage
                            ? "bg-[#ffd716] text-[#1e1e1e]"
                            : "text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5"
                        )}>
                        {p + 1}
                      </button>
                );
              })()}

              {/* Next */}
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1} aria-label="Next page"
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[12.5px] font-medium hover:bg-[#f5f5f5] dark:hover:bg-white/5 disabled:opacity-30 transition-colors">
                <span className="hidden sm:inline">Next</span> <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!delUser} onClose={() => setDelUser(null)} title="Delete user" maxWidth="max-w-md">
        <p className="text-sm text-[#6b6b6b] dark:text-white/60">Permanently delete <span className="font-semibold text-[#1e1e1e] dark:text-white">{delUser?.name || delUser?.email}</span> and all their data (profile, jobs, products, applications…)? This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5"><GhostButton onClick={() => setDelUser(null)}>Cancel</GhostButton><button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-[#e5484d] text-white text-sm font-semibold hover:bg-[#d33a3f] transition-colors flex items-center gap-1.5"><Trash2 size={15} /> Delete</button></div>
      </Modal>

      <Modal open={bulkDel} onClose={() => setBulkDel(false)} title={`Delete ${sel.size} users`} maxWidth="max-w-md">
        <p className="text-sm text-[#6b6b6b] dark:text-white/60">Permanently delete <span className="font-semibold text-[#1e1e1e] dark:text-white">{sel.size} selected users</span> and all their data? This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5"><GhostButton onClick={() => setBulkDel(false)}>Cancel</GhostButton><button onClick={confirmBulkDelete} className="px-4 py-2 rounded-lg bg-[#e5484d] text-white text-sm font-semibold hover:bg-[#d33a3f] transition-colors flex items-center gap-1.5"><Trash2 size={15} /> Delete all</button></div>
      </Modal>

      <p className="mt-4 text-[12px] text-[#b3b3b3] flex items-center gap-1.5"><ShieldCheck size={13} /> Role changes, suspensions and deletions take effect immediately. <Sparkles size={12} /> Bulk actions apply to all selected across pages.</p>

      {/* User detail slide-over */}
      {detailUser && (
        <UserDetailPanel
          u={detailUser}
          onClose={() => setDetailUser(null)}
          onChangeRole={(role) => { changeRole(detailUser, role); setDetailUser({ ...detailUser, role }); }}
          onChangePlan={(plan) => { changePlan(detailUser, plan); setDetailUser({ ...detailUser, plan }); }}
          onToggleBan={() => { toggleBan(detailUser); setDetailUser({ ...detailUser, banned: !detailUser.banned }); }}
          onTogglePartner={() => { togglePartner(detailUser); setDetailUser({ ...detailUser, isPartner: !detailUser.isPartner }); }}
          onImpersonate={() => impersonate(detailUser)}
          onDelete={() => { setDelUser(detailUser); setDetailUser(null); }}
          onResetPassword={() => resetPassword(detailUser)}
        />
      )}
    </div>
  );
}
