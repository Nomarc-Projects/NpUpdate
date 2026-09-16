"use client";

import { TrendingUp, Package, Users, BarChart3, AlertCircle, Repeat2, UserPlus, Clock, MessageSquare } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { type InsightsData } from "@/lib/services/admin";
import { cn } from "@/lib/utils";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: typeof TrendingUp; label: string; value: string | number; sub: string; accent: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11.5px] font-semibold text-[#9a9a9a] dark:text-white/50">{label}</p>
          <p className="text-2xl font-black text-[#1e1e1e] dark:text-white mt-1">{value}</p>
          <p className="text-[11px] text-[#aaa] dark:text-white/40 mt-1">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(3, (value / max) * 100) : 0;
  return (
    <div className="h-2 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function AdminInsightsView({ data }: { data: InsightsData }) {
  const maxProductRevenue = Math.max(...data.topProducts.map((p) => p.revenue), 1);
  const maxVendorRevenue = Math.max(...data.topVendors.map((v) => v.revenue), 1);
  const repeatBuyerRate = data.totalBuyers > 0 ? Math.round((data.repeatBuyers / data.totalBuyers) * 100) : 0;

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Analytics"
          title="Marketplace Insights"
          subtitle="Platform analytics, trends, and growth metrics."
        />
      </DashBanner>

      <div className="mb-6" />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={Users} label="Total Buyers" value={data.totalBuyers} sub="Unique buyers on platform" accent="bg-[#dbeafe] text-[#3b82f6]" />
        <StatCard icon={Repeat2} label="Repeat Buyers" value={`${repeatBuyerRate}%`} sub={`${data.repeatBuyers} buyers with 2+ orders`} accent="bg-[#dcfce7] text-[#16a34a]" />
        <StatCard icon={UserPlus} label="New Buyers (30d)" value={data.newBuyersThisMonth} sub="First order this month" accent="bg-[#ffd716]/15 text-[#b89500]" />
        <StatCard icon={MessageSquare} label="Quote Conversion" value={`${data.quoteConversionRate}%`} sub="Quotes that became orders" accent="bg-[#f3e8ff] text-[#8b5cf6]" />
      </div>

      {/* Inventory health */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: AlertCircle, label: "Out of Stock", value: data.outOfStockCount, color: "text-[#ef4444]", bg: "bg-[#fee2e2] dark:bg-[#ef4444]/10", desc: "Products with zero stock" },
          { icon: Package, label: "Low Stock", value: data.lowStockCount, color: "text-[#f59e0b]", bg: "bg-[#fef3c7] dark:bg-[#f59e0b]/10", desc: "Products with ≤5 units" },
          { icon: Clock, label: "Avg Fulfilment", value: `${data.avgFulfilmentDays}d`, color: "text-[#3b82f6]", bg: "bg-[#dbeafe] dark:bg-[#3b82f6]/10", desc: "Order created → completed" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color} flex-shrink-0`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-xl font-black text-[#1e1e1e] dark:text-white">{s.value}</p>
              <p className="text-[11px] text-[#9a9a9a]">{s.label}</p>
              <p className="text-[10.5px] text-[#b3b3b3] mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#ffd716]" />
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Top Products by Revenue</h2>
          </div>
          {data.topProducts.length === 0 ? (
            <p className="text-[13px] text-[#9a9a9a] py-8 text-center">No order data yet</p>
          ) : (
            <div className="space-y-4">
              {data.topProducts.map((p, i) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-[#9a9a9a] w-5 flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white truncate">{p.name}</p>
                        <p className="text-[11px] text-[#9a9a9a]">{p.vendor} · {p.orderCount} orders</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{naira(p.revenue)}</p>
                      <p className={cn("text-[10.5px]", p.stock === 0 ? "text-[#ef4444]" : p.stock <= 5 ? "text-[#f59e0b]" : "text-[#9a9a9a]")}>
                        {p.stock === 0 ? "Out of stock" : p.stock <= 5 ? `${p.stock} left` : `${p.stock} in stock`}
                      </p>
                    </div>
                  </div>
                  <ProgressBar value={p.revenue} max={maxProductRevenue} color="#ffd716" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Vendors */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#16a34a]" />
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Top Vendors by Revenue</h2>
          </div>
          {data.topVendors.length === 0 ? (
            <p className="text-[13px] text-[#9a9a9a] py-8 text-center">No order data yet</p>
          ) : (
            <div className="space-y-4">
              {data.topVendors.map((v, i) => (
                <div key={v.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-[#9a9a9a] w-5 flex-shrink-0">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-[#1e1e1e] dark:bg-white flex items-center justify-center text-white dark:text-[#1e1e1e] text-[11px] font-bold flex-shrink-0">
                        {v.company.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white truncate">{v.company}</p>
                        <p className="text-[11px] text-[#9a9a9a]">{v.orderCount} orders · {v.completionRate}% completion</p>
                      </div>
                    </div>
                    <p className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white tabular-nums flex-shrink-0 ml-3">{naira(v.revenue)}</p>
                  </div>
                  <ProgressBar value={v.revenue} max={maxVendorRevenue} color="#16a34a" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Buyer behaviour summary */}
      <div className="mt-6 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
        <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-4">Buyer Behaviour</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Buyers", value: data.totalBuyers, desc: "Unique buyers who placed orders" },
            { label: "Repeat Buyers", value: data.repeatBuyers, desc: "2 or more orders" },
            { label: "Repeat Rate", value: `${repeatBuyerRate}%`, desc: "Buyers who came back" },
            { label: "New (30 days)", value: data.newBuyersThisMonth, desc: "First order this month" },
          ].map((m) => (
            <div key={m.label} className="text-center p-4 rounded-xl bg-[#fafafa] dark:bg-white/[0.03]">
              <p className="text-2xl font-black text-[#1e1e1e] dark:text-white">{m.value}</p>
              <p className="text-[11px] font-semibold text-[#6b6b6b] dark:text-white/60 mt-1">{m.label}</p>
              <p className="text-[10.5px] text-[#9a9a9a] mt-0.5">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
