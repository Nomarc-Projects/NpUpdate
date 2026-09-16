"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Download, X, ShoppingBag, MessageSquare,
  ArrowRight, Mail, Phone, MapPin, Building2, TrendingUp,
  RefreshCw, Star,
} from "lucide-react";
import { DashBanner, BannerContent, bannerBtn } from "@/components/dashboard/dash-banner";
import { naira } from "@/lib/sample-catalog";
import { getCustomerOrders, type CustomerRow } from "@/lib/services/customers";
import { cn } from "@/lib/utils";
import { r2Url } from "@/lib/r2-public";

type Filter = "all" | "repeat" | "new" | "inactive";

function CustStatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      animate={{ y: hov ? -2 : 0, boxShadow: hov ? "0 14px 40px rgba(0,0,0,0.16)" : "0 4px 18px rgba(0,0,0,0.10)" }}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 cursor-default"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10.5px] font-semibold text-[#9a9a9a] dark:text-white/50">{label}</span>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors", hov ? "bg-[#ffd716]/15" : "bg-[#f4f4f4] dark:bg-white/5")}>
          <motion.span
            animate={hov ? { scale: 1.25, rotate: [0, -14, 11, -7, 0], y: [0, -4, 0] } : { scale: 1, rotate: 0, y: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <Icon size={13} className={hov ? "text-[#b89500]" : "text-[#bbb] dark:text-white/30"} />
          </motion.span>
        </div>
      </div>
      <p className="text-[18px] font-black text-[#1e1e1e] dark:text-white">{value}</p>
    </motion.div>
  );
}

function StatusTag({ orderCount, lastOrderDate }: { orderCount: number; lastOrderDate: string }) {
  const daysSince = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86_400_000);
  if (orderCount >= 2) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#16a34a] dark:bg-[#16a34a]/15">Repeat</span>;
  if (daysSince <= 30) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dbeafe] text-[#2563eb] dark:bg-[#3b82f6]/15">New</span>;
  if (daysSince > 90) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#6b7280] dark:bg-white/10">Inactive</span>;
  return null;
}

