"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Trash2, Copy, Pencil, Mail, Send, SendHorizontal, Undo2, RefreshCw } from "lucide-react";
import { FiltersRail, type FilterGroup } from "@/components/admin/filters-rail";
import { KebabMenu, type KebabItem } from "@/components/dashboard/kit";
import { deleteCampaign, duplicateCampaign, startCampaignSend, requeueWedgedCampaign, submitCampaignForApproval, rejectCampaign, type CampaignRow } from "@/lib/services/campaigns";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "open_desc", label: "Open Rate (Highest)" },
  { value: "open_asc", label: "Open Rate (Lowest)" },
];

const STATUSES = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
];

const AUDIENCES = [
  { value: "", label: "All Users" },
  { value: "exhibitors", label: "Exhibitors" },
  { value: "professionals", label: "Professionals" },
  { value: "segment", label: "Saved segments" },
];

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-[#e8f6ed] text-[#1a7f43] dark:bg-[#1a7f43]/15 dark:text-[#4ade80]",
  scheduled: "bg-[#e8f1fb] text-[#1d6fb8] dark:bg-[#1d6fb8]/15 dark:text-[#7cc0f5]",
  draft: "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60",
  pending_review: "bg-[#fff7cc] text-[#8a7400] dark:bg-[#ffd716]/15 dark:text-[#ffd716]",
  sending: "bg-[#fff7cc] text-[#8a7400] dark:bg-[#ffd716]/15 dark:text-[#ffd716]",
  failed: "bg-[#fdecec] text-[#e5484d] dark:bg-[#e5484d]/15 dark:text-[#ff8a8d]",
};

const STATUS_LABEL: Record<string, string> = { pending_review: "Pending Review" };

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold capitalize", STATUS_STYLE[status] ?? STATUS_STYLE.draft)}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function RowMenu({ row, onDone, isSuperAdmin }: { row: CampaignRow; onDone: () => void; isSuperAdmin: boolean }) {
  const [busy, startAction] = useTransition();

  const editable = row.status !== "sent" && row.status !== "sending";

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    startAction(async () => {
      const res = await fn();
      if (res.ok) { toast.success(label); onDone(); } else toast.error(res.error ?? "That didn't work.");
    });
  }

  // Rendered through the portal-based KebabMenu so it is never clipped by the
  // table's overflow-x-auto container (the menu used to be absolutely
  // positioned inside it, which cut off the lower items).
  const items: KebabItem[] = [
    { icon: Pencil, label: "Edit", hidden: !editable, onClick: () => { window.location.href = `/admin/email-campaigns/${row.id}`; } },
    // A plain admin can only hand the campaign on; releasing it to the
    // whole platform is super-admin only, enforced server-side too.
    { icon: SendHorizontal, label: "Submit for review", hidden: !(editable && !isSuperAdmin && row.status !== "pending_review"), onClick: () => run("Sent for approval.", () => submitCampaignForApproval(row.id)) },
    { icon: Send, label: row.status === "pending_review" ? "Approve & send" : "Send now", hidden: !(editable && isSuperAdmin), onClick: () => { if (window.confirm(`Send "${row.name}" now? This emails everyone in the audience and can't be undone.`)) run("Queued for delivery.", () => startCampaignSend(row.id)); } },
    // A stuck 'sending' campaign (process died mid-send, nothing left to drain)
    // can be re-queued without re-mailing anyone already sent.
    { icon: RefreshCw, label: "Re-queue stuck send", hidden: !(isSuperAdmin && row.status === "sending"), onClick: () => run("Re-queued for delivery.", () => requeueWedgedCampaign(row.id)) },
    {
      icon: Undo2, label: "Send back", hidden: !(isSuperAdmin && row.status === "pending_review"),
      onClick: () => {
        const reason = window.prompt("Why is this being sent back? The author will see this.");
        if (reason?.trim()) run("Sent back to the author.", () => rejectCampaign(row.id, reason));
      },
    },
    { icon: Copy, label: "Duplicate", onClick: () => run("Campaign duplicated.", () => duplicateCampaign(row.id)) },
    { icon: Trash2, label: "Delete", danger: true, onClick: () => { if (window.confirm(`Delete "${row.name}"? This cannot be undone.`)) run("Campaign deleted.", () => deleteCampaign(row.id)); } },
  ];

  return <KebabMenu items={items} />;
}

