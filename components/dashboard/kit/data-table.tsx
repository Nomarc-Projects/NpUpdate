"use client";

import { useMemo, useState } from "react";
import { Copy, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Page numbers to render, collapsing long ranges with an ellipsis:
 * `1 2 3 4 5 … 15`. Always shows first/last plus a window around the
 * current page. Returns 0-based indices ("…" marks a gap).
 */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const out: (number | "…")[] = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 2) out.push("…");
  out.push(total - 1);
  return out;
}

export type DataTableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

/** A copy-to-clipboard cell (email/phone columns throughout the Directory, images 50/56). */
export function CopyChip({ value }: { value: string }) {
  if (!value) return <span className="text-[#c9c9c9] dark:text-white/25">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#3d3d3d] dark:text-white/75">
      {value}
      <button
        onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(value); toast.success("Copied"); }}
        className="text-[#b3b3b3] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"
        aria-label="Copy"
      >
        <Copy size={12} />
      </button>
    </span>
  );
}

/**
 * Directory/admin data table: checkbox multi-select + bulk toolbar, row-hover
 * inline actions, client-side pagination ("Showing N-M of T"). Callers pass
 * the full filtered row set; pagination is handled internally.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectable = false,
  selected,
  onSelectedChange,
  bulkActions,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  rowHoverActions,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Rendered in a toolbar row above the table when selection is non-empty. */
  bulkActions?: (selectedIds: string[], clear: () => void) => React.ReactNode;
  /** Initial rows per page; the user can change it via the per-page selector. */
  pageSize?: number;
  /** Choices offered in the rows-per-page selector. */
  pageSizeOptions?: number[];
  /** Optional right-aligned hover actions per row (e.g. quick view / message icons). */
  rowHoverActions?: (row: T) => React.ReactNode;
  className?: string;
}) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  // Keep the current page in range when rows shrink (filtering) or perPage grows.
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(() => rows.slice(safePage * perPage, safePage * perPage + perPage), [rows, safePage, perPage]);
  const sel = selected ?? new Set<string>();

  function toggleRow(id: string) {
    if (!onSelectedChange) return;
    const next = new Set(sel);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectedChange(next);
  }
  function toggleAllOnPage() {
    if (!onSelectedChange) return;
    const ids = pageRows.map(rowKey);
    const allSelected = ids.every((id) => sel.has(id));
    const next = new Set(sel);
    ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
    onSelectedChange(next);
  }

  return (
    <div className={className}>
      {selectable && sel.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#fff7cc] px-4 py-2.5 dark:bg-[#ffd716]/10">
          <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{sel.size} selected</span>
          <button onClick={() => onSelectedChange?.(new Set())} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#c53434] hover:underline">
            <X size={12} /> Clear selection
          </button>
          <div className="ml-auto flex items-center gap-2">{bulkActions?.(Array.from(sel), () => onSelectedChange?.(new Set()))}</div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#ececec] dark:border-white/10">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#ececec] bg-[#fafafa] text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a] dark:border-white/10 dark:bg-white/[0.03]">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => sel.has(rowKey(r)))}
                    onChange={toggleAllOnPage}
                    className="h-4 w-4 rounded border-[#d4d4d4] accent-[#ffd716]"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3", c.className)}>{c.label}</th>
              ))}
              {rowHoverActions && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const id = rowKey(row);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "group border-b border-[#f0f0f0] last:border-0 dark:border-white/5",
                    onRowClick && "cursor-pointer hover:bg-[#fafafa] dark:hover:bg-white/[0.02]",
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={sel.has(id)} onChange={() => toggleRow(id)} className="h-4 w-4 rounded border-[#d4d4d4] accent-[#ffd716]" />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3", c.className)}>{c.render(row)}</td>
                  ))}
                  {rowHoverActions && (
                    <td className="px-4 py-3 text-right opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      {rowHoverActions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0) + (rowHoverActions ? 1 : 0)} className="px-4 py-10 text-center text-[13px] text-[#9a9a9a]">No results.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* rows-per-page */}
          <div className="flex items-center gap-2">
            <label htmlFor="dt-per-page" className="text-[12.5px] text-[#9a9a9a]">Rows</label>
            <select
              id="dt-per-page"
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }}
              className="h-8 rounded-lg border border-[#e5e5e5] bg-white px-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white"
            >
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <p className="text-[12.5px] text-[#9a9a9a]">
              Results: {safePage * perPage + 1}–{Math.min(rows.length, (safePage + 1) * perPage)} of {rows.length}
            </p>
          </div>

          {/* numbered pages with ellipsis */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] disabled:opacity-40 dark:border-white/15 dark:text-white/60 dark:hover:bg-white/5"
            >
              <ChevronLeft size={14} />
            </button>

            {pageWindow(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="px-1.5 text-[12.5px] text-[#9a9a9a]">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-current={p === safePage ? "page" : undefined}
                  className={cn(
                    "h-8 min-w-8 rounded-lg px-2 text-[12.5px] font-semibold transition-colors",
                    p === safePage
                      ? "bg-[#ffd716] text-[#1e1e1e]"
                      : "border border-[#e5e5e5] text-[#6b6b6b] hover:bg-[#f5f5f5] dark:border-white/15 dark:text-white/60 dark:hover:bg-white/5",
                  )}
                >
                  {p + 1}
                </button>
              ),
            )}

            <button
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] disabled:opacity-40 dark:border-white/15 dark:text-white/60 dark:hover:bg-white/5"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
