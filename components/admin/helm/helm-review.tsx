"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Check, FileText, MessageSquareWarning, Search, ThumbsDown, Unplug } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import { clearHelmMessageRating, type HelmReviewItem } from "@/lib/services/helm-admin";

type FilterKey = "all" | "downvoted" | "ungrounded";

function shortDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function HelmReviewView({ items }: { items: HelmReviewItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [, start] = useTransition();

  const filtered = useMemo(
    () =>
      items.filter((it) => {
        if (filter === "downvoted" && it.rating !== -1) return false;
        if (filter === "ungrounded" && it.grounded) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            it.question.toLowerCase().includes(q) ||
            it.answer.toLowerCase().includes(q) ||
            it.userName.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [items, filter, search],
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      downvoted: items.filter((i) => i.rating === -1).length,
      ungrounded: items.filter((i) => !i.grounded).length,
    }),
    [items],
  );

  function clear(messageId: string) {
    start(async () => {
      const res = await clearHelmMessageRating(messageId);
      if (res.ok) { toast.success("Marked as triaged"); router.refresh(); }
      else toast.error(res.error ?? "Couldn't clear");
    });
  }

  const FILTERS: { key: FilterKey; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "downvoted", label: "Thumbs-down", n: counts.downvoted },
    { key: "ungrounded", label: "Ungrounded", n: counts.ungrounded },
  ];

  return (
    <div className="space-y-4">
      <Reveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-1 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  filter === f.key
                    ? "bg-[#fff7cc] text-[#1e1e1e] dark:bg-white/[0.08] dark:text-white"
                    : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white",
                )}
              >
                {f.label} <span className="tabular-nums text-[#c4c4c4]">{f.n}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9a9a]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions, answers, users…"
              className="w-full rounded-lg border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] py-2 pl-9 pr-3 text-sm text-[#1e1e1e] dark:text-white outline-none focus:border-[#ffd716]"
            />
          </div>
        </div>
      </Reveal>

      {filtered.length === 0 ? (
        <Reveal>
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] px-6 py-16 text-center">
            <MessageSquareWarning className="mx-auto h-10 w-10 text-[#d4d4d4]" />
            <p className="mt-3 text-sm font-medium text-[#1e1e1e] dark:text-white">Nothing to review</p>
            <p className="mt-1 text-[13px] text-[#9a9a9a]">
              Thumbs-down answers and ungrounded replies show up here as corpus-gap signals.
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="space-y-3">
          {filtered.map((it, i) => (
            <Reveal key={it.messageId} delay={Math.min(i * 0.02, 0.2)}>
              <article className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {it.rating === -1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fee2e2] px-2 py-0.5 text-[11px] font-semibold text-[#dc2626] dark:bg-[#ef4444]/15 dark:text-[#fca5a5]">
                      <ThumbsDown className="h-3 w-3" /> Thumbs-down
                    </span>
                  )}
                  {!it.grounded && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[11px] font-semibold text-[#b45309] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]">
                      <Unplug className="h-3 w-3" /> Ungrounded
                    </span>
                  )}
                  <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[11px] font-medium text-[#6b6b6b] dark:bg-white/10 dark:text-white/60">
                    {it.disciplineLabel}
                  </span>
                  <span className="ml-auto text-[11px] text-[#9a9a9a]">{shortDate(it.createdAt)}</span>
                </div>

                <div className="mt-3 space-y-2.5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Question</p>
                    <p className="mt-0.5 text-sm text-[#1e1e1e] dark:text-white/85">{it.question || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Nomabot answered</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#3d3d3d] dark:text-white/70 line-clamp-6">{it.answer}</p>
                  </div>
                  {it.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {it.citations.map((c, ci) => (
                        <span key={ci} className="inline-flex items-center gap-1 rounded-full border border-[#ececec] dark:border-white/15 px-2 py-0.5 text-[11px] text-[#6b6b6b] dark:text-white/60">
                          <FileText className="h-3 w-3" /> {c.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#f0f0f0] dark:border-white/10 pt-3">
                  <span className="text-xs text-[#9a9a9a]">
                    {it.userName} · {it.userEmail}
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/helm/knowledge`}
                      className="text-xs font-medium text-[#b89500] hover:underline dark:text-[#ffd716]"
                    >
                      Fix corpus →
                    </Link>
                    {it.rating === -1 && (
                      <button
                        onClick={() => clear(it.messageId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#ececec] dark:border-white/15 px-2.5 py-1.5 text-xs font-medium text-[#1e1e1e] dark:text-white transition hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark triaged
                      </button>
                    )}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
