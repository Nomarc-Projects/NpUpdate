"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp, Check, ChevronDown, FileText, Loader2, MessageSquarePlus, Pencil,
  Search, ThumbsDown, ThumbsUp, Trash2, X,
} from "lucide-react";
import { HelmIcon } from "@/components/ui/helm-icon";
import { DISCIPLINES, DISCIPLINE_LABEL } from "@/lib/helm/disciplines";
import {
  appendMessage, archiveConversation, createConversation, getConversation,
  listConversations, rateMessage, renameConversation,
  type HelmConversationRow, type HelmMessageRow,
} from "@/lib/services/helm";
import type { HelmCitation, HelmProposal } from "@/lib/helm/client";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: HelmCitation[];
  tool?: string | null;
  toolResult?: Record<string, unknown> | null;
  grounded?: boolean;
  proposal?: HelmProposal | null;
  rating?: number | null;
  pending?: boolean;
};

const STARTERS = [
  "Help me plan the programme for a 4-storey office fit-out",
  "Review the risk clauses I should watch in a JCT-style contract",
  "What approvals do I need before breaking ground in Lagos?",
  "Draft an RFQ for structural steel supply and erection",
];

/* ── tiny markdown renderer (bold, bullets, numbered, code) ── */
function AssistantMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => content.split(/\n{2,}/), [content]);
  const inline = (text: string) =>
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[0.85em] font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });

  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const bulleted = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        const numbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
        if (bulleted) {
          return (
            <ul key={bi} className="list-disc pl-5 space-y-1.5">
              {lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>)}
            </ul>
          );
        }
        if (numbered) {
          return (
            <ol key={bi} className="list-decimal pl-5 space-y-1.5">
              {lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>)}
            </ol>
          );
        }
        return <p key={bi}>{inline(block)}</p>;
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-[#1e1e1e]/40 dark:bg-white/40"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/** Explains a slow first reply instead of leaving the user staring at dots. */
function WaitingNote({ seconds }: { seconds: number }) {
  if (seconds < 6) return null;
  return (
    <p className="mt-2 text-xs text-[#6b6b6b] dark:text-white/45">
      {seconds < 15
        ? "Thinking this through…"
        : "Still working — the consultant may be waking up after a quiet spell."}
    </p>
  );
}

/** Renders a read tool's returned data as a compact card. */
function ToolCard({ tool, data }: { tool: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data).slice(0, 8);
  if (!entries.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b6b] dark:text-white/50">
        {tool.replace(/_/g, " ")}
      </p>
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 min-w-0">
            <dt className="text-[#6b6b6b] dark:text-white/45 shrink-0">{k.replace(/_/g, " ")}:</dt>
            <dd className="truncate text-[#1e1e1e] dark:text-white/85">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A confirm-gated write. Nothing changes until the professional clicks Apply. */
function ProposalCard({
  proposal, applied, applying, onApply,
}: { proposal: HelmProposal; applied: boolean; applying: boolean; onApply: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-[#ffd716]/60 bg-[#ffd716]/10 dark:bg-[#ffd716]/[0.07] p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 h-6 w-6 shrink-0 rounded-lg bg-[#ffd716] grid place-items-center">
          <Check className="h-3.5 w-3.5 text-[#1e1e1e]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">Proposed change</p>
          <p className="mt-1 text-sm text-[#3d3d3d] dark:text-white/70">{proposal.summary}</p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-[#6b6b6b] dark:text-white/45">
            {proposal.tool.replace(/_/g, " ")} · {proposal.action}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        {applied ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4" /> Applied
          </span>
        ) : (
          <button
            onClick={onApply}
            disabled={applying || !proposal.ready}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] dark:bg-white px-3.5 py-2 text-sm font-medium text-white dark:text-[#1e1e1e] transition hover:opacity-85 disabled:opacity-50"
          >
            {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {proposal.ready ? "Apply change" : "Needs more detail"}
          </button>
        )}
      </div>
    </div>
  );
}

function Citations({ items }: { items: HelmCitation[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((c, i) => (
        <span
          key={`${c.ref}-${i}`}
          title={c.snippet ?? c.title}
          className="inline-flex items-center gap-1 rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 px-2.5 py-1 text-[11px] text-[#3d3d3d] dark:text-white/70"
        >
          <FileText className="h-3 w-3" />
          <span className="max-w-[180px] truncate">{c.title}</span>
        </span>
      ))}
    </div>
  );
}

/* ── main ── */
export function HelmChat({
  initialConversations,
  defaultDiscipline,
  quota,
  projectId = null,
}: {
  initialConversations: HelmConversationRow[];
  defaultDiscipline: string | null;
  quota: { monthlyMessages: number | null; used: number; remaining: number | null };
  projectId?: string | null;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waited, setWaited] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [used, setUsed] = useState(quota.used);

  const [conversations, setConversations] = useState(initialConversations);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [railOpen, setRailOpen] = useState(false);

  const [discipline, setDiscipline] = useState<string | null>(defaultDiscipline);
  const [personaOpen, setPersonaOpen] = useState(false);

  const [applying, setApplying] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const remaining = quota.monthlyMessages === null ? null : Math.max(0, quota.monthlyMessages - used);
  const exhausted = remaining !== null && remaining <= 0;

  /* auto-grow the composer with its content, capped */
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* tick a counter while a reply is in flight, so WaitingNote can explain */
  useEffect(() => {
    if (!busy) return setWaited(0);
    const t = setInterval(() => setWaited((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const refreshHistory = useCallback(async (query: string) => {
    setConversations(await listConversations(query));
  }, []);

  /* debounced history search */
  useEffect(() => {
    const t = setTimeout(() => void refreshHistory(search), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [search, refreshHistory]);

  /* restore the thread named in ?c= so a refresh continues where you left off */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("c");
    if (id) void openConversation(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setActive(id: string | null) {
    setConversationId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("c", id);
    else url.searchParams.delete("c");
    window.history.replaceState({}, "", url);
  }

  async function openConversation(id: string) {
    const data = await getConversation(id);
    if (!data) return;
    setActive(id);
    setDiscipline(data.conversation.discipline ?? defaultDiscipline);
    setMessages(
      data.messages.map((m: HelmMessageRow) => ({
        id: m.id, role: m.role, content: m.content, citations: m.citations,
        tool: m.tool, toolResult: m.toolResult, grounded: m.grounded, rating: m.rating,
      })),
    );
    setRailOpen(false);
  }

  function newChat() {
    setActive(null);
    setMessages([]);
    setRailOpen(false);
    composerRef.current?.focus();
  }

  async function removeConversation(id: string) {
    await archiveConversation(id);
    if (id === conversationId) newChat();
    void refreshHistory(search);
  }

  async function submitRename(id: string) {
    if (renameValue.trim()) await renameConversation(id, renameValue.trim());
    setRenaming(null);
    void refreshHistory(search);
  }

  async function rate(messageId: string, value: 1 | -1) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, rating: value } : m)));
    await rateMessage(messageId, value);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy || exhausted) return;

    setInput("");
    setNotice(null);
    setBusy(true);

    // Persist the question up front so it survives a slow or cut-off reply.
    let convId = conversationId;
    if (!convId) {
      const created = await createConversation({
        title: content.slice(0, 60),
        discipline,
        projectId,
      });
      convId = created?.id ?? null;
      if (convId) setActive(convId);
    }

    const localId = `local-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: localId, role: "user", content, citations: [] },
      { id: `${localId}-pending`, role: "assistant", content: "", citations: [], pending: true },
    ]);

    if (convId) await appendMessage({ conversationId: convId, role: "user", content });

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/helm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history, discipline, projectId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          res.status === 429
            ? "You've used this month's Nomabot allowance. Upgrade your plan for more."
            : res.status === 503
              ? "Nomabot isn't switched on yet — it'll be available shortly."
              : (body.error as string) || "Nomabot couldn't answer that right now.";
        setNotice(message);
        if (res.status === 429 && quota.monthlyMessages !== null) setUsed(quota.monthlyMessages);
        setMessages((prev) => prev.filter((m) => !m.pending));
        return;
      }

      const data = await res.json();
      setUsed((u) => u + 1);

      const assistant: Msg = {
        id: `${localId}-a`,
        role: "assistant",
        content: data.answer ?? "",
        citations: data.citations ?? [],
        tool: data.tool ?? null,
        toolResult: data.tool_result ?? null,
        grounded: !!data.grounded,
        proposal: data.proposal ?? null,
      };

      if (convId) {
        const saved = await appendMessage({
          conversationId: convId,
          role: "assistant",
          content: assistant.content,
          citations: assistant.citations,
          tool: assistant.tool,
          toolResult: assistant.toolResult,
          grounded: assistant.grounded,
        });
        if (saved) assistant.id = saved.id;
      }

      setMessages((prev) => [...prev.filter((m) => !m.pending), assistant]);
      void refreshHistory(search);
    } catch {
      setNotice("Couldn't reach Nomabot. Check your connection and try again.");
      setMessages((prev) => prev.filter((m) => !m.pending));
    } finally {
      setBusy(false);
    }
  }

  async function applyProposal(msgId: string, proposal: HelmProposal) {
    setApplying(msgId);
    try {
      const res = await fetch("/api/helm/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, proposal }),
      });
      if (res.ok) setAppliedIds((prev) => new Set(prev).add(msgId));
      else setNotice("That change couldn't be applied. Nothing was modified.");
    } catch {
      setNotice("That change couldn't be applied. Nothing was modified.");
    } finally {
      setApplying(null);
    }
  }

  const personaLabel = discipline ? DISCIPLINE_LABEL[discipline] ?? "General" : "General";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden">
      {/* ── history rail ── */}
      <aside
        data-tour="helm-history"
        className={`${railOpen ? "flex" : "hidden"} lg:flex absolute lg:relative inset-0 lg:inset-auto z-30 lg:z-auto w-full lg:w-[270px] shrink-0 flex-col border-r border-black/10 dark:border-white/10 bg-white dark:bg-[#161616]`}
      >
        <div className="p-3 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={newChat}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#ffd716] px-3 py-2 text-sm font-semibold text-[#1e1e1e] transition hover:brightness-95"
            >
              <MessageSquarePlus className="h-4 w-4" /> New chat
            </button>
            <button
              onClick={() => setRailOpen(false)}
              className="lg:hidden rounded-lg p-2 text-[#6b6b6b] hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mt-2.5">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-[#f7f7f7] dark:bg-white/5 py-2 pl-8 pr-3 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#9a9a9a] outline-none focus:border-[#ffd716]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-[#9a9a9a]">No conversations yet.</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-2 transition ${
                c.id === conversationId
                  ? "bg-[#ffd716]/20 dark:bg-[#ffd716]/10"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {renaming === c.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void submitRename(c.id)}
                  onKeyDown={(e) => e.key === "Enter" && void submitRename(c.id)}
                  className="flex-1 min-w-0 rounded border border-[#ffd716] bg-white dark:bg-[#1e1e1e] px-1.5 py-0.5 text-sm outline-none dark:text-white"
                />
              ) : (
                <button
                  onClick={() => void openConversation(c.id)}
                  className="flex-1 min-w-0 truncate text-left text-sm text-[#1e1e1e] dark:text-white/80"
                >
                  {c.title}
                </button>
              )}
              <button
                onClick={() => { setRenaming(c.id); setRenameValue(c.title); }}
                className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition"
                aria-label="Rename"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void removeConversation(c.id)}
                className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#9a9a9a] hover:text-red-600 transition"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {quota.monthlyMessages !== null && (
          <div data-tour="helm-usage" className="border-t border-black/5 dark:border-white/10 p-3">
            <div className="flex items-center justify-between text-xs text-[#6b6b6b] dark:text-white/50">
              <span>This month</span>
              <span>{used} / {quota.monthlyMessages}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ffd716] transition-all"
                style={{ width: `${Math.min(100, (used / quota.monthlyMessages) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </aside>

      {/* ── thread ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#f9f9f9] dark:bg-[#111]">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 bg-white dark:bg-[#161616] px-4 py-3">
          <button
            onClick={() => setRailOpen(true)}
            className="lg:hidden rounded-lg p-1.5 text-[#6b6b6b] hover:bg-black/5 dark:text-white/60"
            aria-label="Open history"
          >
            <Search className="h-4 w-4" />
          </button>
          <HelmIcon className="h-6 w-6 text-[#1e1e1e] dark:text-[#ffd716]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">Nomabot</p>
            <p className="text-[11px] text-[#6b6b6b] dark:text-white/45">Your construction consultant</p>
          </div>

          {/* persona switcher */}
          <div className="relative" data-tour="helm-persona">
            <button
              onClick={() => setPersonaOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/15 px-2.5 py-1.5 text-xs font-medium text-[#3d3d3d] dark:text-white/75 transition hover:border-[#ffd716]"
            >
              {personaLabel}
              <ChevronDown className={`h-3.5 w-3.5 transition ${personaOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {personaOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 z-20 mt-1.5 w-[260px] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-1.5 shadow-lg"
                >
                  <p className="px-2.5 py-1.5 text-[11px] uppercase tracking-wide text-[#9a9a9a]">
                    Consult as
                  </p>
                  {DISCIPLINES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => { setDiscipline(d.value); setPersonaOpen(false); }}
                      className={`w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/5 ${
                        discipline === d.value ? "bg-[#ffd716]/20 dark:bg-[#ffd716]/10" : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-[#1e1e1e] dark:text-white">{d.label}</p>
                      <p className="text-[11px] text-[#6b6b6b] dark:text-white/45">{d.blurb}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-[760px]">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-8 text-center"
              >
                <HelmIcon className="mx-auto h-12 w-12 text-[#ffd716]" />
                <h2 className="mt-4 text-xl font-semibold text-[#1e1e1e] dark:text-white">
                  What are we working on?
                </h2>
                <p className="mt-1.5 text-sm text-[#6b6b6b] dark:text-white/50">
                  Advising as {personaLabel.toLowerCase()}. Switch anytime from the header.
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2 text-left">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3 text-sm text-[#3d3d3d] dark:text-white/75 transition hover:border-[#ffd716] hover:shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={m.role === "user" ? "flex justify-end" : ""}
                  >
                    {m.role === "user" ? (
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#1e1e1e] dark:bg-white px-4 py-2.5 text-[15px] text-white dark:text-[#1e1e1e]">
                        {m.content}
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <HelmIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#1e1e1e] dark:text-[#ffd716]" />
                        <div className="min-w-0 flex-1">
                          {m.pending ? (
                            <>
                              <TypingDots />
                              <WaitingNote seconds={waited} />
                            </>
                          ) : (
                            <>
                              <div className="text-[#1e1e1e] dark:text-white/85">
                                <AssistantMarkdown content={m.content} />
                              </div>
                              {m.grounded === false && m.citations.length === 0 && (
                                <p className="mt-2 text-[11px] text-[#9a9a9a] dark:text-white/35">
                                  General knowledge — not drawn from a cited source.
                                </p>
                              )}
                              <Citations items={m.citations} />
                              {m.tool && m.toolResult && <ToolCard tool={m.tool} data={m.toolResult} />}
                              {m.proposal && (
                                <ProposalCard
                                  proposal={m.proposal}
                                  applied={appliedIds.has(m.id)}
                                  applying={applying === m.id}
                                  onApply={() => void applyProposal(m.id, m.proposal!)}
                                />
                              )}
                              {!m.id.startsWith("local-") && (
                                <div className="mt-2.5 flex gap-1">
                                  <button
                                    onClick={() => void rate(m.id, 1)}
                                    className={`rounded p-1.5 transition ${m.rating === 1 ? "text-emerald-600" : "text-[#c4c4c4] hover:text-[#6b6b6b] dark:hover:text-white/60"}`}
                                    aria-label="Helpful"
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => void rate(m.id, -1)}
                                    className={`rounded p-1.5 transition ${m.rating === -1 ? "text-red-600" : "text-[#c4c4c4] hover:text-[#6b6b6b] dark:hover:text-white/60"}`}
                                    aria-label="Not helpful"
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div className="border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#161616] px-4 py-3">
          <div className="mx-auto max-w-[760px]">
            <AnimatePresence>
              {notice && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
                >
                  <span>{notice}</span>
                  <button onClick={() => setNotice(null)} aria-label="Dismiss">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div data-tour="helm-composer" className="flex items-end gap-2 rounded-2xl border border-black/10 dark:border-white/15 bg-[#f7f7f7] dark:bg-white/5 px-3 py-2 transition focus-within:border-[#ffd716]">
              <textarea
                ref={composerRef}
                rows={1}
                value={input}
                disabled={exhausted}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={exhausted ? "Monthly allowance used — upgrade to continue" : "Ask Nomabot anything…"}
                className="flex-1 resize-none bg-transparent py-1.5 text-[15px] text-[#1e1e1e] dark:text-white placeholder:text-[#9a9a9a] outline-none disabled:cursor-not-allowed"
              />
              <button
                onClick={() => void send()}
                disabled={!input.trim() || busy || exhausted}
                className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ffd716] text-[#1e1e1e] transition hover:brightness-95 disabled:opacity-40"
                aria-label="Send"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-[#9a9a9a] dark:text-white/35">
              Nomabot can make mistakes — verify anything safety-critical against the source.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
