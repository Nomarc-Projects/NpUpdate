"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Download, Play, User, MapPin, Clock, Calendar, Check, Image as ImageIcon } from "lucide-react";
import { votePoll, type ChatMessage } from "@/lib/services/messaging";

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ─── Image bubble ────────────────────────────────────────────────── */

function ImageBubble({ m }: { m: ChatMessage }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="space-y-1">
      <a href={m.attachmentUrl!} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={m.attachmentUrl!} alt="Photo"
          onLoad={() => setLoaded(true)}
          className={`max-w-[260px] max-h-[260px] object-cover rounded-lg transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
        />
        {!loaded && <div className="w-[200px] h-[150px] skeleton rounded-lg" />}
      </a>
      {m.body && <p className="whitespace-pre-wrap break-words text-[13px]">{m.body}</p>}
    </div>
  );
}

/* ─── Video bubble ────────────────────────────────────────────────── */

function VideoBubble({ m }: { m: ChatMessage }) {
  return (
    <div className="space-y-1">
      <div className="rounded-lg overflow-hidden max-w-[280px]">
        <video src={m.attachmentUrl!} controls preload="metadata" className="w-full rounded-lg" />
      </div>
      {m.body && <p className="whitespace-pre-wrap break-words text-[13px]">{m.body}</p>}
    </div>
  );
}

/* ─── Audio bubble ────────────────────────────────────────────────── */

function AudioBubble({ m }: { m: ChatMessage }) {
  const meta = m.metadata as { duration?: number } | null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2.5 min-w-[180px]">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.mine ? "bg-[#1e1e1e]/15" : "bg-[#f97316]/15"}`}>
          <Play size={14} className={m.mine ? "text-[#1e1e1e]" : "text-[#f97316]"} />
        </div>
        <audio src={m.attachmentUrl!} controls className="flex-1 h-8 [&::-webkit-media-controls-panel]:bg-transparent" />
      </div>
      {meta?.duration != null && <p className={`text-[11px] ${m.mine ? "text-[#1e1e1e]/50" : "text-[#9a9a9a]"}`}>Voice message · {fmtDuration(meta.duration)}</p>}
    </div>
  );
}

/* ─── Document bubble ─────────────────────────────────────────────── */

