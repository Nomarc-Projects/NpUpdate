"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Compass, Sparkles, MousePointerClick } from "lucide-react";
import { useTour } from "./tour-provider";
import { prefersReducedMotion } from "./wait-for-target";
import { cn } from "@/lib/utils";

const OPENED_KEY = "nomarc:tour:launcher-opened";

/**
 * Round "?" help button for the dashboard top bar. It does a gentle idle wiggle
 * every few seconds to hint that a guided tour is available — paused on hover,
 * once the user has opened it, and when reduced-motion is requested. Clicking
 * opens a small popover with the tours available for the current page.
 */
export function TourLauncher() {
  const { startPageTour, startWalkthrough, startWelcome, hasPageTour, hasWalkthrough, hasWelcome, audience } = useTour();

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [opened, setOpened] = useState(true); // assume opened until we read storage (no wiggle during SSR/hydration)
  const [reduced, setReduced] = useState(true);
  const [canPage, setCanPage] = useState(false);
  const [canFull, setCanFull] = useState(false);
  const [canWelcome, setCanWelcome] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fullLabel = audience === "admin" || audience === "super_admin" ? "Platform walkthrough" : "Take the full tour";

  useEffect(() => {
    setReduced(prefersReducedMotion());
    try {
      setOpened(localStorage.getItem(OPENED_KEY) === "1");
    } catch {
      setOpened(true);
    }
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function markOpened() {
    setOpened(true);
    try {
      localStorage.setItem(OPENED_KEY, "1");
    } catch {}
  }

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next) {
        markOpened();
        setCanPage(hasPageTour());
        setCanFull(hasWalkthrough());
        setCanWelcome(hasWelcome());
      }
      return next;
    });
  }

  function run(fn: () => void) {
    setOpen(false);
    fn();
  }

  const wiggling = !reduced && !opened && !hovered && !open;

  return (
    <div className="relative" ref={ref}>
      <motion.button
        type="button"
        aria-label="Guided tours"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tour="tour-launcher"
        onClick={toggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="grid size-8 place-items-center rounded-lg text-[#9a9a9a] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:hover:bg-white/5 dark:hover:text-white"
        animate={
          wiggling
            ? { rotate: [0, -12, 11, -7, 6, 0], scale: [1, 1.09, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={
          wiggling
            ? { duration: 0.85, repeat: Infinity, repeatDelay: 8.2, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        <HelpCircle className="size-4" />
      </motion.button>

      {open && (
        <div
          role="menu"
          // On phones the top bar is hidden (mobile has its own header), so this
          // is a desktop-first control; pin the menu under the bar just in case.
          className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-[#ececec] bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-64"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">Guided tours</p>
            <p className="mt-0.5 text-xs text-[#9a9a9a]">Take a quick, friendly walk-through.</p>
          </div>
          <div className="my-1 h-px bg-[#ececec] dark:bg-white/10" />

          <button
            type="button"
            role="menuitem"
            disabled={!canPage}
            onClick={() => run(startPageTour)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              canPage
                ? "text-[#1e1e1e] hover:bg-[#f5f5f5] dark:text-white dark:hover:bg-white/5"
                : "cursor-not-allowed text-[#9a9a9a] opacity-60",
            )}
          >
            <MousePointerClick className="size-4 text-[#9a9a9a]" />
            Tour this page
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={!canFull}
            onClick={() => run(startWalkthrough)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              canFull
                ? "text-[#1e1e1e] hover:bg-[#f5f5f5] dark:text-white dark:hover:bg-white/5"
                : "cursor-not-allowed text-[#9a9a9a] opacity-60",
            )}
          >
            <Compass className="size-4 text-[#9a9a9a]" />
            {fullLabel}
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={!canWelcome}
            onClick={() => run(startWelcome)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              canWelcome
                ? "text-[#1e1e1e] hover:bg-[#f5f5f5] dark:text-white dark:hover:bg-white/5"
                : "cursor-not-allowed text-[#9a9a9a] opacity-60",
            )}
          >
            <Sparkles className="size-4 text-[#9a9a9a]" />
            Replay welcome
          </button>
        </div>
      )}
    </div>
  );
}
