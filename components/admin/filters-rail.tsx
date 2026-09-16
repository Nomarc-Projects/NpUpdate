"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };
export type FilterGroup = {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
};

/**
 * Left filter rail used across the admin list screens (Professionals,
 * Exhibitors, Job Board, Exhibition Hub, Ad Reviews, Active Campaigns).
 * Each group is a collapsible disclosure; the active option is highlighted.
 * Falls back to a horizontal row of native selects below `md` where a
 * ~180px sidebar doesn't fit.
 */
export function FiltersRail({ groups }: { groups: FilterGroup[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <>
      {/* Desktop: collapsible rail */}
      <div className="hidden w-[180px] flex-shrink-0 md:block">
        <p className="mb-3 text-[13px] font-bold text-[#1e1e1e] dark:text-white">Filters</p>
        <div className="space-y-1">
          {groups.map((g) => {
            const open = openKey === g.key;
            const activeLabel = g.options.find((o) => o.value === g.value)?.label;
            return (
              <div key={g.key}>
                <button
                  onClick={() => setOpenKey(open ? null : g.key)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[#3d3d3d] transition-colors hover:bg-[#f5f5f5] dark:text-white/70 dark:hover:bg-white/5"
                >
                  <span className="truncate">{activeLabel && g.value ? activeLabel : g.label}</span>
                  <ChevronDown size={14} className={cn("flex-shrink-0 transition-transform", open && "rotate-180")} />
                </button>
                {open && (
                  <div className="mb-1 ml-1 space-y-0.5 rounded-lg border border-[#ececec] bg-white p-1.5 dark:border-white/10 dark:bg-[#1e1e1e]">
                    {g.options.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => { g.onChange(o.value); setOpenKey(null); }}
                        className={cn(
                          "block w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                          g.value === o.value
                            ? "bg-[#fff7cc] font-semibold text-[#1e1e1e] dark:bg-[#ffd716]/15 dark:text-[#ffd716]"
                            : "text-[#6b6b6b] hover:bg-[#f5f5f5] dark:text-white/60 dark:hover:bg-white/5"
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile / narrow: horizontal native selects */}
      <div className="flex flex-wrap gap-2 md:hidden">
        {groups.map((g) => (
          <select
            key={g.key}
            value={g.value}
            onChange={(e) => g.onChange(e.target.value)}
            className="rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-1.5 text-[12.5px] text-[#1e1e1e] dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white"
          >
            {g.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
      </div>
    </>
  );
}
