"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export type Logo = {
  name: string;
  src: string;
  /** Where the mark links to. Omit for a non-clickable plate. */
  href?: string;
};

/** "Trusted Clients" strip, last section before the footer. */
export const partners: Logo[] = [
  { name: "FSB Real Estate", src: "/logos/partners/fsb-real-estate.png" },
  { name: "Punuka", src: "/logos/partners/punuka.png" },
  { name: "Sheraton", src: "/logos/partners/sheraton.png" },
  { name: "Lagos State Government", src: "/logos/partners/lagos-state.png" },
  { name: "DanBran Projects", src: "/logos/partners/danbran.png" },
];

/**
 * One marquee group. The logos are full-colour artwork on transparency, so in
 * dark mode they sit on a light plate (rather than being inverted, which would
 * wreck multi-colour marks like the Lagos State seal).
 */
export function LogoGroup({ logos, ariaHidden }: { logos: Logo[]; ariaHidden?: boolean }) {
  // pr-* matches the inter-item gap so two groups concatenate with a uniform
  // rhythm — that makes the -50% loop perfectly seamless (no dead space).
  const plate =
    "flex-shrink-0 flex items-center justify-center rounded-2xl px-5 sm:px-7 h-16 sm:h-20 opacity-80 transition-opacity bg-transparent ring-0 shadow-none dark:bg-white dark:ring-1 dark:ring-white/10 dark:shadow-sm";

  return (
    <div aria-hidden={ariaHidden} className="flex items-center gap-5 sm:gap-7 pr-5 sm:pr-7 shrink-0">
      {logos.map((p) => {
        const img = (
          <Image src={p.src} alt={p.name} width={320} height={96} draggable={false} className="h-7 sm:h-9 w-auto object-contain" />
        );
        if (!p.href) {
          return <div key={p.name} title={p.name} className={`${plate} hover:opacity-100`}>{img}</div>;
        }
        return (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${p.name} — opens in a new tab`}
            // The marquee renders this group four times to loop seamlessly. Only
            // the first is real; the duplicates are aria-hidden, so they are also
            // taken out of the tab order — otherwise keyboard users would tab
            // through every logo four times to get past the strip.
            tabIndex={ariaHidden ? -1 : undefined}
            className={`${plate} cursor-pointer hover:opacity-100 hover:ring-2 hover:ring-[#ffd716] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd716]`}
          >
            {img}
          </a>
        );
      })}
    </div>
  );
}

/** How long one full pattern pass takes. Matches the old 48s keyframe. */
const LOOP_SECONDS = 48;

/**
 * JS-driven iteration of the marquee track. Kept out of LogoMarquee's happy path
 * (which still uses the pure-CSS keyframe) so the partners strip below the
 * footer stays exactly as it is; the Key Players strip opts in via `interactive`.
 *
 * Behavior: autoplays left-to-repeating; pauses on hover; a pointer drag scrubs
 * the track to either side and resumes scrolling on release. The track is four
 * copies of the logo set, so wrapping the offset by half its width is seamless.
 * Reduced-motion users get a static (still draggable) strip.
 */
function DraggableTrack({ groups }: { groups: React.ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const pattern = useRef(0);
  const paused = useRef(false);
  const dragging = useRef(false);
  const dragBase = useRef(0);
  const dragStartX = useRef(0);
  const reduced = useRef(false);
  const raf = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);

  const apply = () => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${-offset.current}px,0,0)`;
  };

  /** Half the track = exactly one logo set, the seamless wrap point. */
  const getPattern = () => {
    if (!pattern.current && trackRef.current) pattern.current = trackRef.current.scrollWidth / 2;
    return pattern.current || 1;
  };

  const loop = (ts: number) => {
    raf.current = requestAnimationFrame(loop);
    if (lastTs.current == null) lastTs.current = ts;
    const dt = ts - lastTs.current;
    lastTs.current = ts;
    if (dragging.current || paused.current || reduced.current) return;
    const p = getPattern();
    offset.current = (offset.current + (p / (LOOP_SECONDS * 1000)) * dt) % p;
    apply();
  };

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced.current) raf.current = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => {
      // Logos/images may load or reflow — re-measure the loop point.
      pattern.current = 0;
    });
    if (trackRef.current) ro.observe(trackRef.current);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative cursor-grab active:cursor-grabbing select-none touch-pan-y"
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") e.preventDefault();
        dragging.current = true;
        dragStartX.current = e.clientX;
        dragBase.current = offset.current;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const p = getPattern();
        const next = (dragBase.current + (e.clientX - dragStartX.current)) % p;
        offset.current = next < 0 ? next + p : next;
        apply();
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
    >
      <div ref={trackRef} className="flex items-center w-max" style={{ transform: "translate3d(0,0,0)" }}>
        {groups}
      </div>
    </div>
  );
}

/** Seamless auto-scrolling marquee shared by the partners strip. */
export function LogoMarquee({ logos, interactive = false }: { logos: Logo[]; interactive?: boolean }) {
  const groups = [
    <LogoGroup key="a" logos={logos} />,
    <LogoGroup key="b" logos={logos} ariaHidden />,
    <LogoGroup key="c" logos={logos} ariaHidden />,
    <LogoGroup key="d" logos={logos} ariaHidden />,
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-r from-white dark:from-[#111] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-l from-white dark:from-[#111] to-transparent z-10 pointer-events-none" />
      {interactive ? (
        <DraggableTrack groups={groups} />
      ) : (
        <div className="flex items-center w-max animate-[nm-marquee-4_48s_linear_infinite]">{groups}</div>
      )}
    </div>
  );
}