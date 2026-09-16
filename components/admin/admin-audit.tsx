"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, Search, Download, ChevronLeft, ChevronRight, Eye, ChevronDown } from "lucide-react";
import type { AuditRow } from "@/lib/services/admin";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { Pagination } from "@/components/ui/pagination";
import { r2Url } from "@/lib/r2-public";

const VERB: Record<string, string> = {
  set_plan: "Changed plan", set_role: "Changed role", suspend_user: "Suspended", unsuspend_user: "Reinstated",
  delete_user: "Deleted", verify: "Verified", unverify: "Unverified", impersonate: "Impersonated", kyc_rejected: "Rejected KYC",
};
function tone(action: string) {
  if (/delete|suspend|reject|unverify/.test(action)) return "bg-[#fde8e8] text-[#c0392b] dark:bg-[#ef4444]/15 dark:text-[#f87171]";
  if (/verify|unsuspend|approve/.test(action)) return "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]";
  if (/plan|role|update/.test(action)) return "bg-[#fef3c7] text-[#92400e] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]";
  if (/impersonate/.test(action)) return "bg-[#e0f2fe] text-[#0369a1] dark:bg-[#38bdf8]/15 dark:text-[#7dd3fc]";
  return "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60";
}
const label = (a: string) => VERB[a] ?? a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
function initials(n: string) { return n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "—"; }
const PER = ["15", "25", "50", "100"];

