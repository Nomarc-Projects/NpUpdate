"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Trash2, Send, RefreshCw, Mail, Eye, MousePointerClick, Loader2 } from "lucide-react";
import { DataTable, KebabMenu, SlideOverDrawer, DashboardTabs, StatusBadge, type BadgeTone, type DataTableColumn } from "@/components/dashboard/kit";
import { FiltersRail, type FilterGroup } from "@/components/admin/filters-rail";
import { listCampaigns, getCampaignTracking, startCampaignSend, requeueWedgedCampaign, type CampaignRow, type CampaignTracking } from "@/lib/services/campaigns";
import { cn } from "@/lib/utils";

/** Status → tone, matching the rest of the console (draft grey, sending yellow, etc.). */
const STATUS_TONE: Record<string, BadgeTone> = {
  draft: "grey",
  pending_review: "amber",
  scheduled: "blue",
  sending: "yellow",
  sent: "green",
  failed: "red",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
};

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export function CampaignTrackingView({ rows, mailConfigured, isSuperAdmin }: { rows: CampaignRow[]; mailConfigured: boolean; isSuperAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [status, setStatus] = useState("");
  const [live, setLive] = useState(rows);
  const [selected, setSelected] = useState<CampaignRow | null>(null);
  const [detail, setDetail] = useState<CampaignTracking | null>(null);
  const [detailTab, setDetailTab] = useState("recipients");
  const [, startAction] = useTransition();

  // Live refresh while anything is sending: a 15s poll that stops when nothing
  // is mid-flight. Mirrors the audience-count effect pattern.
  const anySending = live.some((r) => r.status === "sending");
  useEffect(() => {
    if (!anySending) return;
    let stopped = false;
    const tick = async () => {
      const fresh = await listCampaigns().catch(() => null);
      if (!fresh || stopped) return;
      setLive(fresh);
    };
    const t = setInterval(tick, 15000);
    return () => { stopped = true; clearInterval(t); };
  }, [anySending]);

  // Keep the open drawer fresh too.
  useEffect(() => {
    if (!selected) return;
    getCampaignTracking(selected.id).then(setDetail).catch(() => {});
  }, [selected, live]);

  const groups: FilterGroup[] = [
    { key: "sort", label: "Sort by", options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "open_desc", label: "Open Rate (Highest)" }], value: sort, onChange: (v) => setSort(v as string) },
    { key: "status", label: "Status", options: [{ value: "", label: "All" }, { value: "draft", label: "Draft" }, { value: "pending_review", label: "Pending Review" }, { value: "scheduled", label: "Scheduled" }, { value: "sending", label: "Sending" }, { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }], value: status, onChange: setStatus },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = live.filter((r) => (q ? r.name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) : true));
    if (status) out = out.filter((r) => r.status === status);
    const rate = (r: CampaignRow) => (r.openRate === null ? -1 : r.openRate);
    if (sort === "open_desc") out = [...out].sort((a, b) => rate(b) - rate(a));
    else if (sort === "oldest") out = [...out].reverse();
    return out;
  }, [live, query, status, sort]);

  const openDetail = (row: CampaignRow) => {
    setSelected(row);
    setDetail(null);
    setDetailTab("recipients");
    getCampaignTracking(row.id).then(setDetail).catch(() => toast.error("Couldn't load tracking for this campaign."));
  };

  const send = (row: CampaignRow) => {
    startAction(async () => {
      if (!window.confirm(`Send "${row.name}" now? This emails everyone in the audience and can't be undone.`)) return;
      const res = await startCampaignSend(row.id);
      res.ok ? toast.success("Queued for delivery.") : toast.error(res.error ?? "Couldn't queue.");
      const fresh = await listCampaigns().catch(() => null);
      if (fresh) setLive(fresh);
    });
  };
  const requeue = (row: CampaignRow) => {
    startAction(async () => {
      const res = await requeueWedgedCampaign(row.id);
      res.ok ? toast.success("Re-queued for delivery.") : toast.error(res.error ?? "Couldn't re-queue.");
      const fresh = await listCampaigns().catch(() => null);
      if (fresh) setLive(fresh);
    });
  };

  const columns: DataTableColumn<CampaignRow>[] = [
    {
      key: "name",
      label: "Campaign",
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate text-[13.5px] font-medium text-[#1e1e1e] dark:text-white">{r.name}</span>
          <span className="block truncate text-[11.5px] text-[#9a9a9a]">
            {r.status === "sending" ? "Sending" : r.status === "scheduled" ? "Scheduled" : "Sent"}: {r.sentAt ?? r.scheduledAt ?? r.createdAtRaw.slice(0, 10)}
          </span>
        </div>
      ),
    },
    {
      key: "sent",
      label: "Total Sent",
      render: (r) => {
        const p = pct(r.sentCount, r.recipientCount);
        return (
          <div className="min-w-[90px]">
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{r.sentCount.toLocaleString()} <span className="font-normal text-[#9a9a9a]">· {p}%</span></p>
            {r.status === "sending" && r.recipientCount > 0 && (
              <div className="mt-1 h-1 w-full max-w-[90px] overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
                <div className="h-full rounded-full bg-[#ffd716] transition-all duration-700" style={{ width: `${Math.max(2, p)}%` }} />
              </div>
            )}
          </div>
        );
      },
    },
    { key: "recipients", label: "Recipients", render: (r) => <span className="text-[13px] text-[#6b6b6b] dark:text-white/70">{r.recipientCount.toLocaleString()}</span> },
    {
      key: "opened",
      label: "Opened",
      render: (r) => (
        <span className="text-[13px] text-[#6b6b6b] dark:text-white/70">
          {r.openRate === null ? "—" : <>{r.openRate}%</>}
        </span>
      ),
    },
    {
      key: "clicked",
      label: "Clicked",
      render: (r) => (
        <span className="text-[13px] text-[#6b6b6b] dark:text-white/70">
          {r.clickRate === null ? "—" : <>{r.clickRate}%</>}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge tone={STATUS_TONE[r.status] ?? "grey"} dot>{STATUS_LABEL[r.status] ?? r.status}</StatusBadge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <FiltersRail groups={groups} />

      <div className="min-w-0 flex-1">
        {!mailConfigured && (
          <div className="mb-4 rounded-xl border border-[#ffd716]/40 bg-[#fffdf2] px-4 py-3 text-[12.5px] text-[#8a7400] dark:border-[#ffd716]/20 dark:bg-[#ffd716]/[0.06] dark:text-[#ffd716]">
            Email isn’t configured in this environment, so campaigns can be drafted and scheduled but not delivered.
          </div>
        )}

        <div className="mb-4 flex items-center gap-3">
          <div className="relative max-w-[420px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search campaigns…"
              aria-label="Search campaigns"
              className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white"
            />
          </div>
          {anySending && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8a7400] dark:text-[#ffd716]">
              <Loader2 size={13} className="animate-spin" /> Sending… auto-refreshing
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          onRowClick={openDetail}
          rowHoverActions={(r) => (
            <KebabMenu items={[
              { icon: Eye, label: "View tracking", onClick: () => openDetail(r) },
              { icon: Send, label: "Send now", hidden: !(isSuperAdmin && (r.status === "draft" || r.status === "pending_review")), onClick: () => send(r) },
              { icon: RefreshCw, label: "Re-queue stuck send", hidden: !(isSuperAdmin && r.status === "sending"), onClick: () => requeue(r) },
            ]} />
          )}
        />
      </div>

      <SlideOverDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Campaign"}
        subtitle={selected ? `${STATUS_LABEL[selected.status] ?? selected.status} · ${selected.recipientCount.toLocaleString()} recipients` : undefined}
        widthClassName="w-full sm:max-w-[640px]"
      >
        {!detail ? (
          <div className="flex items-center justify-center py-16 text-[13px] text-[#9a9a9a]"><Loader2 size={16} className="mr-2 animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-4">
            {/* Stat row — counts in the console's card language */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Recipients", value: detail.recipientCount.toLocaleString() },
                { label: "Sent", value: detail.sentCount.toLocaleString() },
                { label: "Opened", value: `${detail.uniqueOpens.toLocaleString()} (${pct(detail.uniqueOpens, detail.sentCount)}%)` },
                { label: "Clicked", value: `${detail.uniqueClicks.toLocaleString()} (${pct(detail.uniqueClicks, detail.sentCount)}%)` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-[#ececec] bg-white p-3 dark:border-white/10 dark:bg-[#161616]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9a9a9a]">{s.label}</p>
                  <p className="mt-1 text-[16px] font-bold text-[#1e1e1e] dark:text-white">{s.value}</p>
                </div>
              ))}
            </div>

            <DashboardTabs
              tabs={[
                { key: "recipients", label: `Recipients (${detail.recipients.length})` },
                { key: "opens", label: `Opens (${detail.opens})` },
                { key: "clicks", label: `Clicks (${detail.clicks})` },
              ]}
              active={detailTab}
              onChange={setDetailTab}
            />

            {detailTab === "recipients" && (
              detail.recipients.length === 0 ? (
                <EmptyNote>No recipients recorded yet — the send may still be starting up.</EmptyNote>
              ) : (
                <div className="max-h-[52vh] overflow-y-auto rounded-xl border border-[#ececec] dark:border-white/10">
                  <table className="w-full text-left text-[12.5px]">
                    <thead className="sticky top-0 bg-[#fafafa] dark:bg-[#161616]">
                      <tr className="border-b border-[#ececec] text-[11px] uppercase tracking-wide text-[#9a9a9a] dark:border-white/10">
                        <th className="px-3 py-2 font-semibold">Recipient</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Attempts</th>
                        <th className="px-3 py-2 font-semibold">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.recipients.map((r) => (
                        <tr key={r.userId} className="border-b border-[#f5f5f5] last:border-0 dark:border-white/5">
                          <td className="px-3 py-2">
                            <span className="block font-medium text-[#1e1e1e] dark:text-white">{r.name || "—"}</span>
                            <span className="block text-[11.5px] text-[#9a9a9a]">{r.email}</span>
                          </td>
                          <td className="px-3 py-2">
                            {r.status === "sent" ? (
                              <span className="text-[12px] font-medium text-[#1a7f43]">Sent</span>
                            ) : r.status === "failed" ? (
                              <span className="text-[12px] font-medium text-[#c53434]">Failed</span>
                            ) : (
                              <span className="text-[12px] font-medium text-[#9a9a9a]">Pending</span>
                            )}
                            {r.error && <span className="mt-0.5 block max-w-[220px] truncate text-[10.5px] text-[#c53434]" title={r.error}>{r.error}</span>}
                          </td>
                          <td className="px-3 py-2 text-[12px] text-[#6b6b6b] dark:text-white/60">{r.attempts}</td>
                          <td className="px-3 py-2 text-[12px] text-[#6b6b6b] dark:text-white/60">{r.sentAt ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {detailTab === "opens" && (
              <EngagementTable rows={detail.engagement.filter((e) => e.kind === "open")} empty="Nobody has opened this campaign yet." />
            )}
            {detailTab === "clicks" && (
              <EngagementTable rows={detail.engagement.filter((e) => e.kind === "click")} empty="Nobody has clicked a link in this campaign yet." />
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}

function EngagementTable({ rows, empty }: { rows: { userId: string; email: string; name: string | null; kind: "open" | "click"; url: string | null; createdAt: string }[]; empty: string }) {
  if (rows.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  return (
    <div className="max-h-[52vh] overflow-y-auto rounded-xl border border-[#ececec] dark:border-white/10">
      <table className="w-full text-left text-[12.5px]">
        <thead className="sticky top-0 bg-[#fafafa] dark:bg-[#161616]">
          <tr className="border-b border-[#ececec] text-[11px] uppercase tracking-wide text-[#9a9a9a] dark:border-white/10">
            <th className="px-3 py-2 font-semibold">Recipient</th>
            <th className="px-3 py-2 font-semibold">Link</th>
            <th className="px-3 py-2 font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={`${e.userId}-${i}`} className="border-b border-[#f5f5f5] last:border-0 dark:border-white/5">
              <td className="px-3 py-2">
                <span className="block font-medium text-[#1e1e1e] dark:text-white">{e.name || "—"}</span>
                <span className="block text-[11.5px] text-[#9a9a9a]">{e.email}</span>
              </td>
              <td className="max-w-[240px] truncate px-3 py-2 text-[12px] text-[#6b6b6b] dark:text-white/60" title={e.url ?? undefined}>{e.url ?? "—"}</td>
              <td className="px-3 py-2 text-[12px] text-[#6b6b6b] dark:text-white/60">{e.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-[#e3e3e3] p-6 text-center text-[13px] text-[#9a9a9a] dark:border-white/10">{children}</div>;
}
