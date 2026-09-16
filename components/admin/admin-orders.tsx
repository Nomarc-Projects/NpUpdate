"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Search, Download, Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { type AdminOrder } from "@/lib/services/admin";
import { cn } from "@/lib/utils";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pending",    color: "text-[#f59e0b]", bg: "bg-[#fef3c7] dark:bg-[#f59e0b]/15" },
  processing: { label: "Processing", color: "text-[#3b82f6]", bg: "bg-[#dbeafe] dark:bg-[#3b82f6]/15" },
  shipped:    { label: "Shipped",    color: "text-[#8b5cf6]", bg: "bg-[#ede9fe] dark:bg-[#8b5cf6]/15" },
  completed:  { label: "Completed",  color: "text-[#16a34a]", bg: "bg-[#dcfce7] dark:bg-[#16a34a]/15" },
  cancelled:  { label: "Cancelled",  color: "text-[#ef4444]", bg: "bg-[#fee2e2] dark:bg-[#ef4444]/15" },
};

export function AdminOrdersView({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search) { const q = search.toLowerCase(); return `${o.ref} ${o.customer} ${o.vendor}`.toLowerCase().includes(q); }
    return true;
  }), [orders, filter, search]);

  const gmv = orders.filter((o) => o.payment === "paid").reduce((s, o) => s + o.total, 0);

  function exportCsv() {
    const esc = (c: string) => `"${String(c).replace(/"/g, '""')}"`;
    const head = ["Ref", "Customer", "Vendor", "Items", "Total", "Payment", "Status", "Date"];
    const rows = filtered.map((o) => [o.ref, o.customer, o.vendor, o.itemCount, o.total, o.payment, o.status, o.date]);
    const csv = [head, ...rows].map((r) => r.map((v) => esc(String(v))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "admin-orders.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Orders"
          title="Orders"
          subtitle="Track and manage all marketplace orders."
        />
      </DashBanner>

      <div className="flex items-end justify-between gap-4 mt-5 mb-5 flex-wrap">
        <p className="text-[13px] text-[#9a9a9a]">{orders.length} total · {naira(gmv)} GMV</p>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:bg-[#ffd716]/5 transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: orders.length, icon: ShoppingBag, color: "text-[#6b6b6b]" },
          { label: "Pending", value: orders.filter((o) => o.status === "pending").length, icon: Clock, color: "text-[#f59e0b]" },
          { label: "Completed", value: orders.filter((o) => o.status === "completed").length, icon: CheckCircle2, color: "text-[#16a34a]" },
          { label: "Cancelled", value: orders.filter((o) => o.status === "cancelled").length, icon: XCircle, color: "text-[#ef4444]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 flex items-center gap-3">
            <s.icon size={18} className={s.color} />
            <div><p className="text-[18px] font-black text-[#1e1e1e] dark:text-white">{s.value}</p><p className="text-[10.5px] text-[#9a9a9a]">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ref, customer, vendor…"
            className="w-full sm:max-w-[360px] pl-9 pr-3 py-2 rounded-lg border border-[#e8e8e8] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[12.5px] text-[#1e1e1e] dark:text-white placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#ffd716] transition-colors" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", "pending", "processing", "shipped", "completed", "cancelled"].map((key) => {
            const count = key === "all" ? orders.length : orders.filter((o) => o.status === key).length;
            if (key !== "all" && count === 0) return null;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className={cn("px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all capitalize",
                  filter === key ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]" : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"
                )}>{key === "all" ? "All" : key} {count}</button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_80px_100px_80px_90px] gap-2 px-5 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/[0.06]">
          {["Customer", "Vendor", "Items", "Total", "Status", "Date"].map((h) => (
            <span key={h} className="text-[10.5px] font-bold uppercase tracking-widest text-[#b0b0b0] dark:text-white/30">{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-[#9a9a9a]">No orders found.</div>
        ) : (
          <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
            {filtered.map((o) => {
              const st = STATUS[o.status] ?? STATUS.pending;
              return (
                <div key={o.id} className="sm:grid sm:grid-cols-[1fr_1fr_80px_100px_80px_90px] gap-2 flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{o.customer}</p>
                    <p className="text-[11px] text-[#9a9a9a]">{o.ref}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/60 truncate">{o.vendorCompany ?? o.vendor}</p>
                  </div>
                  <span className="text-[12.5px] text-[#6b6b6b] dark:text-white/60">{o.itemCount}</span>
                  <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{naira(o.total)}</span>
                  <span className={cn("text-[10.5px] font-bold px-2 py-0.5 rounded-full capitalize w-fit", st.color, st.bg)}>{st.label}</span>
                  <span className="hidden sm:block text-[12px] text-[#9a9a9a] tabular-nums">{o.date}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="px-5 py-3 border-t border-[#f0f0f0] dark:border-white/10 text-[11.5px] text-[#9a9a9a]">
          Showing {filtered.length} of {orders.length} orders
        </div>
      </div>
    </div>
  );
}
