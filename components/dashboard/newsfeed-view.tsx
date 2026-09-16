"use client";

import Link from "next/link";
import { Briefcase, Building2, UserRound, Newspaper, CalendarDays, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/kit/empty-state";
import type { FeedItem, FeedKind } from "@/lib/services/feed";

const KIND_META: Record<FeedKind, { icon: LucideIcon; label: string; tint: string }> = {
  job: { icon: Briefcase, label: "Job posting", tint: "bg-[#fffdf2] text-[#caa400] dark:bg-[#ffd716]/10 dark:text-[#ffd716]" },
  company: { icon: Building2, label: "New company", tint: "bg-[#eef2ff] text-[#4f46e5] dark:bg-[#4f46e5]/15 dark:text-[#a5b4fc]" },
  professional: { icon: UserRound, label: "Joined the network", tint: "bg-[#dcfce7] text-[#16803c] dark:bg-[#16a34a]/15 dark:text-[#4ade80]" },
  article: { icon: Newspaper, label: "Industry news", tint: "bg-[#f3e8ff] text-[#9333ea] dark:bg-[#9333ea]/15 dark:text-[#d8b4fe]" },
  event: { icon: CalendarDays, label: "Upcoming event", tint: "bg-[#ffe4e6] text-[#be123c] dark:bg-[#be123c]/15 dark:text-[#fda4af]" },
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function initials(name?: string | null) {
  return (name ?? "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "NM";
}

export function NewsfeedView({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={Newspaper}
        title="The feed is quiet"
        description="New jobs, companies, articles and events across Nomarc will show up here as they happen."
      />
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[#f0f0f0] dark:bg-white/10" aria-hidden />
      <div className="space-y-4">
        {items.map((item) => {
          const meta = KIND_META[item.kind];
          const Icon = meta.icon;
          return (
            <Link key={item.id} href={item.href} className="relative flex gap-3 group">
              <div className={cnWrap(meta.tint)}>
                <Icon size={15} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#181818] px-4 py-3 group-hover:border-[#ffd716]/60 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">{meta.label}</span>
                  <span className="text-[11px] text-[#b3b3b3] flex-shrink-0">{timeAgo(item.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  {item.image
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-[#ececec] dark:border-white/10" />
                    : <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-[#9a9a9a] flex-shrink-0">{initials(item.actor)}</div>}
                  <div className="min-w-0">
                    <h3 className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white truncate group-hover:underline decoration-[#ffd716] decoration-2 underline-offset-2">{item.title}</h3>
                    {item.body && <p className="text-[12px] text-[#6b6b6b] dark:text-white/55 truncate">{item.body}</p>}
                    {item.actor && <p className="text-[11px] text-[#9a9a9a] truncate mt-0.5">by {item.actor}</p>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function cnWrap(tint: string) {
  return `relative z-10 w-10 h-10 rounded-full ${tint} flex items-center justify-center flex-shrink-0 ring-4 ring-white dark:ring-[#161616]`;
}
