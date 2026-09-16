"use client";

import { MessageSquare, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

export default function AdminDisputesPage() {
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent eyebrow="Support" title="Disputes & Support" subtitle="Manage customer support tickets and order disputes." />
      </DashBanner>
      <div className="mt-5" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Open", value: 0, icon: MessageSquare, color: "text-[#3b82f6]", bg: "bg-[#dbeafe]" },
          { label: "In Progress", value: 0, icon: Clock, color: "text-[#f59e0b]", bg: "bg-[#fef3c7]" },
          { label: "Escalated", value: 0, icon: AlertTriangle, color: "text-[#ef4444]", bg: "bg-[#fee2e2]" },
          { label: "Resolved", value: 0, icon: CheckCircle2, color: "text-[#16a34a]", bg: "bg-[#dcfce7]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} dark:bg-opacity-15 flex items-center justify-center ${s.color}`}><s.icon size={16} /></div>
            <div><p className="text-[18px] font-black text-[#1e1e1e] dark:text-white">{s.value}</p><p className="text-[10.5px] text-[#9a9a9a]">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-[#1e1e1e] flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#ffd716]/10 flex items-center justify-center mb-4">
          <MessageSquare size={28} className="text-[#caa400]" />
        </div>
        <h2 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">No support tickets yet</h2>
        <p className="text-[13px] text-[#9a9a9a] mt-1 max-w-md">
          When users report issues or open disputes, they&apos;ll appear here. Apply migration <code className="bg-[#f0f0f0] dark:bg-white/10 px-1.5 py-0.5 rounded text-[12px]">0006_invoices_tickets_addresses.sql</code> to enable the support ticket system.
        </p>
      </div>
    </div>
  );
}
