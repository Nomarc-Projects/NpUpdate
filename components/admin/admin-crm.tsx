"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Download, Trash2, ChevronLeft, ChevronRight,
  Inbox, X, Mail, Phone, MessageSquare, Tag,
} from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { Modal, GhostButton } from "@/components/ui/modal";
import {
  updateLeadStatus, updateLeadNotes, deleteLead, exportLeadsCsv, type CrmLead,
} from "@/lib/services/crm";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { Pagination } from "@/components/ui/pagination";
import { r2Url } from "@/lib/r2-public";

const STATUSES = ["new", "contacted", "qualified", "converted", "archived"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const PAGE_SIZE = 15;

const STATUS_STYLE: Record<string, string> = {
  new: "text-[#1e6fd9] bg-[#dbeafe]",
  contacted: "text-[#b45309] bg-[#fef3c7]",
  qualified: "text-[#6d28d9] bg-[#ede9fe]",
  converted: "text-[#16803c] bg-[#dcfce7]",
  archived: "text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 dark:text-white/40",
};

const SOURCE_LABEL: Record<string, string> = {
  contact_form: "Contact form",
  newsletter: "Newsletter",
  manual: "Manual",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status] ?? STATUS_STYLE.new}`}>
      {cap(status)}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6b6b6b] dark:text-white/50 bg-[#f5f5f5] dark:bg-white/5 px-2 py-0.5 rounded-full">
      <Tag size={10} /> {SOURCE_LABEL[source] ?? cap(source)}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-sm flex-shrink-0">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

/* ── Detail panel ── */
function LeadDetail({
  lead, onClose, onStatusChange, onNotesChange, onDelete,
}: {
  lead: CrmLead;
  onClose: () => void;
  onStatusChange: (id: string, s: string) => void;
  onNotesChange: (id: string, n: string) => void;
  onDelete: (id: string) => void;
}) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, startSave] = useTransition();

  const saveNotes = () => {
    startSave(async () => {
      try { await updateLeadNotes(lead.id, notes); toast.success("Notes saved"); onNotesChange(lead.id, notes); }
      catch { toast.error("Failed to save notes"); }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-[440px] h-full bg-white dark:bg-[#1e1e1e] shadow-2xl flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={lead.name} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate">{lead.name}</p>
              <p className="text-[12px] text-[#9a9a9a] truncate">{lead.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* meta */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[13px]">
              <Mail size={14} className="text-[#9a9a9a] flex-shrink-0" />
              <a href={`mailto:${lead.email}`} className="text-[#1e1e1e] dark:text-white hover:underline">{lead.email}</a>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-2 text-[13px]">
                <Phone size={14} className="text-[#9a9a9a] flex-shrink-0" />
                <span className="text-[#1e1e1e] dark:text-white">{lead.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[13px]">
              <Tag size={14} className="text-[#9a9a9a] flex-shrink-0" />
              <SourceBadge source={lead.source} />
              <span className="text-[#9a9a9a]">• {lead.date}</span>
            </div>
          </div>

          {/* status */}
          <div>
            <p className="text-[12px] font-semibold text-[#9a9a9a] uppercase tracking-wide mb-2">Status</p>
            <SelectMenu
              value={cap(lead.status)}
              options={STATUSES.map(cap)}
              onChange={(v) => onStatusChange(lead.id, v.toLowerCase())}
            />
          </div>

          {/* message */}
          {lead.message && (
            <div>
              <p className="text-[12px] font-semibold text-[#9a9a9a] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MessageSquare size={12} /> Message
              </p>
              <p className="text-[13px] text-[#1e1e1e] dark:text-white/80 leading-relaxed whitespace-pre-wrap bg-[#f7f7f7] dark:bg-white/[0.04] rounded-xl p-4">
                {lead.message}
              </p>
            </div>
          )}

          {/* notes */}
          <div>
            <p className="text-[12px] font-semibold text-[#9a9a9a] uppercase tracking-wide mb-2">Admin notes</p>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a private note about this lead…"
              className="w-full rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#111] text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] px-4 py-3 resize-none focus:outline-none focus:border-[#ffd716] transition-colors"
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-2 w-full py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save notes"}
            </button>
          </div>
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
          <button
            onClick={() => onDelete(lead.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#f0a0a0] text-[#e5484d] text-sm font-semibold hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10 transition-colors"
          >
            <Trash2 size={15} /> Delete lead
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export function AdminCrm({
  leads: initial = [],
  counts: initialCounts = {},
}: {
  leads?: CrmLead[];
  counts?: Record<string, number>;
}) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<CrmLead | null>(null);
  const [delTarget, setDelTarget] = useState<CrmLead | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = list;
    if (statusFilter !== "all") r = r.filter((l) => l.status === statusFilter);
    if (q.trim()) {
      const sq = q.trim().toLowerCase();
      r = r.filter((l) => l.name.toLowerCase().includes(sq) || l.email.toLowerCase().includes(sq));
    }
    return r;
  }, [list, statusFilter, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  const handleStatusChange = (id: string, status: string) => {
    setList((l) => l.map((x) => x.id === id ? { ...x, status } : x));
    if (detail?.id === id) setDetail((d) => d ? { ...d, status } : d);
    updateLeadStatus(id, status).then(() => router.refresh()).catch(() => toast.error("Failed"));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setList((l) => l.map((x) => x.id === id ? { ...x, notes } : x));
  };

  const confirmDelete = (id: string) => {
    setList((l) => l.filter((x) => x.id !== id));
    setDetail(null); setDelTarget(null);
    deleteLead(id).then(() => { toast.success("Lead deleted"); router.refresh(); }).catch(() => toast.error("Failed"));
  };

  const exportCsv = async () => {
    try {
      const csv = await exportLeadsCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `nomarc-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url); toast.success("Leads exported");
    } catch { toast.error("Export failed"); }
  };

  const counts: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = { all: list.length };
    for (const s of STATUSES) out[s] = list.filter((l) => l.status === s).length;
    return out;
  }, [list]);

  const FILTER_TABS = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "qualified", label: "Qualified" },
    { key: "converted", label: "Converted" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="px-6 md:px-8 py-8 max-w-[1100px]">
      {/* header */}
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="CRM"
          title="Leads & Contacts"
          subtitle="Track leads, contacts, and sales pipeline."
        />
      </DashBanner>

      <div className="flex items-end justify-between gap-3 flex-wrap mt-5">
        <p className="text-sm text-[#9a9a9a]">
          {initialCounts.all ?? list.length} total leads from contact forms, newsletter, and manual entries.
        </p>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* stat chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(0); }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              statusFilter === key
                ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]"
                : "bg-[#f5f5f5] dark:bg-white/5 text-[#6b6b6b] dark:text-white/60 hover:bg-[#ebebeb] dark:hover:bg-white/10"
            }`}
          >
            {label}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
              statusFilter === key
                ? "bg-white/20 dark:bg-black/20 text-white dark:text-[#1e1e1e]"
                : "bg-white dark:bg-white/10 text-[#6b6b6b] dark:text-white/50"
            }`}>
              {counts[key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* search */}
      <div className="mt-4 relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }}
          placeholder="Search name or email"
          className="w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] pl-10 pr-4 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors"
        />
      </div>

      {/* table / empty */}
      {filtered.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]">
            <Inbox size={22} />
          </div>
          <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No leads yet</h3>
          <p className="mt-1.5 text-[13px] text-[#9a9a9a]">
            {list.length === 0 ? "Leads appear here when someone submits the contact form or subscribes." : "No leads match your current filter."}
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          {/* desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#f0f0f0] dark:border-white/10 text-[11px] uppercase tracking-wide text-[#9a9a9a]">
                  <th className="font-semibold px-5 py-3">Contact</th>
                  <th className="font-semibold px-3 py-3">Source</th>
                  <th className="font-semibold px-3 py-3">Message</th>
                  <th className="font-semibold px-3 py-3">Status</th>
                  <th className="font-semibold px-3 py-3">Date</th>
                  <th className="font-semibold px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-[#f5f5f5] dark:border-white/5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => setDetail(lead)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={lead.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate max-w-[160px]">{lead.name}</p>
                          <p className="text-[12px] text-[#9a9a9a] truncate max-w-[160px]">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <SourceBadge source={lead.source} />
                    </td>
                    <td className="px-3 py-3 max-w-[200px]">
                      <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 truncate">{lead.message || <span className="text-[#b3b3b3] italic">No message</span>}</p>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="w-[130px]">
                        <SelectMenu
                          value={cap(lead.status)}
                          options={STATUSES.map(cap)}
                          onChange={(v) => handleStatusChange(lead.id, v.toLowerCase())}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-[#6b6b6b] dark:text-white/60 whitespace-nowrap">{lead.date}</td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDelTarget(lead)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="md:hidden divide-y divide-[#f5f5f5] dark:divide-white/5">
            {paged.map((lead) => (
              <div key={lead.id} className="p-4" onClick={() => setDetail(lead)}>
                <div className="flex items-start gap-3">
                  <Avatar name={lead.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate">{lead.name}</p>
                      <StatusBadge status={lead.status} />
                    </div>
                    <p className="text-[12px] text-[#9a9a9a] truncate">{lead.email}</p>
                    {lead.message && <p className="text-[12px] text-[#6b6b6b] dark:text-white/50 mt-1 line-clamp-1">{lead.message}</p>}
                    <div className="mt-1.5 flex items-center gap-2">
                      <SourceBadge source={lead.source} />
                      <span className="text-[11px] text-[#9a9a9a]">{lead.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* pagination */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[#f0f0f0] dark:border-white/10 text-[13px] text-[#9a9a9a]">
            <span>
              {filtered.length === 0 ? "0" : `${page * PAGE_SIZE + 1}–${Math.min(filtered.length, (page + 1) * PAGE_SIZE)}`} of {filtered.length}
            </span>
            <Pagination page={page + 1} pageCount={pageCount} onPageChange={(p) => setPage(p - 1)} />
          </div>
        </div>
      )}

      {/* detail panel */}
      {detail && (
        <LeadDetail
          lead={detail}
          onClose={() => setDetail(null)}
          onStatusChange={handleStatusChange}
          onNotesChange={handleNotesChange}
          onDelete={(id) => { setDelTarget(list.find((l) => l.id === id) ?? null); setDetail(null); }}
        />
      )}

      {/* delete confirm */}
      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="Delete lead" maxWidth="max-w-md">
        <p className="text-sm text-[#6b6b6b] dark:text-white/60">
          Permanently delete the lead from{" "}
          <span className="font-semibold text-[#1e1e1e] dark:text-white">{delTarget?.name}</span> ({delTarget?.email})? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <GhostButton onClick={() => setDelTarget(null)}>Cancel</GhostButton>
          <button
            onClick={() => delTarget && confirmDelete(delTarget.id)}
            className="px-4 py-2 rounded-lg bg-[#e5484d] text-white text-sm font-semibold hover:bg-[#d33a3f] transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
