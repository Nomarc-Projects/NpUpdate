"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, ChevronRight, FileText, Search, Download, Package, MapPin } from "lucide-react";
import { DashBanner, BannerContent, bannerBtn, bannerPrimaryBtn } from "@/components/dashboard/dash-banner";
import { naira } from "@/lib/sample-catalog";
import type { OrderRow, OrderStatus } from "@/lib/services/orders";
import { TrackOrderDrawer } from "@/components/dashboard/buyer/track-order-drawer";
import { cn } from "@/lib/utils";
import { r2Url } from "@/lib/r2-public";

const STATUS_PILL: Record<OrderStatus, string> = {
  pending: "bg-[#fef3c7] text-[#92400e] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]",
  processing: "bg-[#e0f2fe] text-[#0369a1] dark:bg-[#38bdf8]/15 dark:text-[#7dd3fc]",
  shipped: "bg-[#ede9fe] text-[#6d28d9] dark:bg-[#a78bfa]/15 dark:text-[#c4b5fd]",
  completed: "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]",
  cancelled: "bg-[#fde8e8] text-[#c0392b] dark:bg-[#ef4444]/15 dark:text-[#f87171]",
};

const FILTERS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export function MyOrders({ orders }: { orders: OrderRow[] }) {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [tracking, setTracking] = useState<OrderRow | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match = `${o.ref} ${o.items.map((i) => i.name).join(" ")} ${o.date}`.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [orders, filter, search]);

  const totalSpent = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  function exportCsv() {
    const esc = (c: string) => `"${String(c).replace(/"/g, '""')}"`;
    const head = ["Ref", "Items", "Total", "Status", "Payment", "Date", "Address"];
    const rows = filtered.map((o) => [o.ref, o.items.map((i) => `${i.name} ×${i.qty}`).join("; "), o.total, o.status, o.payment, o.date, o.address]);
    const csv = [head, ...rows].map((r) => r.map((c) => esc(String(c))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "my-orders.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1100px] mx-auto">
      {/* Header banner */}
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Orders"
          title="My Orders"
          subtitle="Track your purchases and delivery status."
          actions={
            <>
              <button onClick={exportCsv} disabled={filtered.length === 0} className={bannerBtn}>
                <Download size={13} /> CSV
              </button>
              <Link href="/dashboard/products" className={bannerPrimaryBtn}>
                <Package size={14} /> Browse products
              </Link>
            </>
          }
        />
      </DashBanner>
      <div className="mt-5" />

      {/* Search + filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders by ref, product name…"
            className="w-full sm:max-w-[360px] pl-9 pr-3 py-2 rounded-lg border border-[#e8e8e8] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[12.5px] text-[#1e1e1e] dark:text-white placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#ffd716] transition-colors" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(({ key, label }) => {
            const count = key === "all" ? orders.length : orders.filter((o) => o.status === key).length;
            if (key !== "all" && count === 0) return null;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all",
                  filter === key
                    ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]"
                    : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"
                )}>
                {label} {count}
              </button>
            );
          })}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><ShoppingBag size={22} /></div>
          <p className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">No orders yet</p>
          <p className="mt-1 text-[13px] text-[#9a9a9a] max-w-sm">Browse the marketplace and place an order, or accept a supplier&apos;s quote.</p>
          <Link href="/dashboard/products" className="mt-4 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">Browse products</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[13px] text-[#9a9a9a]">No orders match your filter.</div>
      ) : (
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_100px_80px_100px_80px_70px] gap-2 px-5 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/[0.06]">
            {["Order", "Total", "Status", "Date", "", ""].map((h, i) => (
              <span key={i} className="text-[10.5px] font-bold uppercase tracking-widest text-[#b0b0b0] dark:text-white/30">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
            {filtered.map((o) => (
              <div key={o.id}
                role="link" tabIndex={0}
                onClick={() => { window.location.href = `/dashboard/orders/${o.id}/invoice`; }}
                onKeyDown={(e) => { if (e.key === "Enter") window.location.href = `/dashboard/orders/${o.id}/invoice`; }}
                className="sm:grid sm:grid-cols-[1fr_100px_80px_100px_80px_70px] gap-2 flex items-center justify-between px-5 py-3.5 hover:bg-[#ffd716]/[0.03] transition-colors cursor-pointer"
              >
                {/* Order info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] dark:bg-white/5 overflow-hidden flex-shrink-0">
                    {o.items[0]?.image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={o.items[0].image} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[#c9c9c9]"><ShoppingBag size={16} /></div>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">
                      {o.items[0]?.name ?? "Order"}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}
                    </p>
                    <p className="text-[11px] text-[#9a9a9a] mt-0.5">{o.ref} · {o.items.length} item{o.items.length > 1 ? "s" : ""}</p>
                  </div>
                </div>
                {/* Total */}
                <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{naira(o.total)}</span>
                {/* Status */}
                <div><span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_PILL[o.status]}`}>{o.status}</span></div>
                {/* Date */}
                <span className="hidden sm:block text-[12px] text-[#9a9a9a] tabular-nums">{o.date}</span>
                {/* Track */}
                <button
                  onClick={(e) => { e.stopPropagation(); setTracking(o); }}
                  className="hidden sm:inline-flex items-center gap-1 text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
                >
                  <MapPin size={12} /> Track
                </button>
                {/* Invoice link */}
                <span className="hidden sm:inline-flex items-center gap-1 text-[12px] font-medium text-[#caa400] hover:underline"><FileText size={12} /> Invoice</span>
                <div className="flex items-center gap-1 sm:hidden flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setTracking(o); }} aria-label="Track order" className="w-7 h-7 flex items-center justify-center text-[#9a9a9a]"><MapPin size={15} /></button>
                  <ChevronRight size={16} className="text-[#c9c9c9]" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#f0f0f0] dark:border-white/10 text-[11.5px] text-[#9a9a9a]">
            Showing {filtered.length} of {orders.length} orders
          </div>
        </div>
      )}

      <TrackOrderDrawer order={tracking} open={!!tracking} onClose={() => setTracking(null)} />
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function MyOrdersSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1100px] mx-auto">
      <div className="mb-5 space-y-1.5"><S cls="h-7 w-28" /><S cls="h-3.5 w-64 max-w-full" /></div>
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] divide-y divide-[#f5f5f5] dark:divide-white/5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 sm:px-5 py-3.5">
            <S cls="w-11 h-11 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5"><S cls="h-3.5 w-40 max-w-[70%]" /><S cls="h-3 w-32 max-w-[50%]" /></div>
            <S cls="hidden sm:block h-3.5 w-16" />
            <S cls="h-6 w-20 rounded-full flex-shrink-0" />
            <S cls="hidden sm:block h-3.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
