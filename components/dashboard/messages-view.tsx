"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageSquare, ArrowLeft, Loader2, Check, CheckCheck, Clock, ExternalLink, UserPlus, FileText, Download, MoreVertical, Info, Wifi, X } from "lucide-react";
import { NomarcAvatar } from "@/components/ui/avatar";
import { getThread, sendMessage, archiveConversation, type ConvoSummary, type ChatThread, type ChatMessage, type MessageType } from "@/lib/services/messaging";
import { enqueue, dequeue, getPending } from "@/lib/offline-queue";
import { RichBubbleContent } from "./rich-bubble";
import { DocumentPicker, MediaPicker, CameraCapture, VoiceRecorder, ContactPicker, PollBuilder, EventBuilder } from "./chat-attachments";
import { ContactInfoPanel, ChatSearchPanel, ChatActionsMenu } from "./chat-panels";
import { ChatInputBar } from "./chat-input-bar";
import { r2Url } from "@/lib/r2-public";
import type { ProCard } from "@/lib/services/directory";

const FALLBACK = r2Url("site/photo-1494790108377-be9c29b29330.jpg");
type Tab = "All" | "Unread" | "Archived";

const URL_RE = /(https?:\/\/[^\s]+)/g;

/** "Today" / "Yesterday" / "12 June" separator label for a message timestamp. */
function dayLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const yest = new Date(); yest.setDate(now.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, now)) return "Today";
  if (same(d, yest)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1.5">
      <span className="px-3 py-0.5 rounded-full bg-white dark:bg-white/10 border border-[#ececec] dark:border-white/10 text-[11px] font-medium text-[#9a9a9a] shadow-sm">{label}</span>
    </div>
  );
}

