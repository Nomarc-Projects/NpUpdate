"use client";

import { useCallback, useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, ArrowUp, MessageSquarePlus, RotateCcw, X } from "lucide-react";
import { HelmIcon } from "@/components/ui/helm-icon";
import { useNavUi } from "@/lib/store/nav-ui";
import { cn } from "@/lib/utils";

/**
 * Helm (public) — the site assistant.
 *
 * A floating action button on the marketing chrome that opens a compact chat
 * panel. Deliberately much simpler than the dashboard consultant: no history
 * rail, no persistence, no write proposals. The conversation lives in React
 * state only and resets on reload — that is intended, since Helm (public) is
 * anonymous and ungated.
 *
 * Talks to `POST /api/guide`, which relays to the Helm VM behind a per-IP rate
 * limit. Every failure mode that route can return is handled as calm copy
 * rather than an error surface: 429 (too fast), 503 (not configured yet) and
 * 502 (brain unreachable).
 */

const MAX_CHARS = 2000;
/** The VM cold-starts; past this many seconds we explain the wait. */
const SLOW_REPLY_SECONDS = 6;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { ref: string; title: string }[];
  navigate?: { href: string; label: string } | null;
  /** Rendered as a calm inline notice rather than a chat bubble. */
  tone?: "normal" | "notice";
};

const STARTERS: { label: string; prompt: string }[] = [
  { label: "What is Nomarc?", prompt: "What is Nomarc and who is it for?" },
  { label: "Find work", prompt: "I'm an architect in Lagos — how do I find work on Nomarc?" },
  { label: "Sell materials", prompt: "I supply building materials. How do I list my products?" },
  { label: "Plans & pricing", prompt: "What do the plans cost and what's included?" },
];

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

/* ─── Assistant markdown ──────────────────────────────────────────────────
 * Styled inline (no typography plugin here) so replies with lists, bold and
 * the occasional link read properly in both themes. */
