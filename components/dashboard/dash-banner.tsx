"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Reusable page banner for all dashboard pages.
 * overlap=true adds tall bottom padding so the first row of stat cards
 * can overlap the banner edge (use -mt-20 sm:-mt-[88px] px-3 sm:px-[10%] on the grid).
 */
export function DashBanner({
  children,
  image,
  overlap = false,
}: {
  children: ReactNode;
  image: string;
  overlap?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
      className={[
        "rounded-2xl bg-[#1e1e1e] dark:bg-[#ffd716] pt-7 sm:pt-9 px-5 sm:px-8 overflow-hidden relative",
        overlap ? "pb-24 sm:pb-28" : "pb-7 sm:pb-9",
      ].join(" ")}
    >
      {/* overlay photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.07] dark:opacity-[0.05] pointer-events-none select-none"
      />
      {/* dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.055) 1px,transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />
      {/* decorative glow circles */}
      <div className="pointer-events-none absolute -right-8 -top-8 w-56 h-56 rounded-full bg-white/[0.04] dark:bg-black/[0.07]" />
      <div className="pointer-events-none absolute right-20 -bottom-12 w-36 h-36 rounded-full bg-white/[0.03] dark:bg-black/[0.05]" />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/** Button styles inside a DashBanner (dark bg in light / yellow bg in dark) */
export const bannerBtn =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all bg-white/10 dark:bg-black/10 text-white dark:text-[#1e1e1e] hover:bg-white/20 dark:hover:bg-black/20";

export const bannerPrimaryBtn =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-white shadow-sm hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] active:scale-[0.97]";

/** Standard banner header row — eyebrow + heading + subtitle + optional actions */
export function BannerContent({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 dark:text-[#1e1e1e]/50 mb-1">
          {eyebrow}
        </p>
        <h1 className="text-[22px] sm:text-[26px] font-black text-white dark:text-[#1e1e1e] leading-tight">
          {title}
        </h1>
        <p className="text-[13px] text-white/50 dark:text-[#1e1e1e]/60 mt-1.5 max-w-md">
          {subtitle}
        </p>
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">{actions}</div>
      )}
    </div>
  );
}
