"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, LayoutGrid, Table2, TrendingUp, ChevronRight, ChevronLeft, X, ShoppingBag, Wallet, Clock, CheckCircle } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { setOrderStatus, type OrderRow, type OrderStatus } from "@/lib/services/orders";
import { SelectMenu } from "@/components/ui/select-menu";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";
import { DashBanner, BannerContent, bannerBtn } from "@/components/dashboard/dash-banner";
import { Pagination } from "@/components/ui/pagination";
import { r2Url } from "@/lib/r2-public";

const PER_PAGE_OPTS = ["15", "25", "50", "100"];

function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(); }}
      className={cn("w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center flex-shrink-0 transition-colors", checked ? "bg-[#ffd716] border-[#ffd716] text-[#1e1e1e]" : "border-[#d4d4d4] dark:border-white/25 hover:border-[#ffd716]")}>
      {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );
}

const OCOLS = ["Ref", "Customer", "Company", "Date", "Total", "Payment", "Status"];
const orowOf = (o: OrderRow) => [o.ref, o.customer, o.company, o.date, o.total, o.payment, o.status];
function odl(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function ordersCsv(rows: OrderRow[]) {
  const esc = (c: unknown) => `"${String(c).replace(/"/g, '""')}"`;
  return [OCOLS, ...rows.map(orowOf)].map((r) => r.map(esc).join(",")).join("\n");
}
function ordersXls(rows: OrderRow[]) {
  const esc = (c: unknown) => String(c).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = [OCOLS, ...rows.map(orowOf)].map((r, i) => `<tr>${r.map((c) => `<t${i === 0 ? "h" : "d"}>${esc(c)}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join("");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`;
}

const STATUS_PILL: Record<OrderStatus, string> = {
  pending: "bg-[#fef3c7] text-[#92400e] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]",
  processing: "bg-[#e0f2fe] text-[#0369a1] dark:bg-[#38bdf8]/15 dark:text-[#7dd3fc]",
  shipped: "bg-[#ede9fe] text-[#6d28d9] dark:bg-[#a78bfa]/15 dark:text-[#c4b5fd]",
  completed: "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]",
  cancelled: "bg-[#fde8e8] text-[#c0392b] dark:bg-[#ef4444]/15 dark:text-[#f87171]",
};
const PAY_PILL: Record<string, string> = {
  paid: "text-[#16a34a]", pending: "text-[#ea580c]", refunded: "text-[#9a9a9a]",
};
const BOARD: OrderStatus[] = ["pending", "processing", "shipped", "completed"];

function Sparkline({ up = true }: { up?: boolean }) {
  const pts = up ? "0,18 12,14 24,16 36,9 48,11 60,5 72,7 84,2" : "0,4 12,8 24,6 36,12 48,10 60,15 72,13 84,18";
  return <svg viewBox="0 0 84 20" className="w-20 h-6" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={up ? "#16a34a" : "#e5484d"} strokeWidth="2" strokeLinecap="round" /></svg>;
}

function StatCard({ label, value, prefix, delta, up, icon: Icon }: { label: string; value: number; prefix?: string; delta: string; up?: boolean; icon: typeof ShoppingBag }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      animate={{ y: hovered ? -2 : 0, boxShadow: hovered ? "0 14px 40px rgba(0,0,0,0.16)" : "0 4px 18px rgba(0,0,0,0.10)" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 cursor-default"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] text-[#9a9a9a]">{label}</p>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors", hovered ? "bg-[#ffd716]/15" : "bg-[#f4f4f4] dark:bg-white/5")}>
          <motion.span
            animate={hovered ? { scale: 1.25, rotate: [0, -14, 11, -7, 0], y: [0, -4, 0] } : { scale: 1, rotate: 0, y: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <Icon size={13} className={hovered ? "text-[#b89500]" : "text-[#bbb] dark:text-white/30"} />
          </motion.span>
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <NumberTicker value={value} prefix={prefix} className="text-xl font-bold text-[#1e1e1e] dark:text-white" />
        <Sparkline up={up} />
      </div>
      <p className={cn("text-[11px] font-semibold mt-1", up ? "text-[#16a34a]" : "text-[#e5484d]")}><TrendingUp size={11} className="inline" /> {delta} last week</p>
    </motion.div>
  );
}

export function OrdersView({ orders = [] }: { orders?: OrderRow[] }) {
  const router = useRouter();
  const [list, setList] = useState(orders);
  const [view, setView] = useState<"table" | "board">("table");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [q, setQ] = useState("");
  const [perPage, setPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => list.filter((o) => (filter === "all" || o.status === filter) && (q === "" || `${o.ref} ${o.customer} ${o.company}`.toLowerCase().includes(q.toLowerCase()))), [list, filter, q]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const paged = view === "table" ? filtered.slice(safePage * perPage, safePage * perPage + perPage) : filtered;

  const selectedRows = useMemo(() => list.filter((o) => sel.has(o.id)), [list, sel]);
  const allOnPage = paged.length > 0 && paged.every((o) => sel.has(o.id));
  const toggleOne = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllOnPage = () => setSel((s) => { const n = new Set(s); if (allOnPage) paged.forEach((o) => n.delete(o.id)); else paged.forEach((o) => n.add(o.id)); return n; });
  const clearSel = () => setSel(new Set());

  function exportRows(rows: OrderRow[], fmt: "csv" | "xls") {
    const date = new Date().toISOString().slice(0, 10);
    if (fmt === "csv") odl(`nomarc-orders-${date}.csv`, "text/csv", ordersCsv(rows));
    else odl(`nomarc-orders-${date}.xls`, "application/vnd.ms-excel", ordersXls(rows));
    toast.success(`${rows.length} exported`);
  }
  function bulkStatus(status: OrderStatus) {
    const ids = [...sel]; const prev = list;
    setList((l) => l.map((o) => (sel.has(o.id) ? { ...o, status } : o)));
    toast.success(`${ids.length} order${ids.length > 1 ? "s" : ""} → ${status}`);
    Promise.all(ids.map((id) => setOrderStatus(id, status))).then(() => router.refresh()).catch(() => { setList(prev); toast.error("Some updates failed"); });
    clearSel();
  }

  const totalRev = list.filter((o) => o.payment === "paid").reduce((s, o) => s + o.total, 0);

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      <DashBanner image={r2Url("site/photo-1586528116311-ad8dd3c8310d.jpg")} overlap>
        <BannerContent
          eyebrow="Marketplace"
          title="Orders"
          subtitle="Track, fulfil and manage orders from buyers."
          actions={
            <>
              <button onClick={() => exportRows(filtered, "csv")} className={bannerBtn}><Download size={14} /> CSV</button>
              <button onClick={() => exportRows(filtered, "xls")} className={cn(bannerBtn, "hidden sm:inline-flex")}><Download size={14} /> Excel</button>
            </>
          }
        />
      </DashBanner>

      {/* stat cards overlapping banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 -mt-16 relative z-10 mb-5 px-[5%]">
        <StatCard icon={ShoppingBag} label="Total orders" value={list.length} delta="+25.2%" up />
        <StatCard icon={Wallet} label="Revenue (paid)" value={totalRev} prefix="₦" delta="+18.2%" up />
        <StatCard icon={Clock} label="Awaiting fulfilment" value={list.filter((o) => o.status === "pending" || o.status === "processing").length} delta="-1.2%" />
        <StatCard icon={CheckCircle} label="Completed" value={list.filter((o) => o.status === "completed").length} delta="+12.2%" up />
      </div>

      {/* toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(["all", ...BOARD, "cancelled"] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(0); }} className={cn("px-3 py-1.5 rounded-lg text-[12.5px] font-medium capitalize whitespace-nowrap transition-colors", filter === f ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]" : "text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5")}>{f}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search orders…" className="w-44 sm:w-56 pl-9 pr-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[#e3e3e3] dark:border-white/15 p-0.5">
            {([["table", Table2], ["board", LayoutGrid]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} className={cn("p-1.5 rounded-md transition-colors", view === v ? "bg-[#fff7cc] dark:bg-white/10 text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}><Icon size={16} /></button>
            ))}
          </div>
        </div>
      </div>

      {/* bulk bar */}
      {sel.size > 0 && (
        <div className="mt-4 flex items-center gap-3 flex-wrap rounded-xl border border-[#ffd716]/50 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] px-4 py-2.5">
          <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{sel.size} selected</span>
          <button onClick={clearSel} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={15} /></button>
          <div className="h-4 w-px bg-[#e3e3e3] dark:bg-white/15" />
          <div className="w-[150px]"><SelectMenu value="Mark as…" options={["Processing", "Shipped", "Completed", "Cancelled"]} onChange={(l) => bulkStatus(l.toLowerCase() as OrderStatus)} /></div>
          <button onClick={() => exportRows(selectedRows, "csv")} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white"><Download size={14} /> Export selected</button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Table2 size={22} /></div>
          <p className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">No orders yet</p>
          <p className="mt-1 text-[13px] text-[#9a9a9a] max-w-sm">Orders appear here when buyers purchase your products or accept your quotes.</p>
          <Link href="/dashboard/my-products" className="mt-4 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">Manage products</Link>
        </div>
      ) : view === "table" ? (
        <div className="mt-4 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          {/* desktop */}
          <table className="hidden md:table w-full text-left">
            <thead><tr className="text-[11px] uppercase tracking-wider text-[#9a9a9a] bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/10">
              <th className="px-4 py-3"><Check checked={allOnPage} onChange={toggleAllOnPage} /></th>
              {["Order", "Customer", "Date", "Items", "Total", "Payment", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {paged.map((o) => (
                <tr key={o.id} className={cn("border-b border-[#f5f5f5] dark:border-white/5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02]", sel.has(o.id) && "bg-[#fffdf2] dark:bg-[#ffd716]/[0.05]")}>
                  <td className="px-4 py-3"><Check checked={sel.has(o.id)} onChange={() => toggleOne(o.id)} /></td>
                  <td className="px-4 py-3"><Link href={`/dashboard/orders/${o.id}`} className="text-sm font-semibold text-[#1e1e1e] dark:text-white hover:text-[#caa400]">{o.ref}</Link></td>
                  <td className="px-4 py-3"><p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">{o.customer}</p><p className="text-[11px] text-[#9a9a9a]">{o.company}</p></td>
                  <td className="px-4 py-3 text-[12.5px] text-[#9a9a9a]">{o.date}</td>
                  <td className="px-4 py-3 text-[12.5px] text-[#6b6b6b] dark:text-white/60">{o.items.length} item{o.items.length > 1 ? "s" : ""}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#1e1e1e] dark:text-white tabular-nums">{naira(o.total)}</td>
                  <td className="px-4 py-3"><span className={cn("text-[12px] font-semibold capitalize", PAY_PILL[o.payment])}>{o.payment}</span></td>
                  <td className="px-4 py-3"><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", STATUS_PILL[o.status])}>{o.status}</span></td>
                  <td className="px-4 py-3 text-right"><Link href={`/dashboard/orders/${o.id}`} className="text-[#c9c9c9] hover:text-[#caa400]"><ChevronRight size={16} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* mobile */}
          <div className="md:hidden divide-y divide-[#f5f5f5] dark:divide-white/5">
            {paged.map((o) => (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="block px-4 py-3.5 hover:bg-[#fafafa] dark:hover:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{o.ref}</span>
                  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", STATUS_PILL[o.status])}>{o.status}</span>
                </div>
                <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/60 mt-0.5">{o.customer} · {o.company}</p>
                <div className="mt-1.5 flex items-center justify-between"><span className="text-[12px] text-[#9a9a9a]">{o.date} · {o.items.length} items</span><span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{naira(o.total)}</span></div>
              </Link>
            ))}
          </div>
          {/* per-page + pagination */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[#f0f0f0] dark:border-white/10 text-[13px] text-[#9a9a9a] flex-wrap">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Per page</span>
              <div className="w-[74px]"><SelectMenu value={String(perPage)} options={PER_PAGE_OPTS} onChange={(v) => { setPerPage(Number(v)); setPage(0); }} /></div>
              <span className="hidden sm:inline">· {filtered.length} total</span>
            </div>
            <div className="flex items-center gap-1">
              <Pagination page={safePage + 1} pageCount={pageCount} onPageChange={(p) => setPage(p - 1)} />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BOARD.map((col) => {
            const colItems = filtered.filter((o) => o.status === col);
            return (
              <div key={col} className="rounded-2xl bg-[#fafafa] dark:bg-white/[0.02] p-3">
                <div className="flex items-center justify-between px-1 mb-2"><span className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white capitalize">{col}</span><span className="text-[11px] text-[#9a9a9a]">{colItems.length}</span></div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {colItems.map((o) => (
                      <motion.div key={o.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Link href={`/dashboard/orders/${o.id}`} className="block rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3 hover:border-[#ffd716] transition-colors">
                          <div className="flex items-center justify-between"><span className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{o.ref}</span><span className={cn("text-[11px] font-semibold", PAY_PILL[o.payment])}>{o.payment}</span></div>
                          <p className="text-[12px] text-[#6b6b6b] dark:text-white/60 mt-0.5 truncate">{o.customer}</p>
                          <p className="text-[12px] text-[#9a9a9a] truncate">{o.items[0].name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}</p>
                          <div className="mt-2 flex items-center justify-between"><span className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">{naira(o.total)}</span><span className="text-[11px] text-[#9a9a9a]">{o.date}</span></div>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {colItems.length === 0 && <p className="text-[12px] text-[#b3b3b3] text-center py-4">No orders</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function OrdersSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  const counts = [3, 2, 2, 1];
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6">
      {/* banner skeleton */}
      <div className="skeleton rounded-2xl h-[130px] sm:h-[142px] w-full" />
      {/* overlapping stat card skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 -mt-16 relative z-10 mb-5 px-[5%]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 space-y-3">
            <div className="flex items-start justify-between">
              <S cls="h-3 w-20" />
              <S cls="w-7 h-7 rounded-lg" />
            </div>
            <S cls="h-6 w-24" />
            <S cls="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* filter toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex gap-1.5">{Array.from({length:5}).map((_,i) => <S key={i} cls="h-7 w-16 rounded-lg" />)}</div>
        <div className="flex gap-2"><S cls="h-9 w-44 rounded-lg" /><S cls="h-9 w-20 rounded-lg" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["Pending","Confirmed","Shipped","Completed"].map((col, ci) => (
          <div key={col} className="rounded-2xl bg-[#fafafa] dark:bg-white/[0.02] p-3">
            <div className="flex items-center justify-between px-1 mb-2"><S cls="h-3.5 w-20" /><S cls="h-3.5 w-4" /></div>
            <div className="space-y-2">
              {Array.from({ length: counts[ci] }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3 space-y-1.5">
                  <div className="flex items-center justify-between"><S cls="h-3.5 w-16" /><S cls="h-3 w-12" /></div>
                  <S cls="h-3 w-24" /><S cls="h-3 w-20" />
                  <div className="flex items-center justify-between pt-0.5"><S cls="h-4 w-16" /><S cls="h-3 w-14" /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