function exportLogs(rows: AuditRow[], fmt: "csv" | "xls") {
  const cols = ["User", "Email", "Action", "Subject", "Target", "Date"];
  const data = rows.map((r) => [r.actor, r.actorEmail, label(r.action), r.detail ?? r.targetType ?? "", r.targetId ?? "", r.date]);
  const date = new Date().toISOString().slice(0, 10);
  const out = (type: string, content: string) => { const u = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = u; a.download = `nomarc-audit-${date}.${fmt}`; a.click(); URL.revokeObjectURL(u); };
  if (fmt === "csv") { const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`; out("text/csv", [cols, ...data].map((r) => r.map(esc).join(",")).join("\n")); }
  else { const esc = (v: unknown) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); const b = [cols, ...data].map((r, i) => `<tr>${r.map((v) => `<t${i === 0 ? "h" : "d"}>${esc(v)}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join(""); out("application/vnd.ms-excel", `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table border="1">${b}</table></body></html>`); }
}

export function AdminAudit({ rows = [] }: { rows?: AuditRow[] }) {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("All actions");
  const [user, setUser] = useState("All users");
  const [perPage, setPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const actions = useMemo(() => ["All actions", ...[...new Set(rows.map((r) => r.action))].map(label)], [rows]);
  const users = useMemo(() => ["All users", ...[...new Set(rows.map((r) => r.actor))]], [rows]);

  /**
   * "When did it happen" needs a range, not just a sort. `from`/`to` are
   * date-only (yyyy-mm-dd) from <input type="date">, so `to` is pushed to the end
   * of that day; otherwise picking the same day for both matched nothing, since
   * every row's timestamp is after 00:00.
   */
  const inRange = (iso: string | null) => {
    if (!from && !to) return true;
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
    if (to && t > new Date(`${to}T23:59:59.999`).getTime()) return false;
    return true;
  };

  const filtered = useMemo(() => rows.filter((r) =>
    (action === "All actions" || label(r.action) === action) &&
    (user === "All users" || r.actor === user) &&
    inRange(r.dateRaw) &&
    (q === "" || `${r.actor} ${r.actorEmail} ${label(r.action)} ${r.detail ?? ""} ${r.targetType ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rows, action, user, q, from, to]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Security"
          title="Audit Logs"
          subtitle="Track all administrative actions and system events."
        />
      </DashBanner>

      <div className="flex items-end justify-between gap-4 flex-wrap mt-5">
        <div className="flex items-center gap-2">
          <button onClick={() => exportLogs(filtered, "csv")} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Download size={14} /> CSV</button>
          <button onClick={() => exportLogs(filtered, "xls")} className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Download size={14} /> Export logs</button>
        </div>
      </div>

      {/* toolbar */}
      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <div className="w-[150px]"><SelectMenu value={user} options={users} onChange={(v) => { setUser(v); setPage(0); }} /></div>
        <div className="w-[160px]"><SelectMenu value={action} options={actions} onChange={(v) => { setAction(v); setPage(0); }} /></div>
        <div className="flex items-center gap-1.5">
          <input
            type="date" value={from} max={to || undefined} aria-label="From date"
            onChange={(e) => { setFrom(e.target.value); setPage(0); }}
            className="rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] px-2.5 py-2 text-[12.5px] text-[#1e1e1e] dark:text-white focus:outline-none focus:border-[#ffd716]"
          />
          <span className="text-[12px] text-[#9a9a9a]">to</span>
          <input
            type="date" value={to} min={from || undefined} aria-label="To date"
            onChange={(e) => { setTo(e.target.value); setPage(0); }}
            className="rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] px-2.5 py-2 text-[12.5px] text-[#1e1e1e] dark:text-white focus:outline-none focus:border-[#ffd716]"
          />
          {(from || to) && (
            <button
              type="button" onClick={() => { setFrom(""); setTo(""); setPage(0); }}
              className="rounded-lg px-2 py-2 text-[12px] font-medium text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-[360px] ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search logs here" className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"><ScrollText size={22} /></div>
          <p className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">No matching logs</p>
          <p className="mt-1 text-[13px] text-[#9a9a9a]">Admin actions (roles, plans, suspensions, verifications) appear here.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          {/* desktop */}
          <table className="hidden md:table w-full text-left">
            <thead><tr className="text-[11px] uppercase tracking-wider text-[#9a9a9a] bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/10">
              {["User", "Action", "Date & Time", "Subject", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.id} className="border-b border-[#f5f5f5] dark:border-white/5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e] text-[11px] font-bold flex items-center justify-center flex-shrink-0">{initials(r.actor)}</span>
                      <div className="min-w-0"><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{r.actor}</p><p className="text-[11px] text-[#9a9a9a] truncate">{r.actorEmail}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", tone(r.action))}>{label(r.action)}</span></td>
                  <td className="px-5 py-3 text-[12.5px] text-[#6b6b6b] dark:text-white/60">{r.date}</td>
                  <td className="px-5 py-3 text-[12.5px] text-[#6b6b6b] dark:text-white/60">{r.detail ? `“${r.detail}”` : r.targetType ?? "—"}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => setOpen(open === r.id ? null : r.id)} className="text-[#9a9a9a] hover:text-[#caa400]"><Eye size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* mobile */}
          <div className="md:hidden divide-y divide-[#f5f5f5] dark:divide-white/5">
            {paged.map((r) => (
              <button key={r.id} onClick={() => setOpen(open === r.id ? null : r.id)} className="w-full text-left px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{r.actor}</span>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", tone(r.action))}>{label(r.action)}</span>
                </div>
                <p className="text-[12px] text-[#9a9a9a] mt-0.5">{r.date}{r.detail ? ` · “${r.detail}”` : ""}</p>
                <AnimatePresence>{open === r.id && (
                  <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-[11.5px] text-[#9a9a9a] mt-1">{r.actorEmail}{r.targetId ? ` · target ${r.targetId.slice(0, 8)}…` : ""}</motion.p>
                )}</AnimatePresence>
              </button>
            ))}
          </div>
          {/* footer */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[#f0f0f0] dark:border-white/10 text-[13px] text-[#9a9a9a] flex-wrap">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Per page</span>
              <div className="w-[74px]"><SelectMenu value={String(perPage)} options={PER} onChange={(v) => { setPerPage(Number(v)); setPage(0); }} /></div>
              <span className="hidden sm:inline">· {filtered.length} entries</span>
            </div>
            <div className="flex items-center gap-1">
              <Pagination page={safePage + 1} pageCount={pageCount} onPageChange={(p) => setPage(p - 1)} />
            </div>
          </div>
        </div>
      )}

      {/* desktop expanded detail */}
      <AnimatePresence>
        {open && (() => { const r = filtered.find((x) => x.id === open); if (!r) return null; return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="hidden md:block mt-3 rounded-2xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-3"><p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Log detail</p><button onClick={() => setOpen(null)} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white text-[12px]">Close</button></div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-[12.5px]">
              {[["Actor", r.actor], ["Email", r.actorEmail], ["Action", label(r.action)], ["Target type", r.targetType ?? "—"], ["Target id", r.targetId ?? "—"], ["When", r.date], ["Detail", r.detail ?? "—"]].map(([k, v]) => (
                <div key={k}><p className="text-[11px] text-[#9a9a9a]">{k}</p><p className="font-medium text-[#1e1e1e] dark:text-white break-words">{v}</p></div>
              ))}
            </div>
          </motion.div>
        ); })()}
      </AnimatePresence>
    </div>
  );
}
