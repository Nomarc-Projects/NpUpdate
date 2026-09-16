"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Send, User, Clock, CheckCircle2, Paperclip } from "lucide-react";
import { KebabMenu, StatusBadge, type BadgeTone } from "@/components/dashboard/kit";
import { NomarcAvatar } from "@/components/ui/avatar";
import { adminReplyToTicket, updateTicketStatus, getAdminTicketDetail, type TicketDetail, type TicketRow } from "@/lib/services/support";
import { cn } from "@/lib/utils";

type Row = TicketRow & { reporterName: string; reporterId: string };

const STATUS_TONE: Record<string, BadgeTone> = { open: "amber", pending: "blue", in_progress: "blue", resolved: "green", closed: "grey" };
const STATUS_LABEL: Record<string, string> = { open: "Open", pending: "Pending", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };
const FILTERS = ["All", "Open", "Pending", "Resolved"] as const;

export function SupportInboxView({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [, start] = useTransition();

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter !== "All" && STATUS_LABEL[r.status] !== filter && !(filter === "Pending" && r.status === "in_progress")) return false;
    if (query && !`${r.subject} ${r.reporterName}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [rows, filter, query]);

  function openTicket(id: string) {
    setActiveId(id);
    getAdminTicketDetail(id).then(setDetail).catch(() => setDetail(null));
  }

  useEffect(() => {
    if (initial[0]) openTicket(initial[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sendReply() {
    if (!reply.trim() || !activeId) return;
    const body = reply.trim();
    setReply("");
    start(async () => {
      try {
        await adminReplyToTicket(activeId, body);
        toast.success("Reply sent");
        openTicket(activeId);
        router.refresh();
      } catch { toast.error("Couldn't send reply"); }
    });
  }

  function setStatus(id: string, status: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    start(() => updateTicketStatus(id, status).then(() => router.refresh()).catch(() => { toast.error("Couldn't update"); }));
  }

  const active = rows.find((r) => r.id === activeId);

  return (
    <div className="grid h-full min-h-[560px] grid-cols-1 overflow-hidden rounded-2xl border border-[#ececec] dark:border-white/10 md:grid-cols-[340px_1fr]">
      <div className="flex flex-col border-r border-[#ececec] dark:border-white/10">
        <div className="border-b border-[#ececec] p-4 dark:border-white/10">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages" className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
          </div>
          <div className="mt-3 flex gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors", filter === f ? "bg-[#ffd716] text-[#1e1e1e]" : "border border-[#e3e3e3] text-[#6b6b6b] dark:border-white/15 dark:text-white/60")}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((t) => (
            <button key={t.id} onClick={() => openTicket(t.id)} className={cn("flex w-full items-start gap-2.5 border-b border-[#f5f5f5] px-4 py-3 text-left transition-colors dark:border-white/5", activeId === t.id ? "bg-[#fff7cc] dark:bg-white/[0.06]" : "hover:bg-[#fafafa] dark:hover:bg-white/[0.02]")}>
              <NomarcAvatar name={t.reporterName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{t.reporterName} <span className="font-normal text-[#9a9a9a]">· {t.ref}</span></p>
                <p className="truncate text-[12px] text-[#9a9a9a]">{t.subject}</p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] text-[#b3b3b3]">{t.updatedAt}</span>
                <StatusBadge tone={STATUS_TONE[t.status] ?? "grey"}>{STATUS_LABEL[t.status] ?? t.status}</StatusBadge>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-[#9a9a9a]">No tickets.</p>}
        </div>
      </div>

      <div className="hidden flex-col md:flex">
        {active && detail ? (
          <>
            <div className="flex items-center justify-between border-b border-[#ececec] px-5 py-3.5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <NomarcAvatar name={detail.reporterName} size="sm" />
                <div>
                  <p className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">{detail.reporterName} <span className="font-normal text-[#9a9a9a]">· {detail.ref}</span></p>
                  <p className="text-[12px] text-[#9a9a9a]">{detail.subject}</p>
                </div>
              </div>
              <KebabMenu items={[
                { icon: User, label: "View User Profile", onClick: () => router.push(`/admin/user-management/professionals/${active.reporterId}`) },
                { icon: Clock, label: "Mark as Pending", onClick: () => setStatus(active.id, "pending") },
                { icon: CheckCircle2, label: "Mark as Resolved", onClick: () => setStatus(active.id, "resolved") },
              ]} />
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {detail.messages.map((m) => (
                <div key={m.id} className={cn("max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px]", m.senderRole === "admin" ? "ml-auto bg-[#fff7cc] text-[#1e1e1e] dark:bg-[#ffd716]/15 dark:text-white" : "bg-[#f4f4f4] text-[#1e1e1e] dark:bg-white/5 dark:text-white")}>
                  {m.body}
                </div>
              ))}
              {detail.messages.length === 0 && detail.description && (
                <div className="max-w-[70%] rounded-2xl bg-[#f4f4f4] px-4 py-2.5 text-[13px] text-[#1e1e1e] dark:bg-white/5 dark:text-white">{detail.description}</div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-[#ececec] p-4 dark:border-white/10">
              <button type="button" onClick={() => toast("Attachments aren't wired up yet")} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#9a9a9a] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:hover:bg-white/5 dark:hover:text-white" aria-label="Attach a file">
                <Paperclip size={16} />
              </button>
              <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Type a message" className="flex-1 rounded-full border border-[#e3e3e3] bg-white px-4 py-2.5 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
              <button onClick={sendReply} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#ffd716] text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"><Send size={16} /></button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13px] text-[#9a9a9a]">Select a ticket</div>
        )}
      </div>
    </div>
  );
}