function CustomerDetail({ customer, onClose }: { customer: CustomerRow; onClose: () => void }) {
  const [orders, setOrders] = useState<{ id: string; status: string; total: number; payment: string; date: string; items: { name: string; qty: number }[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerOrders(customer.buyerUserId).then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, [customer.buyerUserId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        className="relative z-10 w-full max-w-[440px] h-full overflow-y-auto bg-white dark:bg-[#1a1a1a] shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1a1a1a] flex items-center justify-between p-5 border-b border-[#f0f0f0] dark:border-white/10">
          <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Customer Details</h2>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
        </div>

        {/* Profile */}
        <div className="p-5 border-b border-[#f0f0f0] dark:border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#ffd716]/15 flex items-center justify-center text-[#b89500] font-bold text-lg">
              {customer.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{customer.name}</p>
              {customer.company && <p className="text-[12px] text-[#9a9a9a]">{customer.company}</p>}
            </div>
          </div>
          <div className="space-y-2">
            {customer.email && (
              <div className="flex items-center gap-2.5 text-[12.5px] text-[#6b6b6b] dark:text-white/60">
                <Mail size={13} className="text-[#9a9a9a] flex-shrink-0" /> {customer.email}
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2.5 text-[12.5px] text-[#6b6b6b] dark:text-white/60">
                <Phone size={13} className="text-[#9a9a9a] flex-shrink-0" /> {customer.phone}
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2.5 text-[12.5px] text-[#6b6b6b] dark:text-white/60">
                <MapPin size={13} className="text-[#9a9a9a] flex-shrink-0" /> {customer.address}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Link href="/dashboard/messages" className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12px] font-semibold hover:bg-[#e6c114] transition-colors">
              <MessageSquare size={13} /> Message
            </Link>
            <Link href="/dashboard/quotes" className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
              Send Quote
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-[#f0f0f0] dark:border-white/10">
          {[
            { label: "Orders", value: customer.orderCount },
            { label: "Total Spent", value: naira(customer.totalSpent) },
            { label: "Avg Order", value: naira(customer.orderCount > 0 ? Math.round(customer.totalSpent / customer.orderCount) : 0) },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[18px] font-black text-[#1e1e1e] dark:text-white">{s.value}</p>
              <p className="text-[10.5px] text-[#9a9a9a] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="px-5 py-3 border-b border-[#f0f0f0] dark:border-white/10 flex justify-between text-[11.5px] text-[#9a9a9a]">
          <span>First order: {customer.firstOrderDate}</span>
          <span>Last order: {customer.lastOrderDate}</span>
        </div>

        {/* Order history */}
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40 mb-3">Order History</p>
          {loading ? (
            <p className="text-[13px] text-[#9a9a9a] py-4 text-center">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-[13px] text-[#9a9a9a] py-4 text-center">No orders found.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`}
                  className="block rounded-xl border border-[#ececec] dark:border-white/10 p-3 hover:border-[#ffd716] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{naira(o.total)}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                      o.status === "completed" ? "bg-[#dcfce7] text-[#16a34a]" :
                      o.status === "cancelled" ? "bg-[#fee2e2] text-[#ef4444]" :
                      "bg-[#fef3c7] text-[#f59e0b]"
                    )}>{o.status}</span>
                  </div>
                  <p className="text-[11px] text-[#9a9a9a]">
                    {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                  </p>
                  <p className="text-[10.5px] text-[#b0b0b0] mt-1">{o.date}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function CustomersView({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CustomerRow | null>(null);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${c.name} ${c.email} ${c.company ?? ""}`.toLowerCase().includes(q)) return false;
      }
      if (filter === "repeat" && c.orderCount < 2) return false;
      if (filter === "new") {
        const daysSince = Math.floor((Date.now() - new Date(c.firstOrderDate).getTime()) / 86_400_000);
        if (daysSince > 30) return false;
      }
      if (filter === "inactive") {
        const daysSince = Math.floor((Date.now() - new Date(c.lastOrderDate).getTime()) / 86_400_000);
        if (daysSince <= 90) return false;
      }
      return true;
    });
  }, [customers, search, filter]);

  const repeatCount = customers.filter((c) => c.orderCount >= 2).length;
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);

  function exportCsv() {
    const esc = (c: string) => `"${String(c).replace(/"/g, '""')}"`;
    const head = ["Name", "Email", "Company", "Phone", "Orders", "Total Spent", "First Order", "Last Order", "Address"];
    const rows = filtered.map((c) => [c.name, c.email, c.company ?? "", c.phone ?? "", c.orderCount, c.totalSpent, c.firstOrderDate, c.lastOrderDate, c.address ?? ""]);
    const csv = [head, ...rows].map((r) => r.map((v) => esc(String(v))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "customers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1100px] mx-auto">
      <DashBanner image={r2Url("site/photo-1521737604893-d14cc237f11d.jpg")} overlap>
        <BannerContent
          eyebrow="CRM"
          title="Customers"
          subtitle={`${customers.length} customers · ${repeatCount} repeat · ${naira(totalRevenue)} total revenue`}
          actions={
            <button onClick={exportCsv} disabled={filtered.length === 0} className={cn(bannerBtn, "disabled:opacity-40")}>
              <Download size={13} /> Export CSV
            </button>
          }
        />
      </DashBanner>

      {/* Stat cards overlapping banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mt-16 relative z-10 mb-6 px-[5%]">
        <CustStatCard icon={Users} label="Total Customers" value={customers.length} />
        <CustStatCard icon={RefreshCw} label="Repeat Buyers" value={repeatCount} />
        <CustStatCard icon={TrendingUp} label="Total Revenue" value={naira(totalRevenue)} />
        <CustStatCard icon={Star} label="Avg Order Value" value={naira(customers.length > 0 ? Math.round(totalRevenue / customers.reduce((s, c) => s + c.orderCount, 0) || 0) : 0)} />
      </div>

      {/* Search + filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or company…"
            className="w-full sm:max-w-[360px] pl-9 pr-3 py-2 rounded-lg border border-[#e8e8e8] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[12.5px] text-[#1e1e1e] dark:text-white placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#ffd716] transition-colors" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: "all" as Filter, label: "All" },
            { key: "repeat" as Filter, label: "Repeat buyers" },
            { key: "new" as Filter, label: "New (30d)" },
            { key: "inactive" as Filter, label: "Inactive (90d+)" },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all",
                filter === key
                  ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]"
                  : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] mb-3"><Users size={22} /></div>
          <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">No customers yet</p>
          <p className="text-[13px] text-[#9a9a9a] mt-1 max-w-sm">When buyers place orders, they&apos;ll appear here as your customer base.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_100px_60px] gap-2 px-5 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/[0.06]">
            {["Customer", "Orders", "Total Spent", "Last Order", ""].map((h) => (
              <span key={h} className="text-[10.5px] font-bold uppercase tracking-widest text-[#b0b0b0] dark:text-white/30">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
            {filtered.map((c) => (
              <button key={c.buyerUserId} onClick={() => setSelected(c)}
                className="w-full sm:grid sm:grid-cols-[1fr_100px_100px_100px_60px] gap-2 flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#ffd716]/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#ffd716]/15 flex items-center justify-center text-[#b89500] text-[11px] font-bold flex-shrink-0">
                    {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{c.name}</p>
                      <StatusTag orderCount={c.orderCount} lastOrderDate={c.lastOrderDate} />
                    </div>
                    <p className="text-[11px] text-[#9a9a9a] truncate">{c.company ?? c.email}</p>
                  </div>
                </div>
                <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{c.orderCount}</span>
                <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white tabular-nums">{naira(c.totalSpent)}</span>
                <span className="hidden sm:block text-[12px] text-[#9a9a9a] tabular-nums">{c.lastOrderDate}</span>
                <ArrowRight size={14} className="text-[#c9c9c9] flex-shrink-0" />
              </button>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-[#f0f0f0] dark:border-white/10 text-[11.5px] text-[#9a9a9a]">
            Showing {filtered.length} of {customers.length} customers
          </div>
        </div>
      )}

      <AnimatePresence>
        {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ─── Co-located loading skeleton ─────────────────────────────────────────── */
export function CustomersSkeleton() {
  const S = ({ cls = "" }: { cls?: string }) => <div className={`skeleton rounded-md ${cls}`} />;
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1100px] mx-auto">
      {/* banner skeleton */}
      <S cls="rounded-2xl h-[130px] sm:h-[142px] w-full" />
      {/* overlapping stat card skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mt-16 relative z-10 mb-6 px-[5%]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <S cls="h-3 w-24" />
              <S cls="w-7 h-7 rounded-lg" />
            </div>
            <S cls="h-5 w-20" />
          </div>
        ))}
      </div>
      {/* search + filters */}
      <div className="mb-4 space-y-3">
        <S cls="h-9 w-full sm:max-w-[360px] rounded-lg" />
        <div className="flex gap-1.5">{Array.from({ length: 4 }).map((_, i) => <S key={i} cls="h-7 w-20 rounded-full" />)}</div>
      </div>
      {/* table header */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_100px_60px] gap-2 px-5 py-2.5 rounded-t-xl bg-[#fafafa] dark:bg-white/[0.02]">
        {["Name", "Orders", "Spent", "Last order", ""].map((h, i) => (
          <S key={i} cls={`h-3 ${i === 0 ? "w-20" : "w-12 mx-auto"}`} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#f5f5f5] dark:border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <S cls="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="space-y-1.5"><S cls="h-3.5 w-32" /><S cls="h-3 w-24" /></div>
          </div>
          <div className="flex items-center gap-6">
            <S cls="hidden sm:block h-3 w-8" />
            <S cls="hidden sm:block h-3 w-16" />
            <S cls="hidden sm:block h-3 w-20" />
            <S cls="h-3 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
