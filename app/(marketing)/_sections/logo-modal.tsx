"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import type { Logo } from "./logo-marquee";

function domainOf(href?: string) {
  if (!href) return null;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Company spotlight — opens when a homepage marquee logo is tapped, so
 * visitors see the company without leaving the site. Bottom sheet on mobile,
 * centered card on desktop.
 */
function CompanyModal({ logo, badge, onClose }: { logo: Logo; badge: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const domain = domainOf(logo.href);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={logo.name}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="relative w-full sm:max-w-[380px] rounded-t-[24px] sm:rounded-[24px] bg-white dark:bg-[#1e1e1e] shadow-2xl max-h-[88vh] overflow-y-auto"
      >
        <div className="px-5 pt-3 pb-6 sm:p-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e3e3e3] dark:bg-white/15 sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center rounded-full bg-[#ffd716]/20 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#8a7400] dark:text-[#ffd716]">
              {badge}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#9a9a9a] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.src} alt={logo.name} className="max-h-full w-auto object-contain" />
          </div>

          <h3 className="mt-4 text-[17px] font-bold leading-snug text-[#1e1e1e] dark:text-white">{logo.name}</h3>
          {domain && <p className="mt-1 text-[13px] text-[#9a9a9a]">{domain}</p>}

          <div className="mt-5 flex flex-col gap-2">
            {logo.href && (
              <a
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#ffd716] px-4 py-3 text-[14px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
              >
                Visit website <ExternalLink size={15} />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-[#e3e3e3] px-4 py-3 text-[14px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#f7f7f7] dark:border-white/15 dark:text-white dark:hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Homepage logo marquee with tap-to-preview. Looks exactly like the default
 * marquee; every logo opens the company spotlight modal instead of
 * navigating away. Draggable left/right (mouse drag on desktop, swipe on
 * mobile) with a gentle auto-scroll that pauses while interacting.
 */
export function LogoMarqueeWithModal({ logos, badge }: { logos: Logo[]; badge: string }) {
  const [selected, setSelected] = useState<Logo | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [translate, setTranslate] = useState(0);
  const [paused, setPaused] = useState(false);
  // `active` marks a gesture in progress, `startX`/`startOffset` seed it, and
  // `didDrag` records that it moved far enough to count as a drag. It is a ref
  // rather than state on purpose: the click that follows pointerup arrives after
  // the offset has been folded away, so reading state in onClickCapture saw
  // "not dragging" and let a swipe open the modal.
  const drag = useRef({ active: false, startX: 0, startOffset: 0, didDrag: false });

  // Where the user dragged to, folded back into one group width. The four
  // groups are identical, so an offset that is a multiple of the group width
  // looks identical to zero — folding means repeated swipes cannot walk the
  // strip arbitrarily far off, and the resume never jumps.
  const settle = () => {
    const el = trackRef.current;
    if (!el) return;
    const group = el.offsetWidth / 4;
    if (group > 0) {
      setTranslate(((translate % group) + group) % group);
    }
  };

  const plate =
    "flex-shrink-0 flex items-center justify-center rounded-2xl px-5 sm:px-7 h-16 sm:h-20 opacity-80 transition-opacity bg-transparent ring-0 shadow-none dark:bg-white dark:ring-1 dark:ring-white/10 dark:shadow-sm cursor-pointer hover:opacity-100 hover:ring-2 hover:ring-[#ffd716] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd716]";

  const groups = [0, 1, 2, 3].map((k) => (
    <div key={k} aria-hidden={k !== 0} className="flex items-center gap-5 sm:gap-7 pr-5 sm:pr-7 shrink-0">
      {logos.map((p) => (
        <button
          key={p.name}
          type="button"
          onClick={() => setSelected(p)}
          title={`${p.name} — view company`}
          tabIndex={k !== 0 ? -1 : undefined}
          className={plate}
        >
          <img src={p.src} alt={p.name} className="h-7 sm:h-9 w-auto object-contain" draggable={false} />
        </button>
      ))}
    </div>
  ));

  return (
    <>
      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-r from-white dark:from-[#111] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-l from-white dark:from-[#111] to-transparent z-10 pointer-events-none" />
        {/* Auto-scroll is a pure CSS animation on the track (nm-marquee-4 shifts
            it -25%, one group width, over 48s), so it runs on the compositor with
            no JavaScript per frame. Interaction works by pausing the animation and
            scrubbing a translateX offset on a wrapper below the track. touch-action
            pan-y lets a vertical page scroll pass through while a horizontal drag
            scrubs the strip. */}
        <div
          className={`flex items-center overflow-hidden select-none ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ touchAction: "pan-y" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            // Deliberately no setPointerCapture here. Capturing on pointerdown
            // retargets the following click to this container, so the logo
            // button underneath never saw it and tapping a logo did nothing —
            // which is the whole point of the strip. Capture is taken on the
            // first move that actually clears the drag threshold instead, so a
            // plain tap is never captured and its click still lands on the logo.
            drag.current = { active: true, startX: e.clientX, startOffset: translate, didDrag: false };
            setDragging(true);
            setPaused(true);
          }}
          onPointerMove={(e) => {
            if (!drag.current.active) return;
            const dx = e.clientX - drag.current.startX;
            if (Math.abs(dx) > 6 && !drag.current.didDrag) {
              drag.current.didDrag = true;
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            }
            if (drag.current.didDrag) setTranslate(drag.current.startOffset + dx);
          }}
          onPointerUp={() => {
            // didDrag deliberately survives into the click that follows.
            drag.current.active = false;
            settle();
            setDragging(false);
            // Resume after a beat so a flick reads as a scroll that settles,
            // rather than snapping back to where the finger went down.
            window.setTimeout(() => setPaused(false), 900);
          }}
          onPointerCancel={() => {
            drag.current.didDrag = false;
            setDragging(false);
            setTranslate(0);
          }}
          onClickCapture={(e) => {
            // A drag that ended over a logo must not open the modal.
            if (drag.current.didDrag) {
              drag.current.didDrag = false;
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* Drag offset lives on its own wrapper, below the animated track. A
              running CSS animation wins over an inline transform on the same
              element, so scrubbing has to move a different element than the one
              carrying the keyframes. */}
          <div
            style={{
              transform: translate !== 0 ? `translateX(${translate}px)` : undefined,
              transition: dragging ? "none" : "transform 220ms ease-out",
            }}
          >
            <div
              ref={trackRef}
              className="flex w-max items-center nm-marquee-4-track"
              style={{ animationPlayState: dragging || paused ? "paused" : "running" }}
            >
              {/* Four identical groups; nm-marquee-4 shifts the track by -25%, which
                  is exactly one group's width, so group four lands where group one
                  began and the loop is seamless with no gap. */}
              {groups}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && <CompanyModal logo={selected} badge={badge} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}
