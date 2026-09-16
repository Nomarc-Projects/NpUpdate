"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Clock3, MousePointerClick } from "lucide-react";
import type { TooltipRenderProps } from "react-joyride";
import { TourIcon } from "./tour-icon";
import type { TourStepMeta } from "./tour-meta";

/**
 * The tour's tooltip — replaces joyride's default so every stop can carry an
 * animated icon, a progress rail, an encouragement line and (on interactive
 * steps) a "do this" prompt.
 *
 * Sizing is `min(92vw, 22rem)` so it never overflows a phone; joyride's floater
 * is `display:inline-block; max-width:100%`, so the tooltip's own width wins.
 * All motion is skipped under `prefers-reduced-motion`.
 *
 * Colours follow the dashboard card language: white / `#1e1e1e` surfaces,
 * `#ececec` / `white/10` hairlines, and Nomarc yellow for the progress rail and
 * primary button — with **ink** label text, since white on `#ffd716` is illegible.
 */
export function TourTooltip({
  index,
  size,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) {
  const reduced = useReducedMotion();
  const meta = (step.data ?? {}) as Partial<TourStepMeta>;
  const pct = size > 0 ? Math.round(((index + 1) / size) * 100) : 0;

  return (
    <div
      {...tooltipProps}
      className="w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-[#ececec] bg-white text-left shadow-[0_20px_60px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
    >
      {/* Progress rail — doubles as the "how far in am I" cue. */}
      <div className="h-1 w-full bg-[#f0f0f0] dark:bg-white/10">
        <motion.div
          className="h-full rounded-r-full bg-[#ffd716]"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <TourIcon name={meta.icon} />
          <div className="min-w-0 flex-1">
            {step.title ? (
              <p className="text-sm font-bold leading-snug text-[#1e1e1e] dark:text-white">
                {step.title}
              </p>
            ) : null}
            <p className="mt-0.5 text-[11px] font-medium tabular-nums text-[#9a9a9a]">
              {meta.page ? `${meta.page} · ` : ""}Step {index + 1} of {size}
            </p>
          </div>
        </div>

        {meta.showEstimate && meta.estimateMinutes && meta.totalStops ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fff7cc] px-2.5 py-1 text-[11px] font-semibold text-[#8a6d00] dark:bg-[#ffd716]/10 dark:text-[#ffd716]">
            <Clock3 className="size-3" aria-hidden />~{meta.estimateMinutes} min · {meta.totalStops}{" "}
            stops
          </p>
        ) : null}

        <div className="mt-2.5 text-[13.5px] leading-relaxed text-[#3d3d3d] dark:text-white/70">
          {step.content}
        </div>

        {meta.interactHint ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#ffd716]/50 bg-[#ffd716]/[0.12] px-3 py-2.5 dark:bg-[#ffd716]/[0.08]">
            <span className="relative grid size-6 shrink-0 place-items-center rounded-full bg-[#ffd716] text-[#1e1e1e]">
              {!reduced && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[#ffd716]"
                  animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <MousePointerClick className="relative size-3.5" aria-hidden />
            </span>
            <p className="text-xs font-semibold text-[#1e1e1e] dark:text-white">
              {meta.interactHint}
            </p>
          </div>
        ) : null}

        {meta.encouragement ? (
          <p className="mt-3 text-[11px] font-medium text-[#9a9a9a]">{meta.encouragement}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            {...skipProps}
            className="rounded-full px-2 py-1.5 text-xs font-medium text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-1.5">
            {index > 0 && (
              <button
                {...backProps}
                className="rounded-full px-3 py-2 text-xs font-semibold text-[#3d3d3d] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              >
                Back
              </button>
            )}
            <button
              {...primaryProps}
              className="rounded-full bg-[#ffd716] px-4 py-2 text-xs font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
            >
              {isLastStep ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