function DocumentBubble({ m }: { m: ChatMessage }) {
  const meta = m.metadata as { fileName?: string; fileSize?: number; fileType?: string } | null;
  const ext = (meta?.fileType || "").toUpperCase() || "FILE";
  return (
    <a href={m.attachmentUrl!} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${m.mine ? "bg-[#1e1e1e]/10 hover:bg-[#1e1e1e]/15" : "bg-[#f5f5f5] dark:bg-white/5 hover:bg-[#efefef] dark:hover:bg-white/10"}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${m.mine ? "bg-[#1e1e1e]/10 text-[#1e1e1e]" : "bg-[#6366f1]/15 text-[#6366f1]"}`}>{ext}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{meta?.fileName || "Document"}</p>
        {meta?.fileSize != null && <p className={`text-[11px] ${m.mine ? "text-[#1e1e1e]/50" : "text-[#9a9a9a]"}`}>{fmtBytes(meta.fileSize)}</p>}
      </div>
      <Download size={15} className="flex-shrink-0 opacity-60" />
    </a>
  );
}

/* ─── Contact bubble ──────────────────────────────────────────────── */

function ContactBubble({ m }: { m: ChatMessage }) {
  const meta = m.metadata as { contactName?: string; contactHeadline?: string; contactAvatar?: string; contactId?: string } | null;
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${m.mine ? "bg-[#1e1e1e]/10" : "bg-[#f5f5f5] dark:bg-white/5"}`}>
      {meta?.contactAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meta.contactAvatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${m.mine ? "bg-[#1e1e1e]/15" : "bg-[#06b6d4]/15"}`}><User size={18} className={m.mine ? "text-[#1e1e1e]" : "text-[#06b6d4]"} /></div>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-semibold truncate">{meta?.contactName || "Contact"}</p>
        {meta?.contactHeadline && <p className={`text-[11px] truncate ${m.mine ? "text-[#1e1e1e]/50" : "text-[#9a9a9a]"}`}>{meta.contactHeadline}</p>}
      </div>
    </div>
  );
}

/* ─── Poll bubble ─────────────────────────────────────────────────── */

function PollBubble({ m }: { m: ChatMessage }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const meta = m.metadata as { question?: string; options?: string[]; votes?: Record<string, number> } | null;
  if (!meta?.options) return null;

  const votes = meta.votes ?? {};
  const totalVotes = Object.keys(votes).length;
  const tally = meta.options.map((_, i) => Object.values(votes).filter((v) => v === i).length);
  const myVote = typeof window !== "undefined" ? undefined : undefined; // server placeholder

  function vote(i: number) {
    start(async () => {
      try { await votePoll(m.id, i); router.refresh(); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't vote"); }
    });
  }

  return (
    <div className="space-y-2 min-w-[200px]">
      <p className="text-[13px] font-semibold">{meta.question}</p>
      <div className="space-y-1.5">
        {meta.options.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round((tally[i] / totalVotes) * 100) : 0;
          return (
            <button key={i} onClick={() => vote(i)} disabled={pending} className={`w-full relative rounded-lg border px-3 py-2 text-left text-[12.5px] font-medium transition-colors overflow-hidden ${m.mine ? "border-[#1e1e1e]/20 hover:border-[#1e1e1e]/40" : "border-[#ececec] dark:border-white/10 hover:border-[#ffd716]"}`}>
              {totalVotes > 0 && <div className={`absolute inset-y-0 left-0 transition-all ${m.mine ? "bg-[#1e1e1e]/8" : "bg-[#ffd716]/15"}`} style={{ width: `${pct}%` }} />}
              <span className="relative flex items-center justify-between gap-2">
                <span className="truncate">{opt}</span>
                {totalVotes > 0 && <span className={`flex-shrink-0 text-[11px] ${m.mine ? "text-[#1e1e1e]/50" : "text-[#9a9a9a]"}`}>{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className={`text-[11px] ${m.mine ? "text-[#1e1e1e]/50" : "text-[#9a9a9a]"}`}>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
    </div>
  );
}

/* ─── Event bubble ────────────────────────────────────────────────── */

function EventBubble({ m }: { m: ChatMessage }) {
  const meta = m.metadata as { eventTitle?: string; eventDate?: string; eventLocation?: string; eventDescription?: string } | null;
  if (!meta) return null;

  let dateStr = "";
  if (meta.eventDate) {
    try {
      const d = new Date(meta.eventDate);
      dateStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const timeStr = meta.eventDate.includes("T") ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
      if (timeStr) dateStr += ` · ${timeStr}`;
    } catch { dateStr = meta.eventDate; }
  }

  return (
    <div className={`rounded-xl overflow-hidden border ${m.mine ? "border-[#1e1e1e]/20" : "border-[#ececec] dark:border-white/10"}`}>
      <div className={`px-3.5 py-2 ${m.mine ? "bg-[#1e1e1e]/8" : "bg-[#a855f7]/10"}`}>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className={m.mine ? "text-[#1e1e1e]" : "text-[#a855f7]"} />
          <span className={`text-[11px] font-bold uppercase tracking-wide ${m.mine ? "text-[#1e1e1e]/60" : "text-[#a855f7]"}`}>Event</span>
        </div>
      </div>
      <div className="px-3.5 py-2.5 space-y-1.5">
        <p className="text-[13px] font-semibold">{meta.eventTitle}</p>
        {dateStr && <p className={`text-[12px] flex items-center gap-1.5 ${m.mine ? "text-[#1e1e1e]/60" : "text-[#9a9a9a]"}`}><Clock size={12} /> {dateStr}</p>}
        {meta.eventLocation && <p className={`text-[12px] flex items-center gap-1.5 ${m.mine ? "text-[#1e1e1e]/60" : "text-[#9a9a9a]"}`}><MapPin size={12} /> {meta.eventLocation}</p>}
        {meta.eventDescription && <p className={`text-[12px] leading-relaxed ${m.mine ? "text-[#1e1e1e]/70" : "text-[#6b6b6b] dark:text-white/60"}`}>{meta.eventDescription}</p>}
      </div>
    </div>
  );
}

/* ─── Export: dispatcher ──────────────────────────────────────────── */

export function RichBubbleContent({ m }: { m: ChatMessage }) {
  switch (m.messageType) {
    case "image":    return <ImageBubble m={m} />;
    case "video":    return <VideoBubble m={m} />;
    case "audio":    return <AudioBubble m={m} />;
    case "document": return <DocumentBubble m={m} />;
    case "contact":  return <ContactBubble m={m} />;
    case "poll":     return <PollBubble m={m} />;
    case "event":    return <EventBubble m={m} />;
    default:         return null;
  }
}