/** Render message text with clickable links. */
function Linkified({ text, mine }: { text: string; mine: boolean }) {
  const segs = text.split(URL_RE);
  return (
    <>
      {segs.map((s, i) =>
        s.match(URL_RE)
          ? <a key={i} href={s} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 break-all ${mine ? "text-[#1e1e1e]" : "text-[#caa400]"}`}>{s}</a>
          : <Fragment key={i}>{s}</Fragment>,
      )}
    </>
  );
}

function LinkPreview({ url, mine }: { url: string; mine: boolean }) {
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-colors ${mine ? "bg-[#1e1e1e]/10 hover:bg-[#1e1e1e]/15" : "bg-[#f5f5f5] dark:bg-white/5 hover:bg-[#efefef] dark:hover:bg-white/10"}`}>
      <ExternalLink size={14} className="flex-shrink-0" />
      <span className="truncate">{host}</span>
    </a>
  );
}


/** "Active 5m ago" style label from an ISO last-seen timestamp. */
function presenceLabel(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function MessagesView({ conversations = [], initialActiveId, people = [] }: { conversations?: ConvoSummary[]; initialActiveId?: string; people?: ProCard[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | undefined>(initialActiveId ?? conversations[0]?.id);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");
  const [mobileThread, setMobileThread] = useState(() => Boolean(initialActiveId));
  const [modal, setModal] = useState<"document" | "media" | "camera" | "audio" | "contact" | "poll" | "event" | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const loadThread = useCallback(async (id: string, withSpinner = false) => {
    if (withSpinner) setLoading(true);
    try {
      const t = await getThread(id);
      setThread(t);
    } catch { /* ignore poll errors */ }
    finally { if (withSpinner) setLoading(false); }
  }, []);

  // load active thread on change
  useEffect(() => {
    if (!activeId) { setThread(null); return; }
    loadThread(activeId, true).then(() => router.refresh());
  }, [activeId, loadThread, router]);

  // poll active thread + conversation list
  useEffect(() => {
    if (!activeId) return;
    const t = setInterval(() => { loadThread(activeId); router.refresh(); }, 5000);
    return () => clearInterval(t);
  }, [activeId, loadThread, router]);

  // autoscroll to bottom on new messages
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [thread?.messages.length, thread?.id]);

  // online/offline detection + flush queue on reconnect
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = async () => {
      setIsOnline(true);
      toast.success("Back online", { description: "Sending queued messages…", duration: 3000 });
      // flush any pending offline messages
      try {
        const pending = await getPending();
        for (const msg of pending) {
          try {
            await sendMessage(msg.conversationId, msg.body, msg.type === "text" ? undefined : {
              type: msg.type as MessageType,
              attachmentUrl: msg.attachmentUrl ?? undefined,
              metadata: msg.metadata ?? undefined,
            });
            await dequeue(msg.id);
            // remove the offline placeholder from state
            setThread((t) => t ? {
              ...t,
              messages: t.messages.map((m) =>
                m.id === `offline_${msg.id}` ? { ...m, id: `flushed_${msg.id}` } : m
              ),
            } : t);
          } catch { /* leave in queue for next attempt */ }
        }
      } catch { /* IndexedDB might not be available */ }
      if (activeIdRef.current) { loadThread(activeIdRef.current); router.refresh(); }
    };
    const goOffline = () => {
      setIsOnline(false);
      toast.error("You're offline", { description: "Messages will be sent when you reconnect.", duration: 5000 });
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [loadThread, router]);

  const openConvo = (id: string) => { setActiveId(id); setMobileThread(true); };

  async function sendRich(body: string, opts?: { type: MessageType; attachmentUrl?: string; metadata?: Record<string, unknown> }) {
    if (!activeId) return;
    const type = opts?.type ?? "text";
    const optimisticId = `tmp_${Date.now()}`;
    const optimistic: ChatMessage = { id: optimisticId, mine: true, body, messageType: type, attachmentUrl: opts?.attachmentUrl ?? null, metadata: opts?.metadata ?? null, time: "now", createdAt: new Date().toISOString() };
    setThread((t) => (t ? { ...t, messages: [...t.messages, optimistic] } : t));

    // If offline, queue for later and keep the message visible with a clock
    if (!navigator.onLine) {
      try {
        await enqueue({ conversationId: activeId, body, type, attachmentUrl: opts?.attachmentUrl, metadata: opts?.metadata, queuedAt: new Date().toISOString() });
        const all = await getPending();
        const queuedId = all[all.length - 1]?.id ?? 0;
        // Rename the optimistic message so we can match it on flush
        setThread((t) => t ? {
          ...t,
          messages: t.messages.map((m) => m.id === optimisticId ? { ...m, id: `offline_${queuedId}` } : m),
        } : t);
      } catch { /* queue unavailable — message stays optimistic */ }
      return;
    }

    sendMessage(activeId, body, type === "text" ? undefined : opts)
      .then(() => { loadThread(activeId); router.refresh(); })
      .catch((e) => {
        setThread((t) => (t ? { ...t, messages: t.messages.filter((m) => m.id !== optimisticId) } : t));
        toast.error(e instanceof Error ? e.message : "Couldn't send");
      });
  }

  const archive = (id: string) => {
    archiveConversation(id, true).then(() => { toast.success("Conversation archived"); if (activeId === id) { setActiveId(undefined); setMobileThread(false); } router.refresh(); }).catch(() => toast.error("Failed"));
  };

  const q = query.trim().toLowerCase();

  // Ensure the open conversation always appears in the list — derive an entry
  // from the loaded thread if getMyConversations didn't return it (e.g. a brand
  // new conversation that hasn't been picked up yet).
  const list: ConvoSummary[] = [...conversations];
  if (activeId && thread && !list.some((c) => c.id === activeId)) {
    const last = thread.messages[thread.messages.length - 1];
    list.unshift({
      id: activeId, kind: "dm", otherId: thread.otherId, name: thread.name,
      avatarUrl: thread.avatarUrl, headline: thread.headline,
      preview: last?.body || "No messages yet", time: last?.time ?? "", unread: 0, archived: false,
    });
  }

  const filtered = list.filter((c) => {
    if (tab === "Archived") return c.archived;
    if (c.archived) return false;
    if (tab === "Unread") return c.unread > 0;
    return true;
  }).filter((c) => !q || `${c.name} ${c.headline} ${c.preview}`.toLowerCase().includes(q));

  return (
    <div className="flex flex-col h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">
      {/* Offline banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-[#1e1e1e] dark:bg-[#2a2a2a] text-white overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-center gap-2 py-2 text-[12px] font-medium">
              <Wifi size={13} className="opacity-60" />
              <span>You&apos;re offline — messages will be queued and sent when you reconnect</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* banner header */}
      <div className="mx-4 sm:mx-6 mt-4 rounded-2xl bg-[#1e1e1e] dark:bg-[#ffd716] px-6 py-5 relative overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={r2Url("site/photo-1577563908411-5077b6dc7624.jpg")} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.07] dark:opacity-[0.05] pointer-events-none select-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.055) 1px,transparent 0)", backgroundSize: "26px 26px" }} />
        <div className="pointer-events-none absolute -right-6 -top-6 w-40 h-40 rounded-full bg-white/[0.04] dark:bg-black/[0.07]" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 dark:text-[#1e1e1e]/50 mb-0.5">Inbox</p>
            <h1 className="text-[20px] font-black text-white dark:text-[#1e1e1e] leading-tight">Messages</h1>
            <p className="text-[12.5px] text-white/50 dark:text-[#1e1e1e]/60 mt-0.5">Chat with hiring teams, applicants and collaborators.</p>
          </div>
          <button onClick={() => setNewChatOpen(true)} className="flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold bg-white/10 dark:bg-black/10 text-white dark:text-[#1e1e1e] hover:bg-white/20 dark:hover:bg-black/20 transition-colors">
            <UserPlus size={14} /> New chat
          </button>
        </motion.div>
      </div>

      {conversations.length === 0 ? (
        <EmptyMessages />
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* list */}
          <div className={`w-full sm:w-[320px] flex-shrink-0 border-r border-[#ececec] dark:border-white/10 flex-col ${mobileThread ? "hidden sm:flex" : "flex"}`}>
            <div className="p-3 space-y-3">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full rounded-full border border-[#e3e3e3] dark:border-white/15 bg-[#f6f6f6] dark:bg-white/5 pl-10 pr-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] focus:bg-white dark:focus:bg-[#1e1e1e] transition-colors" />
              </div>
              <div className="flex gap-1.5">
                {(["All", "Unread", "Archived"] as Tab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${tab === t ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5"}`}>{t}</button>
                ))}
              </div>
            </div>
            <button onClick={() => setNewChatOpen(true)} className="mx-3 mb-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#f6f6f6] dark:bg-white/5 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:bg-[#efefef] dark:hover:bg-white/10 transition-colors">
              <UserPlus size={14} /> Find and invite people
            </button>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-[13px] text-[#9a9a9a] py-10">No conversations</p>
              ) : filtered.map((c) => (
                <button key={c.id} onClick={() => openConvo(c.id)} className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-[#f5f5f5] dark:border-white/5 transition-colors ${activeId === c.id ? "bg-[#fffbe6] dark:bg-[#ffd716]/5" : "hover:bg-[#f9f9f9] dark:hover:bg-white/[0.03]"}`}>
                  <NomarcAvatar src={c.avatarUrl} name={c.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate">{c.name}</p>
                      <span className="text-[11px] text-[#9a9a9a] flex-shrink-0">{c.time}</span>
                    </div>
                    <p className="text-[12px] text-[#9a9a9a] truncate">{c.preview}</p>
                  </div>
                  {c.unread > 0 && <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ffd716] text-[#1e1e1e] text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* thread + optional contact info panel */}
          <div className={`flex-1 flex min-w-0 ${mobileThread ? "" : "hidden sm:flex"}`}>
          <div className="flex-1 flex flex-col min-w-0">
            {!activeId ? (
              <div className="flex-1 flex items-center justify-center text-[#9a9a9a]">
                {loading ? <Loader2 className="animate-spin" size={22} /> : <p className="text-sm">Select a conversation</p>}
              </div>
            ) : (
              <>
                {thread ? (
                  <>
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#ececec] dark:border-white/10 relative">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setMobileThread(false)} className="sm:hidden text-[#9a9a9a]"><ArrowLeft size={18} /></button>
                    <button onClick={() => setInfoOpen((o) => !o)} className="flex items-center gap-3 min-w-0">
                      <NomarcAvatar src={thread.avatarUrl} name={thread.name} size="sm" online={thread.online} />
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate">{thread.name}</p>
                        <p className={`text-[12px] truncate ${thread.online ? "text-[#16a34a] dark:text-[#4ade80] font-medium" : "text-[#9a9a9a]"}`}>
                          {thread.online ? "Active now" : thread.lastSeen ? `Active ${presenceLabel(thread.lastSeen)}` : (thread.headline || "Offline")}
                        </p>
                      </div>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSearchOpen((o) => !o)} title="Search" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><Search size={16} /></button>
                    <button onClick={() => setInfoOpen((o) => !o)} title="Contact info" className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><Info size={16} /></button>
                    <div className="relative">
                      <button onClick={() => setMenuOpen((o) => !o)} title="More" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><MoreVertical size={16} /></button>
                      <AnimatePresence>
                        {menuOpen && <ChatActionsMenu thread={thread} onContactInfo={() => setInfoOpen(true)} onSearch={() => setSearchOpen(true)} onClose={() => setMenuOpen(false)} />}
                      </AnimatePresence>
                    </div>
                  </div>
                  <AnimatePresence>
                    {searchOpen && <ChatSearchPanel conversationId={thread.id} onClose={() => setSearchOpen(false)} onJumpTo={(id) => { const el = document.getElementById(`msg-${id}`); el?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />}
                  </AnimatePresence>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2.5 bg-[#fafafa] dark:bg-[#161616]">
                  {thread.messages.length === 0 ? (
                    <p className="text-center text-[13px] text-[#9a9a9a] py-10">No messages yet — say hello 👋</p>
                  ) : (() => {
                    // unread divider: position before the trailing N incoming messages
                    const unreadCount = list.find((c) => c.id === activeId)?.unread ?? 0;
                    const incoming = thread.messages.filter((m) => !m.mine);
                    const firstUnreadId = unreadCount > 0 && incoming.length >= unreadCount ? incoming[incoming.length - unreadCount].id : null;
                    let lastDay = "";
                    return thread.messages.map((m) => {
                      const label = dayLabel(m.createdAt);
                      const showSep = !!label && label !== lastDay;
                      if (label) lastDay = label;
                      const url = m.body ? (m.body.match(URL_RE) ?? [])[0] : undefined;
                      const pending = m.id.startsWith("tmp_");
                      return (
                        <Fragment key={m.id}>
                          <div id={`msg-${m.id}`} />
                          {showSep && <DaySeparator label={label} />}
                          {firstUnreadId === m.id && (
                            <div className="flex items-center gap-3 py-1.5">
                              <div className="flex-1 h-px bg-[#ffd716]/40" />
                              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#caa400]">Unread messages</span>
                              <div className="flex-1 h-px bg-[#ffd716]/40" />
                            </div>
                          )}
                          <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] sm:max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${m.mine ? "bg-[#ffd716] text-[#1e1e1e] rounded-br-sm" : "bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-white border border-[#ececec] dark:border-white/10 rounded-bl-sm"}`}>
                              {m.messageType !== "text" ? (
                                <RichBubbleContent m={m} />
                              ) : (
                                <>
                                  {m.body && <p className="whitespace-pre-wrap break-words"><Linkified text={m.body} mine={m.mine} /></p>}
                                  {url && <LinkPreview url={url} mine={m.mine} />}
                                  {m.attachmentUrl && (
                                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium ${m.mine ? "bg-[#1e1e1e]/10 hover:bg-[#1e1e1e]/15" : "bg-[#f5f5f5] dark:bg-white/5 hover:bg-[#efefef] dark:hover:bg-white/10"} transition-colors`}>
                                      <FileText size={15} className="flex-shrink-0" /> <span className="truncate">Attachment</span> <Download size={13} className="ml-auto flex-shrink-0" />
                                    </a>
                                  )}
                                </>
                              )}
                              <span className={`flex items-center gap-1 justify-end text-[10px] mt-1 ${m.mine ? "text-[#1e1e1e]/50" : "text-[#9a9a9a]"}`}>
                                {m.time}
                                {m.mine && (pending ? <Clock size={11} /> : <CheckCheck size={13} className="text-[#16a34a]" />)}
                              </span>
                            </div>
                          </div>
                        </Fragment>
                      );
                    });
                  })()}
                </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#9a9a9a]">
                    <p className="text-sm">Loading conversation…</p>
                  </div>
                )}

                <ChatInputBar onSend={sendRich} onOpenModal={(key) => setModal(key)} />
              </>
            )}
          </div>
          {/* contact info side panel */}
          <AnimatePresence>
            {infoOpen && thread && <ContactInfoPanel thread={thread} onClose={() => setInfoOpen(false)} />}
          </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Attachment modals ── */}
      <AnimatePresence>
        {modal === "document" && <DocumentPicker onSend={sendRich} onClose={() => setModal(null)} />}
        {modal === "media" && <MediaPicker onSend={sendRich} onClose={() => setModal(null)} />}
        {modal === "camera" && <CameraCapture onSend={sendRich} onClose={() => setModal(null)} />}
        {modal === "audio" && <VoiceRecorder onSend={sendRich} onClose={() => setModal(null)} />}
        {modal === "contact" && <ContactPicker onSend={sendRich} onClose={() => setModal(null)} />}
        {modal === "poll" && <PollBuilder onSend={sendRich} onClose={() => setModal(null)} />}
        {modal === "event" && <EventBuilder onSend={sendRich} onClose={() => setModal(null)} />}
      </AnimatePresence>

      {/* ── New chat picker ── */}
      <AnimatePresence>
        {newChatOpen && (
          <NewChatPicker
            people={people}
            query={newChatQuery}
            onQuery={setNewChatQuery}
            onPick={(id) => { setNewChatOpen(false); setNewChatQuery(""); router.push(`/dashboard/messages?to=${encodeURIComponent(id)}`); }}
            onClose={() => { setNewChatOpen(false); setNewChatQuery(""); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyMessages() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><MessageSquare size={26} /></div>
      <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No conversations yet</h3>
      <p className="mt-1.5 text-[13px] text-[#9a9a9a] max-w-sm">Message a professional from the directory, an applicant, or a recruiter — your chats will appear here.</p>
    </div>
  );
}

/** Searchable people picker for starting a new conversation. */
function NewChatPicker({ people, query, onQuery, onPick, onClose }: {
  people: ProCard[]; query: string; onQuery: (q: string) => void; onPick: (userId: string) => void; onClose: () => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? people.filter((p) => `${p.name} ${p.headline} ${p.skills.join(" ") ?? ""}`.toLowerCase().includes(q))
    : people;

  return (
    <div className="fixed inset-0 z-[90]">
      <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] max-h-[70vh] bg-white dark:bg-[#1d1d1d] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ececec] dark:border-white/10 flex-shrink-0">
          <h3 className="text-base font-bold text-[#1e1e1e] dark:text-white">New chat</h3>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-4 flex-shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search name, role or skill…"
              className="w-full rounded-full border border-[#e3e3e3] dark:border-white/15 bg-[#f6f6f6] dark:bg-white/5 pl-10 pr-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] focus:bg-white dark:focus:bg-[#1e1e1e] transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="text-center text-[13px] text-[#9a9a9a] py-10">No professionals found.</p>
          ) : filtered.map((p) => (
            <button key={p.id} onClick={() => onPick(p.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#f9f9f9] dark:hover:bg-white/5 transition-colors">
              <NomarcAvatar src={p.avatarUrl} name={p.name} size="md" verified={p.verified} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate">{p.name}</p>
                <p className="text-[12px] text-[#9a9a9a] truncate">{p.headline || "Professional"}</p>
              </div>
              {p.verified && <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-[#fff7cc] dark:bg-[#ffd716]/10 px-2 py-0.5 text-[10px] font-semibold text-[#caa400]"><Check size={10} /> Verified</span>}
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
          <Link href="/dashboard/find-professionals" onClick={onClose} className="text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors flex items-center gap-1.5 justify-center">
            <ExternalLink size={13} /> Browse the full directory instead
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function MessagesSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="flex flex-col h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">
      {/* banner skeleton */}
      <div className="mx-4 sm:mx-6 mt-4 skeleton rounded-2xl h-[76px] flex-shrink-0" />
      <div className="flex-1 flex min-h-0">
        <div className="hidden sm:flex flex-col w-[320px] flex-shrink-0 border-r border-[#ececec] dark:border-white/10">
          <div className="p-3 space-y-3 flex-shrink-0">
            <S cls="h-9 w-full rounded-full" />
            <div className="flex gap-1.5">
              {[64, 72, 80].map((w, i) => <div key={i} className="skeleton rounded-full h-7" style={{ width: w }} />)}
            </div>
          </div>
          <S cls="mx-3 mb-1 h-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 overflow-hidden divide-y divide-[#f5f5f5] dark:divide-white/5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <S cls="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2"><S cls="h-3.5 w-28" /><S cls="h-3 w-10" /></div>
                  <S cls="h-3 w-40 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#ececec] dark:border-white/10 flex-shrink-0">
            <S cls="w-9 h-9 rounded-full" />
            <div className="space-y-1.5"><S cls="h-3.5 w-32" /><S cls="h-3 w-20" /></div>
          </div>
          <div className="flex-1 p-5 space-y-4">
            {[false, true, false, false, true, true].map((right, i) => (
              <div key={i} className={`flex ${right ? "justify-end" : "justify-start"}`}>
                <S cls={`h-9 rounded-2xl ${right ? "w-48 rounded-br-sm" : "w-56 rounded-bl-sm"}`} />
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-[#f0f0f0] dark:border-white/10 flex gap-3 flex-shrink-0">
            <S cls="flex-1 h-10 rounded-full" /><S cls="w-10 h-10 rounded-full flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