function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[14px] leading-relaxed text-[#1e1e1e] dark:text-[#e8e8e8]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (p) => <p className="mb-2 last:mb-0" {...p} />,
          ul: (p) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0" {...p} />,
          ol: (p) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0" {...p} />,
          li: (p) => <li className="pl-0.5" {...p} />,
          strong: (p) => <strong className="font-semibold text-[#1e1e1e] dark:text-white" {...p} />,
          em: (p) => <em className="italic" {...p} />,
          a: (p) => (
            <a
              className="font-medium text-[#1e1e1e] underline decoration-[#ffd716] decoration-2 underline-offset-2 transition-colors hover:text-[#caa400] dark:text-white dark:hover:text-[#ffd716]"
              target="_blank"
              rel="noopener noreferrer"
              {...p}
            />
          ),
          h1: (p) => <h3 className="mb-1.5 mt-3 text-[15px] font-bold first:mt-0" {...p} />,
          h2: (p) => <h3 className="mb-1.5 mt-3 text-[15px] font-bold first:mt-0" {...p} />,
          h3: (p) => <h4 className="mb-1 mt-2.5 font-semibold first:mt-0" {...p} />,
          code: ({ className, ...rest }: ComponentPropsWithoutRef<"code">) =>
            /language-/.test(className || "") ? (
              <code className="font-mono text-[12.5px]" {...rest} />
            ) : (
              <code
                className="rounded bg-[#f5f5f5] px-1.5 py-0.5 font-mono text-[12.5px] dark:bg-white/10"
                {...rest}
              />
            ),
          pre: (p) => (
            <pre
              className="mb-2 overflow-x-auto rounded-xl border border-[#ececec] bg-[#fafafa] p-3 text-[12.5px] last:mb-0 dark:border-white/10 dark:bg-white/5"
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote className="border-l-2 border-[#ffd716] pl-3 text-[#6b6b6b] dark:text-[#9a9a9a]" {...p} />
          ),
          table: (p) => (
            <div className="mb-2 overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]" {...p} />
            </div>
          ),
          th: (p) => (
            <th
              className="border border-[#ececec] bg-[#fafafa] px-2 py-1 text-left font-semibold dark:border-white/10 dark:bg-white/5"
              {...p}
            />
          ),
          td: (p) => <td className="border border-[#ececec] px-2 py-1 dark:border-white/10" {...p} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Three breathing dots while a reply is in flight. */
function TypingDots() {
  return (
    <span className="flex items-center gap-1.5 py-1" role="status" aria-label="Nomabot is thinking">
      {[0, 0.15, 0.3].map((delay) => (
        <motion.span
          key={delay}
          className="h-2 w-2 rounded-full bg-[#caa400] dark:bg-[#ffd716]"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/**
 * The Helm VM sleeps when idle, so the first question after a quiet spell can
 * sit for a while. Silence reads as "broken" — explain it instead.
 */
function WaitingNote({ seconds }: { seconds: number }) {
  if (seconds < SLOW_REPLY_SECONDS) return null;
  const note =
    seconds >= 25
      ? "Still warming up — hang on, it's nearly there."
      : "Taking a moment… the assistant is waking up. It's quicker after the first question.";
  return (
    <p className="mt-2 max-w-[19rem] text-[12px] leading-relaxed text-[#898989]">
      {note} <span className="tabular-nums opacity-70">({seconds}s)</span>
    </p>
  );
}

export function GuideFab() {
  const [open, setOpen] = useState(false);
  const menuOpen = useNavUi((s) => s.menuOpen);
  // The chat panel is pinned to the same corner, so it has to go too — hiding
  // only the button would leave the panel floating over the open nav.
  useEffect(() => { if (menuOpen) setOpen(false); }, [menuOpen]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waited, setWaited] = useState(0);
  /** Flipped by a 503 — the brain isn't wired up yet, so stop inviting input. */
  const [unavailable, setUnavailable] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const empty = messages.length === 0;

  /* Keep the newest message in view. Scroll the panel's own container rather
   * than scrollIntoView, which would drag the page behind the panel. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, waited]);

  /* Auto-grow the composer with its content, capped so it can't eat the panel. */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  /* Tick while waiting so WaitingNote can explain a cold start. */
  useEffect(() => {
    if (!loading) {
      setWaited(0);
      return;
    }
    const started = Date.now();
    const t = setInterval(() => setWaited(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [loading]);

  /* Escape closes the panel from anywhere inside it. */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* On phones the panel is full-screen, so lock the page behind it. The desktop
   * panel is a floating card and must leave the page scrollable. */
  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    if (!mobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || loading || unavailable) return;

      // Only real turns go back as history — notices are our own UI copy.
      const history = messages
        .filter((m) => m.tone !== "notice")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, { id: newId(), role: "user", content: text }]);
      setInput("");
      setLoading(true);

      const notice = (content: string) =>
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", content, tone: "notice" }]);

      try {
        const res = await fetch("/api/guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history }),
        });

        if (!res.ok) {
          if (res.status === 429) {
            notice("That's a lot of questions at once. Give it a minute, then ask me again.");
          } else if (res.status === 503) {
            setUnavailable(true);
            notice(
              "Chat isn't switched on just yet — I'm still being wired up. In the meantime the Tools page and the FAQ on the homepage cover most of it, or you can reach the team from the contact page.",
            );
          } else {
            notice(
              "I couldn't reach my brain just then. Give it another go in a moment — and if it keeps happening, the contact page will get you to a human.",
            );
          }
          return;
        }

        const data = (await res.json()) as {
          answer?: string;
          citations?: { ref: string; title: string }[];
          navigate?: { href: string; label: string } | null;
        };

        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: data.answer?.trim() || "I'm not quite sure how to answer that one. Try rephrasing it?",
            citations: data.citations,
            navigate: data.navigate ?? null,
          },
        ]);
      } catch {
        notice("Something went wrong on the way there — check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [input, loading, unavailable, messages],
  );

  function reset() {
    setMessages([]);
    setInput("");
    focusInput();
  }

  const canSend = !!input.trim() && !loading && !unavailable;

  return (
    <>
      {/* ─── Floating action button ─────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) focusInput();
        }}
        aria-label={open ? "Close Nomabot" : "Ask Nomabot"}
        aria-expanded={open}
        initial={{ scale: 0, opacity: 0 }}
        // Steps aside entirely while the mobile nav panel covers the screen.
        animate={menuOpen ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 22, delay: menuOpen ? 0 : 0.6 }}
        aria-hidden={menuOpen}
        // `--nm-bottom-bar` is published by whichever surface has a bar pinned
        // to the bottom of the viewport (the PDP buy bar); it's 0 elsewhere, so
        // the FAB only lifts where something would otherwise sit under it.
        className={cn(
          "group fixed right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#ffd716] text-[#1e1e1e] shadow-lg shadow-[#ffd716]/25 transition-all duration-200 hover:scale-105 hover:bg-[#e6c114] hover:shadow-xl hover:shadow-[#ffd716]/30 active:scale-95 md:right-6",
          "bottom-[calc(var(--nm-bottom-bar)+env(safe-area-inset-bottom)+1.25rem)] md:bottom-[calc(var(--nm-bottom-bar)+env(safe-area-inset-bottom)+1.5rem)]",
          menuOpen && "pointer-events-none",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <X size={22} strokeWidth={2.2} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <HelmIcon className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* one-off attention ping, settles quickly so it never nags */}
        {!open && empty && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[#ffd716]/40 motion-safe:animate-ping" />
        )}

        {/* desktop hover label */}
        <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-[#1e1e1e] px-3 py-1.5 text-[12.5px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 md:block dark:bg-white dark:text-[#1e1e1e]">
          Ask Nomabot
        </span>
      </motion.button>

      {/* ─── Chat panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* mobile scrim — desktop keeps the page visible and interactive */}
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] sm:hidden"
            />

            <motion.div
              key="panel"
              role="dialog"
              aria-label="Nomabot"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              style={{ transformOrigin: "bottom right" }}
              className={cn(
                "fixed z-[70] flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#1e1e1e]",
                // mobile: full-screen sheet
                "inset-0 rounded-none",
                // desktop: floating card anchored above the FAB
                "sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(620px,calc(100dvh-8rem))] sm:w-[400px] sm:rounded-3xl",
                "border border-[#ececec] dark:border-white/10",
              )}
            >
              {/* header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-[#ececec] px-4 py-3 dark:border-white/10">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ffd716] text-[#1e1e1e]">
                  <HelmIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-[#1e1e1e] dark:text-white">Nomabot</p>
                  <p className="truncate text-[12px] text-[#898989]">
                    {unavailable ? "Currently offline" : loading ? "Thinking…" : "Ask me anything about Nomarc"}
                  </p>
                </div>
                {!empty && (
                  <button
                    type="button"
                    onClick={reset}
                    aria-label="Start a new conversation"
                    title="Start over"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#898989] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#898989] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              {/* transcript */}
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                {empty ? (
                  <div className="flex h-full flex-col justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 }}
                      className="text-center"
                    >
                      <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#ffd716]/15 text-[#caa400] dark:text-[#ffd716]">
                        <HelmIcon className="h-7 w-7" />
                      </span>
                      <h3 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">Hi, I&apos;m Nomabot</h3>
                      <p className="mx-auto mt-1.5 max-w-[19rem] text-[13.5px] leading-relaxed text-[#898989]">
                        I can explain how Nomarc works, who it&apos;s for, what the plans cost, and point you to the
                        right page. What would you like to know?
                      </p>
                    </motion.div>

                    <div className="mt-6 space-y-2">
                      {STARTERS.map((s, i) => (
                        <motion.button
                          key={s.label}
                          type="button"
                          onClick={() => void send(s.prompt)}
                          disabled={unavailable}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.14 + i * 0.05 }}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-[#ececec] bg-white px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffd716] hover:shadow-md disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#ffd716]/50"
                        >
                          <span className="flex-1 text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white">
                            {s.label}
                          </span>
                          <ArrowUp
                            size={15}
                            className="shrink-0 rotate-45 text-[#c9c9c9] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#caa400] dark:text-[#5a5a5a] dark:group-hover:text-[#ffd716]"
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((m) =>
                      m.role === "user" ? (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-end"
                        >
                          <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#ffd716] px-3.5 py-2.5 text-[14px] leading-relaxed text-[#1e1e1e]">
                            {m.content}
                          </p>
                        </motion.div>
                      ) : m.tone === "notice" ? (
                        <motion.p
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl border border-[#ececec] bg-[#fafafa] px-3.5 py-3 text-[13.5px] leading-relaxed text-[#6b6b6b] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#9a9a9a]"
                        >
                          {m.content}
                        </motion.p>
                      ) : (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2.5"
                        >
                          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#ffd716]/15 text-[#caa400] dark:text-[#ffd716]">
                            <HelmIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <AssistantMarkdown content={m.content} />

                            {m.navigate?.href && (
                              <Link
                                href={m.navigate.href}
                                onClick={() => setOpen(false)}
                                className="group mt-3 inline-flex items-center gap-2 rounded-full bg-[#1e1e1e] px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-[#ffd716] hover:text-[#1e1e1e] dark:bg-white dark:text-[#1e1e1e] dark:hover:bg-[#ffd716]"
                              >
                                {m.navigate.label}
                                <ArrowRight
                                  size={14}
                                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                                />
                              </Link>
                            )}

                            {m.citations && m.citations.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {m.citations.map((c, i) => (
                                  <span
                                    key={`${c.ref}-${i}`}
                                    className="rounded-md border border-[#ececec] bg-[#fafafa] px-2 py-0.5 text-[11px] text-[#898989] dark:border-white/10 dark:bg-white/5"
                                  >
                                    {c.title || c.ref}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ),
                    )}

                    {loading && (
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#ffd716]/15 text-[#caa400] dark:text-[#ffd716]">
                          <HelmIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <TypingDots />
                          <WaitingNote seconds={waited} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* composer */}
              <div
                className="shrink-0 border-t border-[#ececec] px-3 py-3 dark:border-white/10"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                {unavailable ? (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-[#ececec] bg-[#fafafa] px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <MessageSquarePlus size={16} className="shrink-0 text-[#898989]" />
                    <p className="text-[12.5px] leading-relaxed text-[#898989]">
                      Chat isn&apos;t available yet — try the{" "}
                      <Link
                        href="/contact"
                        onClick={() => setOpen(false)}
                        className="font-semibold text-[#1e1e1e] underline decoration-[#ffd716] decoration-2 underline-offset-2 dark:text-white"
                      >
                        contact page
                      </Link>{" "}
                      in the meantime.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 rounded-2xl border border-[#ececec] bg-[#fafafa] p-1.5 transition-colors focus-within:border-[#ffd716] dark:border-white/10 dark:bg-white/[0.04]">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      rows={1}
                      maxLength={MAX_CHARS}
                      disabled={loading}
                      placeholder="Ask about Nomarc…"
                      aria-label="Message Nomabot"
                      className="max-h-[120px] min-h-[36px] w-full resize-none bg-transparent px-2 py-2 text-[14px] leading-relaxed text-[#1e1e1e] outline-none placeholder:text-[#a5a5a5] disabled:opacity-60 dark:text-white dark:placeholder:text-[#6b6b6b]"
                    />
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={!canSend}
                      aria-label="Send"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffd716] text-[#1e1e1e] transition-all duration-200 hover:bg-[#e6c114] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#ececec] disabled:text-[#a5a5a5] dark:disabled:bg-white/10 dark:disabled:text-[#6b6b6b]"
                    >
                      <ArrowUp size={17} strokeWidth={2.4} />
                    </button>
                  </div>
                )}

                <p className="mt-2 text-center text-[11px] text-[#a5a5a5] dark:text-[#6b6b6b]">
                  Nomabot can make mistakes. This chat isn&apos;t saved.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
