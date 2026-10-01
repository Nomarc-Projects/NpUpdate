"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Marquee geometry shared by the public ticker and the admin preview.
 *
 * Both derive their animation duration from a pixel rate rather than a fixed
 * number of seconds. When each side computed its own, the preview (2x repeat) and
 * the live strip (12x repeat) covered different distances in the same time, so
 * the control in the admin could not predict what visitors would see. The
 * duration maths lives here, once, and the repeat count is shared, so a change to
 * one cannot silently desync the other.
 */

/** Item-set repetitions used to cover a very wide screen. The keyframe
 *  translates -50%, so the rendered track is the item set repeated twice this
 *  many times and the two halves stay identical for a seamless loop. */
export const NM_MARQUEE_REPEATS = 6;

/** Build the track: the item set repeated wide enough, then doubled for the loop. */
export function marqueeLoop<T>(items: T[]): T[] {
  const repeated = Array.from({ length: NM_MARQUEE_REPEATS }).flatMap(() => items);
  return [...repeated, ...repeated];
}

/**
 * Seconds for one loop at `pxPerSecond`, or null until the track has been
 * measured. Callers should not start the animation before then, or the first
 * painted frame runs at a guessed speed.
 *
 * Re-measures on content change, viewport resize and after webfonts settle —
 * fonts land after first paint and change the track width, which would otherwise
 * leave the strip drifting at the wrong rate.
 *
 * Returns the ref to put on the animated track along with the duration, since
 * measuring and animating are the same concern.
 */
export function useMarqueeDuration(
  pxPerSecond: number,
  contentKey: string | number,
): { trackRef: RefObject<HTMLDivElement | null>; duration: number | null } {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth;
      // The keyframe moves the track by -50%, so one loop covers half its width.
      if (width > 0) setDuration(width / 2 / pxPerSecond);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const afterFonts = setTimeout(measure, 400);
    return () => {
      ro.disconnect();
      clearTimeout(afterFonts);
    };
  }, [pxPerSecond, contentKey]);

  return { trackRef, duration };
}
