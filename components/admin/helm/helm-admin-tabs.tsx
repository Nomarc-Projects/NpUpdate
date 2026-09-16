"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Library, SlidersHorizontal, MessageSquareWarning, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { label: string; href: string; icon: LucideIcon; count?: number };

/**
 * Sub-nav for the Helm console — the four surfaces of `/admin/helm`.
 * Mirrors the settings sub-nav pattern: a pill rail with an animated active
 * indicator, scrollable on mobile so no tab is ever unreachable.
 */
export function HelmAdminTabs({ reviewCount = 0 }: { reviewCount?: number }) {
  const pathname = usePathname();
  const tabs: Tab[] = [
    { label: "Overview", href: "/admin/helm", icon: BarChart3 },
    { label: "Knowledge base", href: "/admin/helm/knowledge", icon: Library },
    { label: "Quotas & tiers", href: "/admin/helm/quotas", icon: SlidersHorizontal },
    { label: "Answer review", href: "/admin/helm/review", icon: MessageSquareWarning, count: reviewCount },
  ];

  return (
    <div className="mt-5 -mx-5 sm:mx-0 px-5 sm:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex items-center gap-1 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-1.5 min-w-max">
        {tabs.map((t) => {
          const active = t.href === "/admin/helm" ? pathname === t.href : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-colors whitespace-nowrap",
                active
                  ? "text-[#1e1e1e] dark:text-white"
                  : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white",
              )}
            >
              {active && (
                <motion.span
                  layoutId="helm-tab-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-[#fff7cc] dark:bg-white/[0.08]"
                />
              )}
              <Icon size={15} className={cn("relative z-10 flex-shrink-0", active && "text-[#b89500] dark:text-[#ffd716]")} />
              <span className="relative z-10">{t.label}</span>
              {!!t.count && t.count > 0 && (
                <span className="relative z-10 rounded-full bg-[#ef4444] px-1.5 py-px text-[10px] font-bold text-white tabular-nums">
                  {t.count > 99 ? "99+" : t.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