export function EmailCampaignsView({ rows, mailConfigured, isSuperAdmin = false }: { rows: CampaignRow[]; mailConfigured: boolean; isSuperAdmin?: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [status, setStatus] = useState("");
  const [audience, setAudience] = useState("");
  const [nonce, setNonce] = useState(0);

  const groups: FilterGroup[] = [
    { key: "sort", label: "Sort by", options: SORTS, value: sort, onChange: setSort },
    { key: "status", label: "Status", options: STATUSES, value: status, onChange: setStatus },
    { key: "audience", label: "Target Audience", options: AUDIENCES, value: audience, onChange: setAudience },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => (q ? r.name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) : true));
    if (status) out = out.filter((r) => r.status === status);
    if (audience === "segment") out = out.filter((r) => r.segmentId !== null);
    else if (audience) out = out.filter((r) => r.segmentId === null && r.audienceKey === audience);

    const sorted = [...out];
    // Unsent campaigns have no rate at all; keep them below the ones that do
    // rather than treating null as 0%.
    const rate = (r: CampaignRow) => (r.openRate === null ? -1 : r.openRate);
    if (sort === "open_desc") sorted.sort((a, b) => rate(b) - rate(a));
    else if (sort === "open_asc") sorted.sort((a, b) => rate(a) - rate(b));
    else if (sort === "oldest") sorted.reverse();
    return sorted;
  }, [rows, query, status, audience, sort]);

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
          <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[#ececec] bg-white px-3 focus-within:border-[#ffd716] dark:border-white/10 dark:bg-[#1e1e1e]">
            <Search size={15} className="flex-shrink-0 text-[#9a9a9a]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search campaign name..."
              aria-label="Search campaigns"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1e1e1e] placeholder:text-[#9a9a9a] focus:outline-none dark:text-white"
            />
          </div>
          <Link
            href="/admin/email-campaigns/new"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#ffd716] px-4 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
          >
            <Plus size={15} /> New Campaign
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#ececec] bg-white dark:border-white/10 dark:bg-[#1e1e1e]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-[#ececec] dark:border-white/10">
                  {["Campaign Name", "Target Audience", "Status", "Sent Date", "Performance", ""].map((h, i) => (
                    <th key={h || i} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-[#f2f2f2] last:border-0 dark:border-white/5">
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/email-campaigns/${r.id}`} className="text-[13.5px] font-medium text-[#1e1e1e] hover:underline dark:text-white">{r.name}</Link>
                      <p className="mt-0.5 truncate text-[11.5px] text-[#9a9a9a]">{r.subject}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#6b6b6b] dark:text-white/60">{r.audienceLabel}</td>
                    <td className="px-4 py-3.5"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3.5 text-[12.5px] text-[#6b6b6b] dark:text-white/60">
                      {r.sentAt ?? (r.status === "scheduled" && r.scheduledAt ? `Scheduled · ${r.scheduledAt}` : "—")}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px]">
                      {r.openRate === null ? (
                        <span className="text-[#9a9a9a]">—</span>
                      ) : (
                        <>
                          <p className="font-medium text-[#1e1e1e] dark:text-white">{r.openRate}% Open</p>
                          <p className="text-[#9a9a9a]">· {r.clickRate ?? 0}% Click</p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right"><RowMenu row={r} onDone={() => setNonce((n) => n + 1)} isSuperAdmin={isSuperAdmin} /></td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr key={nonce}>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Mail size={26} className="mx-auto mb-3 text-[#d4d4d4]" />
                      <p className="text-[13.5px] font-medium text-[#1e1e1e] dark:text-white">
                        {rows.length === 0 ? "No campaigns yet" : "No campaigns match those filters"}
                      </p>
                      <p className="mt-1 text-[12.5px] text-[#9a9a9a]">
                        {rows.length === 0 ? "Create one to reach a segment or the whole platform." : "Try a different search or filter."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
