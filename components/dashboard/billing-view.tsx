"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Receipt, Download, CreditCard, FileText, X, Search, CalendarClock } from "lucide-react";
import { cancelPlan } from "@/lib/services/plans";
import { naira } from "@/lib/entitlements";
import type { TxRow } from "@/lib/services/billing";
import { cn } from "@/lib/utils";

const STATUS: Record<string, string> = {
  success: "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]",
  pending: "bg-[#fef3c7] text-[#92400e] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]",
  failed: "bg-[#fde8e8] text-[#c0392b] dark:bg-[#ef4444]/15 dark:text-[#f87171]",
};
const TABS = [
  { key: "all", label: "View all" },
  { key: "success", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const PLAN_DESC: Record<string, string> = {
  Free: "The essentials to get started on Nomarc.",
  Plus: "More reach and tools for growing professionals.",
  Pro: "Full power for active teams and exhibitors.",
  Premium: "Everything, with priority access and support.",
};
const cycleMonths = (c: string) => (c === "annual" ? 12 : c === "biannual" ? 6 : 1);

function exportInvoices(txs: TxRow[], fmt: "csv" | "xls") {
  const cols = ["Invoice", "Plan", "Cycle", "Amount (NGN)", "Provider", "Status", "Date"];
  const data = txs.map((t) => [`INV-${t.reference.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`, t.planLabel, t.cycle, t.amount, t.provider, t.status, t.date]);
  const date = new Date().toISOString().slice(0, 10);
  const out = (type: string, content: string) => { const u = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = u; a.download = `nomarc-invoices-${date}.${fmt}`; a.click(); URL.revokeObjectURL(u); };
  if (fmt === "csv") { const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`; out("text/csv", [cols, ...data].map((r) => r.map(esc).join(",")).join("\n")); }
  else { const esc = (v: unknown) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); const b = [cols, ...data].map((r, i) => `<tr>${r.map((v) => `<t${i === 0 ? "h" : "d"}>${esc(v)}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join(""); out("application/vnd.ms-excel", `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table border="1">${b}</table></body></html>`); }
}

export function BillingView({ planLabel, isFree, txs, paymentPlansEnabled = true }: { planLabel: string; isFree: boolean; txs: TxRow[]; paymentPlansEnabled?: boolean }) {
  const [autoRenew, setAutoRenew] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const latest = txs.find((t) => t.status === "success") ?? txs[0];
  const perMonth = latest ? Math.round(latest.amount / cycleMonths(latest.cycle)) : 0;
  const filtered = useMemo(() => txs.filter((t) => (tab === "all" || t.status === tab) && (q === "" || `${t.planLabel} ${t.reference} ${t.cycle}`.toLowerCase().includes(q.toLowerCase()))), [txs, tab, q]);

  function cancel() {
    setBusy(true);
    cancelPlan().then(() => { toast.success("Subscription cancelled — moved to Free"); setTimeout(() => window.location.reload(), 700); })
      .catch((e) => { setBusy(false); toast.error(e instanceof Error ? e.message : "Couldn't cancel"); });
  }

  return (
    <div className="px-5 sm:px-8 py-6 max-w-[980px] mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">Plans & Billing</h1>
        <p className="text-[13px] text-[#9a9a9a] mt-0.5">Manage your plan, payment method and invoices.</p>
      </div>

      {/* current plan */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[12px] text-[#9a9a9a]">Current plan</p>
            <p className="text-2xl font-bold text-[#1e1e1e] dark:text-white">{planLabel}</p>
            <p className="text-[12.5px] text-[#9a9a9a] mt-1 max-w-md">{PLAN_DESC[planLabel] ?? (isFree ? "You're on the free plan." : "Your active subscription.")}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!isFree && perMonth > 0 && <div className="text-right"><p className="text-xl font-bold text-[#1e1e1e] dark:text-white">{naira(perMonth)}</p><p className="text-[11px] text-[#9a9a9a]">/month</p></div>}
            <div className="flex items-center gap-2">
              {!isFree && <button onClick={() => setConfirmCancel(true)} className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#e5484d] hover:border-[#e5484d]/40 transition-colors">Cancel plan</button>}
              {paymentPlansEnabled && (
                <Link href="/dashboard/plans" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors"><Sparkles size={15} /> {isFree ? "Upgrade plan" : "Change plan"}</Link>
              )}
            </div>
          </div>
        </div>
        {!isFree && (
          <div className="mt-4 pt-4 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">Auto-renew</span>
            <button type="button" role="switch" aria-checked={autoRenew} onClick={() => setAutoRenew((v) => !v)} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200", autoRenew ? "bg-[#16a34a]" : "bg-[#e3e3e3] dark:bg-white/20")}>
              <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200", autoRenew ? "translate-x-[22px]" : "translate-x-[2px]")} />
            </button>
          </div>
        )}
      </div>

      {/* next invoice + payment method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1.5"><CalendarClock size={15} className="text-[#caa400]" /> Next invoice</p>
          <p className="mt-2 text-2xl font-bold text-[#1e1e1e] dark:text-white">{isFree || !latest ? "—" : naira(latest.amount)}</p>
          <div className="mt-3 space-y-1.5 text-[12.5px]">
            <div className="flex justify-between"><span className="text-[#9a9a9a]">Plan</span><span className="font-medium text-[#1e1e1e] dark:text-white">{planLabel}{latest ? ` · ${latest.cycle}` : ""}</span></div>
            <div className="flex justify-between"><span className="text-[#9a9a9a]">Billing</span><span className="font-medium text-[#1e1e1e] dark:text-white">{isFree ? "No upcoming charge" : autoRenew ? `Renews ${latest ? latest.cycle : "monthly"}` : "Ends at cycle end"}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1.5"><CreditCard size={15} className="text-[#caa400]" /> Payment method</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#6b6b6b] dark:text-white/60"><CreditCard size={18} /></div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white capitalize">{latest ? latest.provider : "None on file"}{latest?.provider === "demo" ? " · no charge" : ""}</p>
              <p className="text-[12px] text-[#9a9a9a]">Gateway-managed & secure</p>
            </div>
          </div>
          <Link href="/dashboard/plans" className="mt-3 inline-block text-[12.5px] font-medium text-[#caa400] hover:underline">Add or update at checkout →</Link>
        </div>
      </div>

      {/* billing history */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-[#f0f0f0] dark:border-white/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Billing history</h2>
            {txs.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-32 sm:w-44 pl-8 pr-2 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#161616] text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
                </div>
                <button onClick={() => exportInvoices(filtered, "csv")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors"><Download size={13} /> CSV</button>
                <button onClick={() => exportInvoices(filtered, "xls")} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors"><Download size={13} /> Excel</button>
              </div>
            )}
          </div>
          {txs.length > 0 && (
            <div className="mt-3 flex items-center gap-1">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} className={cn("px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors", tab === t.key ? "bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>{t.label}</button>
              ))}
            </div>
          )}
        </div>

        {txs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-14">
            <div className="w-12 h-12 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"><Receipt size={22} /></div>
            <p className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">No invoices yet</p>
            <p className="mt-1 text-[13px] text-[#9a9a9a]">Upgrade a plan and your invoices will appear here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[13px] text-[#9a9a9a] py-12">No invoices match.</p>
        ) : (
          <>
            <table className="hidden sm:table w-full text-left">
              <thead><tr className="text-[11px] uppercase tracking-wider text-[#9a9a9a] border-b border-[#f0f0f0] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
                {["Invoice", "Plan", "Date", "Amount", "Status", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((t) => (
                    <motion.tr key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
                      <td className="px-5 py-3.5 text-[13px] font-mono text-[#6b6b6b] dark:text-white/60">INV-{t.reference.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-[#1e1e1e] dark:text-white">{t.planLabel} <span className="text-[#9a9a9a] font-normal capitalize">· {t.cycle}</span></td>
                      <td className="px-5 py-3.5 text-[13px] text-[#9a9a9a]">{t.date}</td>
                      <td className="px-5 py-3.5 text-[13px] font-medium text-[#1e1e1e] dark:text-white tabular-nums">{naira(t.amount)}</td>
                      <td className="px-5 py-3.5"><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", STATUS[t.status] ?? "bg-[#f0f0f0] text-[#6b6b6b]")}>{t.status}</span></td>
                      <td className="px-5 py-3.5 text-right"><Link href={`/dashboard/billing/invoice/${t.id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#caa400] hover:underline"><FileText size={13} /> Invoice</Link></td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            <div className="sm:hidden divide-y divide-[#f5f5f5] dark:divide-white/5">
              {filtered.map((t) => (
                <Link key={t.id} href={`/dashboard/billing/invoice/${t.id}`} className="block px-5 py-4 hover:bg-[#fafafa] dark:hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{t.planLabel}</p><p className="text-[12px] text-[#9a9a9a] capitalize">{t.cycle} · {t.date}</p></div>
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0", STATUS[t.status] ?? "bg-[#f0f0f0] text-[#6b6b6b]")}>{t.status}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{naira(t.amount)}</span>
                    <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#caa400]"><FileText size={12} /> Invoice</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* cancel confirm */}
      <AnimatePresence>
        {confirmCancel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmCancel(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-[400px] rounded-2xl bg-white dark:bg-[#1a1a1a] p-6 shadow-2xl">
              <button onClick={() => setConfirmCancel(false)} className="absolute top-4 right-4 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={17} /></button>
              <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">Cancel subscription?</h3>
              <p className="mt-1.5 text-[13px] text-[#9a9a9a]">You'll be moved to the Free plan and lose access to your paid tools. You can re-subscribe anytime.</p>
              <div className="mt-5 flex justify-end gap-2.5">
                <button onClick={() => setConfirmCancel(false)} className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60">Keep plan</button>
                <button onClick={cancel} disabled={busy} className="px-4 py-2 rounded-lg bg-[#e5484d] text-white text-[13px] font-bold hover:bg-[#d23b40] transition-colors disabled:opacity-60">{busy ? "Cancelling…" : "Yes, cancel"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function BillingSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-5 sm:px-8 py-6 max-w-[980px] mx-auto space-y-5">
      <div className="space-y-1.5">
        <S cls="h-7 w-48" />
        <S cls="h-3.5 w-72 max-w-full" />
      </div>
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <S cls="h-3 w-20" />
            <S cls="h-8 w-28" />
            <S cls="h-3 w-64 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <S cls="h-9 w-28 rounded-lg" />
            <S cls="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between">
          <S cls="h-3.5 w-24" />
          <S cls="h-6 w-11 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 space-y-3">
          <S cls="h-4 w-28" />
          <S cls="h-8 w-24" />
          <div className="space-y-1.5">
            <div className="flex justify-between"><S cls="h-3 w-10" /><S cls="h-3 w-28" /></div>
            <div className="flex justify-between"><S cls="h-3 w-12" /><S cls="h-3 w-36" /></div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 space-y-3">
          <S cls="h-4 w-32" />
          <div className="flex items-center gap-3">
            <S cls="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5"><S cls="h-3.5 w-28" /><S cls="h-3 w-40 max-w-full" /></div>
          </div>
          <S cls="h-3.5 w-36" />
        </div>
      </div>
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10">
          <S cls="h-4 w-28" />
          <S cls="h-8 w-28 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 sm:px-6 py-3.5 border-b border-[#f3f3f3] dark:border-white/5 last:border-0">
            <S cls="h-3.5 w-20 flex-shrink-0" />
            <S cls="h-3.5 flex-1 max-w-[200px]" />
            <S cls="h-3.5 w-16" />
            <S cls="h-6 w-16 rounded-full" />
            <S cls="h-3.5 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
