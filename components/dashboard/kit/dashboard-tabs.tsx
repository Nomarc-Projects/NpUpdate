"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Horizontal tab bar for the dashboard home (Overview / Projects|Catalog /
 * Recommendations / Ads Board). Controlled — the parent owns `active`. An
 * animated underline (shared layoutId) slides between tabs.
 */
export type TabItem = { key: string; label: string };

export function DashboardTabs({
  tabs,
  active,
  onChange,
  className,
  layoutId = "dash-tab-underline",
  trailing,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
  layoutId?: string;
  /** Optional right-aligned slot in the same bordered row (e.g. a Drafts tab + "Add new" link). */
  trailing?: React.ReactNode;
}) {
  return (
    // Slides horizontally rather than wrapping — four tabs don't fit a phone,
    // and "Ads Board" was stacking onto two lines and jostling the row height.
    // The underline sits at `bottom-0` (not `-bottom-px`) so the scroll
    // container has nothing to clip and no stray vertical scrollbar appears.
    <div
      className={cn(
        "flex items-center gap-1 border-b border-[#ececec] dark:border-white/10",
        "overflow-x-auto overscroll-x-contain no-scrollbar",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "relative flex-shrink-0 whitespace-nowrap px-3.5 py-2.5 text-[13.5px] font-medium transition-colors",
              isActive ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white",
            )}
          >
            {t.label}
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#ffd716]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
          </button>
        );
      })}
      {trailing && <div className="ml-auto flex flex-shrink-0 items-center gap-1">{trailing}</div>}
    </div>
  );
}
