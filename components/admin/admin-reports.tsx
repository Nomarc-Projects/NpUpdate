"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, Check, X } from "lucide-react";
import { setReportStatus, type ReportRow } from "@/lib/services/admin";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

const STATUS: Record<string, string> = { open: "bg-[#fef3c7] text-[#92400e]", resolved: "bg-[#dcfce7] text-[#16803c]", dismissed: "bg-[#f0f0f0] text-[#6b6b6b]" };

export function AdminReports({ reports = [] }: { reports?: ReportRow[] }) {
  const router = useRouter();
  const [list, setList] = useState(reports);

  const update = (id: string, status: "resolved" | "dismissed") => {
    setList((l) => l.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(status === "resolved" ? "Marked resolved" : "Dismissed");
    setReportStatus(id, status).then(() => router.refresh()).catch(() => { setList(reports); toast.error("Failed"); });
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Moderation"
          title="Reports & Moderation"
          subtitle="Review flagged content and user reports."
        />
      </DashBanner>
      <div className="mb-5" />
      <div className="max-w-[900px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="p-6">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 rounded-xl border border-dashed border-[#e3e3e3] dark:border-white/10">
              <div className="w-12 h-12 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#16803c]"><Flag size={22} /></div>
              <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No reports</h3>
              <p className="mt-1.5 text-[13px] text-[#9a9a9a]">Nothing has been flagged — the queue is clear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((r) => (
                <div key={r.id} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white capitalize">{r.targetType} reported</p>
                      <p className="text-[12px] text-[#9a9a9a]">By {r.reporter} • {r.date} • target {r.targetId.slice(0, 8)}…</p>
                      {r.reason && <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 mt-1.5">{r.reason}</p>}
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS[r.status] ?? STATUS.open}`}>{r.status}</span>
                  </div>
                  {r.status === "open" && (
                    <div className="mt-3 pt-3 border-t border-[#f0f0f0] dark:border-white/10 flex gap-2">
                      <button onClick={() => update(r.id, "resolved")} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors"><Check size={14} /> Resolve</button>
                      <button onClick={() => update(r.id, "dismissed")} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors"><X size={14} /> Dismiss</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
