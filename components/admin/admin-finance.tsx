"use client";

import { DollarSign, TrendingUp, Wallet, Clock, ShoppingBag, CreditCard, ArrowDownToLine, Percent } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { type FinanceOverview, type AdminStats } from "@/lib/services/admin";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

function Card({ icon: Icon, label, value, sub, accent }: { icon: typeof DollarSign; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
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

export function AdminFinanceView({ finance, stats }: { finance: FinanceOverview; stats: AdminStats }) {
  const completionRate = stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0;
  const avgOrderValue = stats.totalOrders > 0 ? Math.round(finance.totalGMV / stats.totalOrders) : 0;

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Finance"
          title="Finance & Revenue"
          subtitle="Platform revenue, payouts, and financial analytics."
        />
      </DashBanner>

      <div className="mb-6" />

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card icon={TrendingUp} label="Total GMV" value={naira(finance.totalGMV)} sub="Gross merchandise value" accent="bg-[#dcfce7] text-[#16a34a]" />
        <Card icon={Percent} label="Platform Commission" value={naira(finance.platformCommission)} sub="10% marketplace fee" accent="bg-[#ffd716]/15 text-[#b89500]" />
        <Card icon={CreditCard} label="Subscription Revenue" value={naira(finance.subscriptionRevenue)} sub="Plan payments" accent="bg-[#dbeafe] text-[#3b82f6]" />
        <Card icon={ShoppingBag} label="Total Orders" value={String(stats.totalOrders)} sub={`${completionRate}% completion rate`} accent="bg-[#f3e8ff] text-[#8b5cf6]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout overview */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
          <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white mb-4">Payout Overview</h2>
          <div className="space-y-4">
            {[
              { label: "Pending vendor payouts", value: naira(finance.pendingPayouts), icon: ArrowDownToLine, desc: "Available for vendors to withdraw" },
              { label: "Held in escrow", value: naira(finance.heldInEscrow), icon: Clock, desc: "Awaiting delivery confirmation" },
              { label: "Avg order value", value: naira(avgOrderValue), icon: Wallet, desc: "Average across all paid orders" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 py-3 border-b border-[#f0f0f0] dark:border-white/10 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center">
                    <item.icon size={16} className="text-[#9a9a9a]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{item.label}</p>
                    <p className="text-[11px] text-[#9a9a9a]">{item.desc}</p>
                  </div>
                </div>
                <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
          <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white mb-4">Revenue Breakdown</h2>
          <div className="space-y-5">
            {[
              { label: "Marketplace Commission", value: finance.platformCommission, total: finance.platformCommission + finance.subscriptionRevenue, color: "#ffd716" },
              { label: "Subscription Revenue", value: finance.subscriptionRevenue, total: finance.platformCommission + finance.subscriptionRevenue, color: "#3b82f6" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[12.5px] mb-2">
                  <span className="text-[#6b6b6b] dark:text-white/60">{item.label}</span>
                  <span className="font-semibold text-[#1e1e1e] dark:text-white tabular-nums">{naira(item.value)}</span>
                </div>
                <div className="h-3 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${item.total > 0 ? Math.max(4, (item.value / item.total) * 100) : 0}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[#f0f0f0] dark:border-white/10">
            <h3 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-3">Order Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Pending", value: stats.pendingOrders },
                { label: "Completed", value: stats.completedOrders },
                { label: "Total Orders", value: stats.totalOrders },
                { label: "Completion Rate", value: `${completionRate}%` },
              ].map((m) => (
                <div key={m.label} className="text-center py-3 rounded-xl bg-[#fafafa] dark:bg-white/[0.03]">
                  <p className="text-[17px] font-black text-[#1e1e1e] dark:text-white">{m.value}</p>
                  <p className="text-[10.5px] text-[#9a9a9a] mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
