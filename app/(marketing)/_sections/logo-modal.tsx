"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0 });
  const hovering = useRef(false);
  const justDragged = useRef(false);
  const lastInteract = useRef(0);

  // The four groups are identical — keep the scroll position inside the
  // middle window so the loop is seamless in both directions.
  const wrap = () => {
    const el = viewportRef.current;
    if (!el || el.scrollWidth === 0) return;
    const group = el.scrollWidth / 4;
    if (el.scrollLeft >= group * 3) {
      el.scrollLeft -= group;
      drag.current.startScroll -= group;
    } else if (el.scrollLeft < group) {
      el.scrollLeft += group;
      drag.current.startScroll += group;
    }
  };

  // Start mid-loop so both drag directions work immediately.
  useEffect(() => {
    const el = viewportRef.current;
    if (el && el.scrollWidth > 0) el.scrollLeft = el.scrollWidth / 2;
  }, [logos]);

  // Gentle auto-scroll (same pace as the old CSS loop), paused while the
  // user hovers, drags, or recently interacted.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const el = viewportRef.current;
      if (!el || el.scrollWidth === 0) {
        prev = now;
        return;
      }
      const dt = Math.min((now - prev) / 1000, 0.1);
      prev = now;
      if (!hovering.current && !drag.current.active && now - lastInteract.current > 2500) {
        el.scrollLeft += ((el.scrollWidth / 4) / 48) * dt;
        wrap();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
          <Image src={p.src} alt={p.name} width={320} height={96} draggable={false} className="h-7 sm:h-9 w-auto object-contain" />
        </button>
      ))}
    </div>
  ));

  return (
    <>
      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-r from-white dark:from-[#111] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-l from-white dark:from-[#111] to-transparent z-10 pointer-events-none" />
        <div
          ref={viewportRef}
          onMouseEnter={() => {
            hovering.current = true;
          }}
          onMouseLeave={() => {
            hovering.current = false;
          }}
          onPointerDown={(e) => {
            // Touch uses native swipe scrolling; manual drag is for mouse.
            if (e.pointerType !== "mouse") return;
            const el = viewportRef.current;
            if (!el) return;
            drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft };
            justDragged.current = false;
            el.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current.active || e.pointerType !== "mouse") return;
            const el = viewportRef.current;
            if (!el) return;
            const dx = e.clientX - drag.current.startX;
            if (Math.abs(dx) > 6) justDragged.current = true;
            el.scrollLeft = drag.current.startScroll - dx;
            wrap();
            lastInteract.current = performance.now();
          }}
          onPointerUp={() => {
            drag.current.active = false;
            lastInteract.current = performance.now();
          }}
          onPointerCancel={() => {
            drag.current.active = false;
            lastInteract.current = performance.now();
          }}
          onClickCapture={(e) => {
            // A drag ending over a logo must not open the modal.
            if (justDragged.current) {
              justDragged.current = false;
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDragStart={(e) => e.preventDefault()}
          className="flex w-max items-center overflow-x-auto no-scrollbar overscroll-x-contain cursor-grab select-none active:cursor-grabbing"
        >
          {groups}
        </div>
      </div>

      <AnimatePresence>
        {selected && <CompanyModal logo={selected} badge={badge} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}
