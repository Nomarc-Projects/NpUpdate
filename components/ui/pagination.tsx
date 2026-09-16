"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared pagination bar — Previous · 1 2 3 4 [5] … 99 · Next, with an optional
 * "Showing A–B of N results" summary. Truncates with ellipses so long ranges
 * (thousands of pages) never spill into an endless number row.
 *
 * `page` is 1-based.
 */
export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** When provided, renders the "Showing A–B of N" summary. */
  totalItems?: number;
  pageSize?: number;
  /** Singular/plural noun for the summary, e.g. "result". */
  noun?: string;
  className?: string;
}

/** Page tokens with ellipses: [1, "…", 4, 5, 6, "…", 99]. */
function pageTokens(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function Pagination({ page, pageCount, onPageChange, totalItems, pageSize, noun = "result", className }: PaginationProps) {
  if (pageCount <= 1 && totalItems == null) return null;
  const current = Math.min(Math.max(1, page), Math.max(1, pageCount));
  const tokens = pageTokens(current, Math.max(1, pageCount));

  const summary =
    totalItems != null && pageSize != null && totalItems > 0
      ? `Showing ${((current - 1) * pageSize + 1).toLocaleString()}–${Math.min(current * pageSize, totalItems).toLocaleString()} of ${totalItems.toLocaleString()} ${totalItems === 1 ? noun : `${noun}s`}`
      : null;

  const navBtn =
    "inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[13px] font-medium text-[#3f3f3f] dark:text-white/70 hover:bg-[#f5f5f5] dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors";

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap", className)}>
      <nav className="flex items-center gap-0.5" aria-label="Pagination">
        <button type="button" className={navBtn} onClick={() => onPageChange(current - 1)} disabled={current <= 1}>
          <ChevronLeft size={15} /> <span className="hidden sm:inline">Previous</span>
        </button>

        {tokens.map((t, i) =>
          t === "…" ? (
            <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-[#b3b3b3] select-none">…</span>
          ) : (
            <button
              key={t}
              type="button"
              onClick={() => onPageChange(t)}
              aria-current={t === current ? "page" : undefined}
              className={cn(
                "w-9 h-9 rounded-lg text-[13px] font-semibold transition-colors",
                t === current
                  ? "bg-[#ffd716] text-[#1e1e1e] shadow-sm"
                  : "text-[#3f3f3f] dark:text-white/70 hover:bg-[#f5f5f5] dark:hover:bg-white/5",
              )}
            >
              {t}
            </button>
          ),
        )}

        <button type="button" className={navBtn} onClick={() => onPageChange(current + 1)} disabled={current >= pageCount}>
          <span className="hidden sm:inline">Next</span> <ChevronRight size={15} />
        </button>
      </nav>

      {summary && <p className="text-[12.5px] text-[#9a9a9a] dark:text-white/50">{summary}</p>}
    </div>
  );
}
