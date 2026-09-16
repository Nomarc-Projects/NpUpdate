"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

/** Animated count-up/down number (magicui). Animates when scrolled into view.
 *  `prefix`/`suffix` let stat cards show e.g. ₦ amounts. */
export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : startValue);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 120 });
  const isInView = useInView(ref, { once: true, margin: "0px" });
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!isInView) return;
    if (reduced) { motionValue.jump?.(direction === "down" ? startValue : value); motionValue.set(direction === "down" ? startValue : value); return; }
    const t = setTimeout(() => motionValue.set(direction === "down" ? startValue : value), delay * 1000);
    return () => clearTimeout(t);
  }, [motionValue, isInView, delay, value, direction, startValue, reduced]);

  useEffect(() =>
    springValue.on("change", (latest) => {
      if (ref.current) {
        const n = Intl.NumberFormat("en-US", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(Number(latest.toFixed(decimalPlaces)));
        ref.current.textContent = `${prefix}${n}${suffix}`;
      }
    }), [springValue, decimalPlaces, prefix, suffix]);

  return <span ref={ref} className={cn("inline-block tabular-nums", className)}>{`${prefix}${startValue}${suffix}`}</span>;
}
