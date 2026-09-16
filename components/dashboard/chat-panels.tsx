"use client";

import { useState, useEffect, useTransition, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, ChevronLeft, ChevronRight, Image as ImageIcon, FileText,
  Link2, Bell, BellOff, Trash2, Ban, MessageSquareOff, MoreVertical,
  Calendar, ExternalLink, Download, Play,
} from "lucide-react";
import { NomarcAvatar } from "@/components/ui/avatar";
import {
  getSharedMedia, searchMessages, clearChat, deleteConversation,
  muteConversation, type ChatMessage, type ChatThread,
} from "@/lib/services/messaging";

/* ─── Contact info side panel ─────────────────────────────────────── */

type InfoTab = "Media" | "Docs" | "Links";

export function ContactInfoPanel({ thread, onClose }: { thread: ChatThread; onClose: () => void }) {
  const [tab, setTab] = useState<InfoTab>("Media");
  const [media, setMedia] = useState<ChatMessage[]>([]);
  const [docs, setDocs] = useState<ChatMessage[]>([]);
  const [links, setLinks] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getSharedMedia(thread.id)
      .then((r) => { setMedia(r.media); setDocs(r.docs); setLinks(r.links); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [thread.id]);

  const items = tab === "Media" ? media : tab === "Docs" ? docs : links;
  const counts: Record<InfoTab, number> = { Media: media.length, Docs: docs.length, Links: links.length };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex flex-col flex-shrink-0 border-l border-[#ececec] dark:border-white/10 overflow-hidden bg-white dark:bg-[#1a1a1a]"
    >
      <div className="w-[340px] flex flex-col h-full">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
          <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Contact info</h3>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
        </div>

        {/* profile */}
        <div className="flex flex-col items-center text-center px-5 py-6 flex-shrink-0">
          <NomarcAvatar src={thread.avatarUrl} name={thread.name} size="2xl" online />
          <h4 className="mt-3 text-[15px] font-bold text-[#1e1e1e] dark:text-white">{thread.name}</h4>
          {thread.headline && <p className="mt-0.5 text-[12.5px] text-[#9a9a9a] max-w-[240px]">{thread.headline}</p>}
        </div>

        {/* tabs */}
        <div className="flex border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
          {(["Media", "Docs", "Links"] as InfoTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[13px] font-medium transition-colors relative ${tab === t ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"}`}>
              <span className="flex items-center justify-center gap-1">
                {t}
                {!loading && counts[t] > 0 && (
                  <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#ffd716]/20 text-[#8a7400] dark:text-[#ffd716] text-[10px] font-bold flex items-center justify-center">{counts[t]}</span>
                )}
              </span>
              {tab === t && <motion.div layoutId="infotab" className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#ffd716]" />}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10"><div className="w-5 h-5 border-2 border-[#ffd716] border-t-transparent rounded-full animate-spin" /></div>
          ) : error ? (
            <p className="text-center text-[13px] text-[#9a9a9a] py-10">Could not load shared content</p>
          ) : items.length === 0 ? (
            <p className="text-center text-[13px] text-[#9a9a9a] py-10">No {tab.toLowerCase()} shared yet</p>
          ) : tab === "Media" ? (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((m) => (
                <a key={m.id} href={m.attachmentUrl!} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-[#f0f0f0] dark:bg-white/5 hover:opacity-80 transition-opacity relative">
                  {m.messageType === "video" ? (
                    <>
                      <video src={m.attachmentUrl!} preload="metadata" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"><Play size={14} className="text-white ml-0.5" /></div></div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.attachmentUrl!} alt="" className="w-full h-full object-cover" />
                  )}
                </a>
              ))}
            </div>
          ) : tab === "Docs" ? (
            <div className="space-y-2">
              {items.map((m) => {
                const meta = m.metadata as { fileName?: string; fileSize?: number; fileType?: string; duration?: number } | null;
                const name = meta?.fileName || (m.messageType === "audio" ? "Voice message" : "Document");
                const ext = (meta?.fileType || m.messageType).toUpperCase();
                return (
                  <a key={m.id} href={m.attachmentUrl!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] hover:border-[#ffd716] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#6366f1]/15 text-[#6366f1] flex items-center justify-center text-[10px] font-bold flex-shrink-0">{ext}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate">{name}</p>
                      <p className="text-[11px] text-[#9a9a9a]">{m.time} {meta?.fileSize ? `- ${(meta.fileSize / 1024).toFixed(0)} KB` : ""}</p>
                    </div>
                    <Download size={14} className="text-[#9a9a9a] flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((m) => {
                const urls = m.body.match(/https?:\/\/[^\s]+/g) ?? [];
                return urls.map((url, i) => {
                  let host = url;
                  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
                  return (
                    <a key={`${m.id}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] hover:border-[#ffd716] transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-[#22c55e]/15 text-[#22c55e] flex items-center justify-center flex-shrink-0"><Link2 size={16} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#caa400] truncate">{url}</p>
                        <p className="text-[11px] text-[#9a9a9a]">{host} - {m.time}</p>
                      </div>
                      <ExternalLink size={14} className="text-[#9a9a9a] flex-shrink-0" />
                    </a>
                  );
                });
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Chat search panel ───────────────────────────────────────────── */

export function ChatSearchPanel({ conversationId, onClose, onJumpTo }: { conversationId: string; onClose: () => void; onJumpTo: (msgId: string) => void }) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  function doSearch() {
    const q = query.trim();
    if (!q && !date) return;
    setSearching(true);
    searchMessages(conversationId, q, date || undefined)
      .then((r) => { setResults(r); setSearched(true); })
      .catch(() => toast.error("Search failed"))
      .finally(() => setSearching(false));
  }

  return (
    <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
      className="absolute top-0 left-0 right-0 z-20 bg-white dark:bg-[#1a1a1a] border-b border-[#ececec] dark:border-white/10 shadow-lg">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white flex-shrink-0"><X size={18} /></button>
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Search in conversation..." autoFocus
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-[#f6f6f6] dark:bg-white/5 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors" />
        </div>
        <div className="relative flex-shrink-0">
          <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="pl-8 pr-2 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-[#f6f6f6] dark:bg-white/5 text-[12px] text-[#1e1e1e] dark:text-white focus:outline-none focus:border-[#ffd716] transition-colors w-[130px]" />
        </div>
      </div>
      {searched && (
        <div className="max-h-48 overflow-y-auto border-t border-[#f0f0f0] dark:border-white/10">
          {results.length === 0 ? (
            <p className="text-center text-[13px] text-[#9a9a9a] py-5">No messages found</p>
          ) : results.map((m) => (
            <button key={m.id} onClick={() => { onJumpTo(m.id); onClose(); }}
              className="w-full flex items-start gap-3 px-5 py-2.5 text-left hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#1e1e1e] dark:text-white truncate">{m.body || `[${m.messageType}]`}</p>
                <p className="text-[11px] text-[#9a9a9a]">{m.time} - {new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Chat actions menu (three-dot) ───────────────────────────────── */

export function ChatActionsMenu({ thread, onContactInfo, onSearch, onClose }: {
  thread: ChatThread;
  onContactInfo: () => void;
  onSearch: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<"clear" | "delete" | null>(null);
  const [pending, start] = useTransition();

  function handleMute() {
    start(async () => {
      try { await muteConversation(thread.id, true); toast.success("Notifications muted"); onClose(); }
      catch { toast.error("Failed"); }
    });
  }

  function handleClear() {
    start(async () => {
      try { await clearChat(thread.id); toast.success("Chat cleared"); setConfirm(null); onClose(); router.refresh(); }
      catch { toast.error("Failed"); }
    });
  }

  function handleDelete() {
    start(async () => {
      try { await deleteConversation(thread.id); toast.success("Conversation deleted"); setConfirm(null); onClose(); router.refresh(); }
      catch { toast.error("Failed"); }
    });
  }

  if (confirm) {
    return (
      <>
        <div className="fixed inset-0 z-30" onClick={() => { setConfirm(null); onClose(); }} />
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          className="absolute right-0 top-full mt-1 z-40 w-64 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xl p-4">
          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-1">
            {confirm === "clear" ? "Clear this chat?" : "Delete this conversation?"}
          </p>
          <p className="text-[12px] text-[#9a9a9a] mb-3">
            {confirm === "clear" ? "All messages will be removed. This cannot be undone." : "This conversation will be permanently removed."}
          </p>
          <div className="flex gap-2">
            <button onClick={() => { setConfirm(null); onClose(); }} className="flex-1 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60">Cancel</button>
            <button onClick={confirm === "clear" ? handleClear : handleDelete} disabled={pending}
              className="flex-1 py-2 rounded-lg bg-[#e5484d] text-white text-[13px] font-semibold hover:bg-[#d33a3f] transition-colors disabled:opacity-50">
              {pending ? "..." : confirm === "clear" ? "Clear" : "Delete"}
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  const items = [
    { icon: Search, label: "Search", action: () => { onSearch(); onClose(); } },
    { icon: ImageIcon, label: "Contact info", action: () => { onContactInfo(); onClose(); } },
    { icon: BellOff, label: "Mute notifications", action: handleMute },
    { icon: MessageSquareOff, label: "Clear chat", action: () => setConfirm("clear"), danger: false },
    { icon: Trash2, label: "Delete chat", action: () => setConfirm("delete"), danger: true },
  ];

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="absolute right-0 top-full mt-1 z-40 w-52 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xl py-1.5">
        {items.map((item) => (
          <button key={item.label} onClick={item.action}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${item.danger ? "text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10" : "text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5"}`}>
            <item.icon size={15} /> {item.label}
          </button>
        ))}
      </motion.div>
    </>
  );
}
