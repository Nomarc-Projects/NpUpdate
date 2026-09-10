"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, ExternalLink, Loader2, X } from "lucide-react";
import Link from "next/link";
import { HelmIcon } from "@/components/ui/helm-icon";
import type { HelmCitation, HelmProposal } from "@/lib/helm/client";

/**
 * Helm contextual copilot — a compact slide-over that lives on a work surface
 * (a project board, a job, an RFQ) already knowing what you're looking at, so
 * you don't re-explain context. It shares the /api/helm relay + proposal flow
 * with the full consultant page but keeps its own lightweight, ephemeral thread
 * (no history rail). For deep sessions, the full page at /dashboard/ai-consultant
 * is one click away.
 */

type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: HelmCitation[];
  proposal?: HelmProposal | null;
  pending?: boolean;
};

export function HelmCopilot({
  projectId = null,
  context,
  starters = [],
}: {
  projectId?: string | null;
  /** Short human label of what's in view, e.g. "Project: Ikeja Fit-out". */
  context?: string;
  starters?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    setNotice(null);
    setBusy(true);
    const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    setMessages((p) => [...p, { role: "user", content }, { role: "assistant", content: "", pending: true }]);

    try {
      const res = await fetch("/api/helm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history, projectId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setNotice(
          res.status === 429
            ? "You've used this month's Nomabot allowance."
            : res.status === 503
              ? "Nomabot isn't switched on yet."
              : (body.error as string) || "Nomabot couldn't answer that.",
        );
        setMessages((p) => p.filter((m) => !m.pending));
        return;
      }
      const data = await res.json();
      setMessages((p) => [
        ...p.filter((m) => !m.pending),
        { role: "assistant", content: data.answer ?? "", citations: data.citations ?? [], proposal: data.proposal ?? null },
      ]);
    } catch {
      setNotice("Couldn't reach Nomabot.");
      setMessages((p) => p.filter((m) => !m.pending));
    } finally {
      setBusy(false);
    }
  }

  async function apply(idx: number, proposal: HelmProposal) {
    setApplying(idx);
    try {
      const res = await fetch("/api/helm/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal }),
      });
      if (res.ok) setApplied((p) => new Set(p).add(idx));
      else setNotice("That change couldn't be applied. Nothing was modified.");
    } catch {
      setNotice("That change couldn't be applied.");
    } finally {
      setApplying(null);
    }
  }

  return (
    <>
      {/* trigger */}
      <button
        data-tour="helm-copilot"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 md:bottom-6 md:right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#1e1e1e] dark:bg-[#ffd716] px-4 py-3 text-sm font-semibold text-white dark:text-[#1e1e1e] shadow-lg transition hover:scale-[1.03] active:scale-95"
      >
        <HelmIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Ask Nomabot</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-0"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-black/10 dark:border-white/10 bg-white dark:bg-[#161616] shadow-2xl"
            >
              <header className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3">
                <HelmIcon className="h-6 w-6 text-[#1e1e1e] dark:text-[#ffd716]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">Nomabot</p>
                  {context && <p className="truncate text-[11px] text-[#6b6b6b] dark:text-white/45">{context}</p>}
                </div>
                <Link
                  href={projectId ? `/dashboard/ai-consultant?c=` : "/dashboard/ai-consultant"}
                  className="rounded-lg p-1.5 text-[#6b6b6b] hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
                  title="Open full consultant"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-[#6b6b6b] hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="pt-6 text-center">
                    <HelmIcon className="mx-auto h-10 w-10 text-[#ffd716]" />
                    <p className="mt-3 text-sm text-[#6b6b6b] dark:text-white/55">
                      Nomabot knows what you're looking at. Ask about it, or have it draft changes.
                    </p>
                    <div className="mt-4 space-y-2 text-left">
                      {starters.map((s) => (
                        <button
                          key={s}
                          onClick={() => void send(s)}
                          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-2.5 text-left text-sm text-[#3d3d3d] dark:text-white/75 transition hover:border-[#ffd716]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2.5"}>
                      {m.role === "assistant" && <HelmIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#1e1e1e] dark:text-[#ffd716]" />}
                      <div className={m.role === "user" ? "max-w-[85%]" : "min-w-0 flex-1"}>
                        {m.role === "user" ? (
                          <div className="rounded-2xl rounded-br-md bg-[#1e1e1e] dark:bg-white px-3.5 py-2 text-sm text-white dark:text-[#1e1e1e]">
                            {m.content}
                          </div>
                        ) : m.pending ? (
                          <div className="flex items-center gap-1.5 py-1">
                            {[0, 1, 2].map((d) => (
                              <motion.span
                                key={d}
                                className="h-1.5 w-1.5 rounded-full bg-[#1e1e1e]/40 dark:bg-white/40"
                                animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                              />
                            ))}
                          </div>
                        ) : (
                          <>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#1e1e1e] dark:text-white/85">
                              {m.content}
                            </div>
                            {!!m.citations?.length && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {m.citations.map((c, ci) => (
                                  <span
                                    key={ci}
                                    title={c.snippet ?? c.title}
                                    className="rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 px-2 py-0.5 text-[10px] text-[#3d3d3d] dark:text-white/70"
                                  >
                                    {c.title}
                                  </span>
                                ))}
                              </div>
                            )}
                            {m.proposal && (
                              <div className="mt-2.5 rounded-xl border border-[#ffd716]/60 bg-[#ffd716]/10 dark:bg-[#ffd716]/[0.07] p-3">
                                <p className="text-sm text-[#3d3d3d] dark:text-white/80">{m.proposal.summary}</p>
                                <div className="mt-2 flex justify-end">
                                  {applied.has(i) ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                      <Check className="h-3.5 w-3.5" /> Applied
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => void apply(i, m.proposal!)}
                                      disabled={applying === i || !m.proposal.ready}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-[#1e1e1e] transition hover:opacity-85 disabled:opacity-50"
                                    >
                                      {applying === i && <Loader2 className="h-3 w-3 animate-spin" />}
                                      {m.proposal.ready ? "Apply" : "Needs detail"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {notice && (
                <div className="mx-4 mb-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                  {notice}
                </div>
              )}

              <div className="border-t border-black/10 dark:border-white/10 p-3">
                <div className="flex items-end gap-2 rounded-2xl border border-black/10 dark:border-white/15 bg-[#f7f7f7] dark:bg-white/5 px-3 py-1.5 focus-within:border-[#ffd716]">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Ask about this…"
                    className="flex-1 resize-none bg-transparent py-1 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#9a9a9a] outline-none"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim() || busy}
                    className="mb-0.5 grid h-7 w-7 place-items-center rounded-full bg-[#ffd716] text-[#1e1e1e] transition hover:brightness-95 disabled:opacity-40"
                    aria-label="Send"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
