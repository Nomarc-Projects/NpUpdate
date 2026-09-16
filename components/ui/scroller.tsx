"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Shared horizontal scroller ─────────────────────────────────────────── */
/** Tracks whether a horizontally-scrollable strip can still scroll either way,
 *  so prev/next arrows can be hidden when there's nothing to scroll to.
 *  Used by the category slider, every product rail and the promoted ad row. */
export function useScroller() {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", measure); ro.disconnect(); };
  }, [measure]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  }, []);

  return { ref, canLeft, canRight, scrollBy, measure };
}

/**
 * Advances a snap-scrolling strip on its own, one card at a time, wrapping back
 * to the start at the end. Layered on top of the strip's normal scrolling —
 * dragging still works, and a drag pauses the rotation for a full interval so
 * the row is never yanked out from under whoever is reading it.
 *
 * No-ops when there is nothing to scroll (the same markup is a plain grid at
 * wider breakpoints), while the tab is hidden, and under reduced-motion.
 */
export function useAutoAdvance(
  ref: React.RefObject<HTMLDivElement | null>,
  intervalMs: number,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pausedUntil = 0;
    const hold = () => { pausedUntil = Date.now() + intervalMs; };

    /** scrollLeft that would bring the next card flush to the strip's gutter */
    function nextOffset() {
      const pad = parseFloat(getComputedStyle(el!).paddingLeft) || 0;
      const originLeft = el!.getBoundingClientRect().left - el!.scrollLeft + pad;
      for (const child of Array.from(el!.children)) {
        const offset = child.getBoundingClientRect().left - originLeft;
        if (offset > el!.scrollLeft + 4) return offset;
      }
      return null;
    }

    const id = setInterval(() => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4 || document.hidden || Date.now() < pausedUntil) return;
      const next = nextOffset();
      el.scrollTo({ left: next ?? 0, behavior: "smooth" });
    }, intervalMs);

    el.addEventListener("pointerdown", hold, { passive: true });
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("touchend", hold, { passive: true });
    return () => {
      clearInterval(id);
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchend", hold);
    };
  }, [ref, intervalMs]);
}

/** Circular prev/next control used by the category slider, product rails and
 *  the promoted ad row. Sized down on mobile, where it floats over the card
 *  row itself rather than in the gutter beside it. */
export function ScrollArrow({
  dir,
  onClick,
  show,
  className,
}: {
  dir: "left" | "right";
  onClick: () => void;
  show: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Scroll left" : "Scroll right"}
      tabIndex={show ? 0 : -1}
      className={cn(
        "w-8 h-8 md:w-9 md:h-9 rounded-full border border-[#e8e8e8] dark:border-white/12 shadow-sm",
        "bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-sm",
        "flex items-center justify-center text-[#1e1e1e] dark:text-white",
        "transition-all duration-200 hover:bg-[#ffd716] hover:border-[#ffd716] hover:text-[#1e1e1e]",
        show ? "opacity-100" : "opacity-0 pointer-events-none",
        className,
      )}
    >
      {dir === "left" ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
    </button>
  );
}
