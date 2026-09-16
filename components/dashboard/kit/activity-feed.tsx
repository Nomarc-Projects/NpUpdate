"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity as ActivityIcon, ShieldCheck, Megaphone, Users, MessageSquare,
  Package, ShoppingBag, FileText, ArrowRight, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icons a Server Component may request, by name.
 *
 * A component reference is a function, and functions cannot cross the
 * server/client boundary — passing `icon: ShieldCheck` from a server page threw
 * "Functions cannot be passed directly to Client Components" and took the whole
 * admin overview down as soon as the audit log had a row to render. Client
 * callers can still pass `icon` directly; server callers pass `iconName`.
 */
const ICONS = {
  activity: ActivityIcon,
  shield: ShieldCheck,
  megaphone: Megaphone,
  users: Users,
  message: MessageSquare,
  package: Package,
  bag: ShoppingBag,
  file: FileText,
} as const;

export type ActivityIconName = keyof typeof ICONS;

export type ActivityItem = {
  id?: string;
  /** Client callers only — a component reference cannot be sent from the server. */
  icon?: LucideIcon;
  /** Server-safe alternative to `icon`. Resolved to a component on the client. */
  iconName?: ActivityIconName;
  text: React.ReactNode;
  /** Right-aligned timestamp / due label, e.g. "2 hours ago" or "Tomorrow 2PM". */
  meta: string;
};

/**
 * Activity feed with a Recent / Upcoming segmented toggle (image 88/69).
 * Rows = circular icon tile + text + right meta. The toggle only shows when
 * `upcoming` items are supplied.
 */
export function ActivityFeed({
  recent,
  upcoming,
  title = "Activity",
  className,
  viewMoreHref,
  viewMoreLabel = "View more",
}: {
  recent: ActivityItem[];
  upcoming?: ActivityItem[];
  title?: string;
  className?: string;
  /** Shows a footer link, e.g. to the full audit log. Omitted = no link. */
  viewMoreHref?: string;
  viewMoreLabel?: string;
}) {
  const hasUpcoming = !!upcoming && upcoming.length > 0;
  const [tab, setTab] = useState<"recent" | "upcoming">("recent");
  const items = tab === "upcoming" && hasUpcoming ? upcoming! : recent;

  return (
    <div className={cn("rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{title}</p>
        {hasUpcoming && (
          <div className="flex items-center gap-1 rounded-full bg-[#f4f4f4] p-0.5 dark:bg-white/5">
            {(["recent", "upcoming"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-semibold capitalize transition-colors",
                  tab === t ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.ul
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="mt-4 space-y-1"
        >
          {items.length === 0 && <li className="py-6 text-center text-[13px] text-[#9a9a9a]">Nothing here yet.</li>}
          {items.map((it, i) => {
            const Icon = it.icon ?? (it.iconName ? ICONS[it.iconName] : undefined) ?? ActivityIcon;
            return (
              <li key={it.id ?? i} className="flex items-center gap-3 rounded-xl px-1 py-2.5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] dark:bg-white/5">
                  <Icon size={15} className="text-[#6b6b6b] dark:text-white/60" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] text-[#3d3d3d] dark:text-white/75">{it.text}</span>
                <span className="flex-shrink-0 text-[11.5px] text-[#9a9a9a]">{it.meta}</span>
              </li>
            );
          })}
        </motion.ul>
      </AnimatePresence>

      {viewMoreHref && (
        <div className="mt-3 border-t border-[#f0f0f0] pt-3 dark:border-white/10">
          <Link
            href={viewMoreHref}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:text-[#caa400] dark:text-white dark:hover:text-[#ffd716]"
          >
            {viewMoreLabel}
            <ArrowRight size={15} className="text-[#8a6d00] dark:text-[#ffd716]" />
          </Link>
        </div>
      )}
    </div>
  );
}
