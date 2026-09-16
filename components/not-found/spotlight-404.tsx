"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { NomarcMark } from "@/components/ui/nomarc-mark";

/* ── Construction / Nomarc glyphs (line-art "blueprint" style) ───────────── */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Crane(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><path d="M10 44V8M10 8h26M10 8 4 16M36 8l-9 5M27 13v6M27 19h-6M27 19h6M21 19v4M33 19v8M10 14h6" /><circle cx="33" cy="29" r="2.2" /></g>
    </svg>
  );
}
function Building(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><path d="M14 44V12l10-6 10 6v32M8 44h32M19 16h2M27 16h2M19 22h2M27 22h2M19 28h2M27 28h2M22 44v-8h4v8" /></g>
    </svg>
  );
}
function HardHat(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><path d="M6 34a18 9 0 0 0 36 0M12 33V22a12 12 0 0 1 24 0v11M24 10v8M18 11l1 8M30 11l-1 8" /></g>
    </svg>
  );
}
function Wrench(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><path d="M30 8a8 8 0 0 0-9.8 11.2L8 31.5a3.5 3.5 0 0 0 5 5l12.3-12.3A8 8 0 0 0 36 14l-5 5-5-1-1-5 5-5Z" /></g>
    </svg>
  );
}
function Triangle(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><path d="M8 38 38 8v30H8ZM8 38l8-8M14 38v-6h6" /></g>
    </svg>
  );
}
function Bricks(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><rect x="6" y="12" width="36" height="24" rx="1" /><path d="M6 20h36M6 28h36M18 12v8M30 12v8M12 20v8M24 20v8M36 20v8M18 28v8M30 28v8" /></g>
    </svg>
  );
}
function Cone(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><path d="M24 8 34 38H14L24 8ZM10 42h28M19 22h10M17 30h14" /></g>
    </svg>
  );
}
function Gear(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><circle cx="24" cy="24" r="6" /><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4" /></g>
    </svg>
  );
}
function Ruler(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><rect x="6" y="18" width="36" height="12" rx="1" transform="rotate(-20 24 24)" /><path d="M14 19v3M19 17v4M24 15v3M29 13v4M34 11v3" /></g>
    </svg>
  );
}
function Trowel(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><path d="M28 8 40 20 24 34 8 24 28 8ZM34 14l6-6M40 8l-2-2" /></g>
    </svg>
  );
}
function Blueprint(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><rect x="8" y="10" width="32" height="28" rx="2" /><path d="M14 16h12v10H14zM30 16h4M30 21h4M14 31h20" /></g>
    </svg>
  );
}
function Excavator(p: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={p.className}>
      <g {...S}><path d="M6 38h22M8 38a3 3 0 1 0 6 0M20 38a3 3 0 1 0 6 0M10 34h12v-6h-8l-2 6M22 28V22M22 22l10-8M32 14l6 4M38 18l-2 7" /></g>
    </svg>
  );
}

type Glyph = { C: (p: { className?: string }) => React.ReactElement; x: string; y: string; size: number; accent?: boolean; rot?: number };
const GLYPHS: Glyph[] = [
  { C: Crane, x: "6%", y: "16%", size: 92, accent: true, rot: -4 },
  { C: Building, x: "84%", y: "12%", size: 88 },
  { C: HardHat, x: "78%", y: "70%", size: 78, accent: true, rot: 6 },
  { C: Wrench, x: "12%", y: "72%", size: 70, rot: -12 },
  { C: Triangle, x: "30%", y: "82%", size: 60 },
  { C: Bricks, x: "90%", y: "44%", size: 72 },
  { C: Cone, x: "20%", y: "40%", size: 64, accent: true },
  { C: Gear, x: "66%", y: "84%", size: 58, rot: 8 },
  { C: Ruler, x: "50%", y: "10%", size: 70 },
  { C: Trowel, x: "70%", y: "30%", size: 60 },
  { C: Blueprint, x: "4%", y: "46%", size: 74 },
  { C: Excavator, x: "44%", y: "88%", size: 84, accent: true },
];

function Heading({ ghost }: { ghost?: boolean }) {
  // ghost layer = the "hidden" reveal copy (solid + accent); base = faint outline
  const h1Style = ghost
    ? undefined
    : ({ WebkitTextStroke: "1.5px currentColor", color: "transparent" } as React.CSSProperties);
  return (
    <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
      <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${ghost ? "text-[#ffd716]" : "text-[#bdbdbd] dark:text-white/25"}`}>
        Error 404
      </p>
      <h1
        style={h1Style}
        className={`mt-4 font-extrabold leading-[0.92] tracking-tight text-[clamp(2.75rem,11vw,8rem)] ${
          ghost ? "text-[#1e1e1e] dark:text-white" : "text-[#d4d4d4] dark:text-white/12"
        }`}
      >
        Page not <span className={ghost ? "text-[#ffd716]" : ""}>found</span>
      </h1>
      <p className={`mx-auto mt-6 max-w-md text-[15px] leading-relaxed ${ghost ? "opacity-0 select-none" : "text-[#6b6b6b] dark:text-white/55"}`}>
        Looks like this blueprint never got built. The page you&apos;re looking for doesn&apos;t exist — but here&apos;s where to go next.
      </p>
      <div className={`mt-8 flex flex-wrap items-center justify-center gap-3 ${ghost ? "opacity-0 pointer-events-none select-none" : ""}`}>
        <Link href="/" className="rounded-full bg-[#ffd716] px-6 py-3 text-sm font-semibold text-[#1e1e1e] transition-transform hover:-translate-y-0.5 hover:shadow-lg">
          Back home
        </Link>
        <Link href="/tools" className="rounded-full border border-[#e3e3e3] px-6 py-3 text-sm font-semibold text-[#1e1e1e] transition-colors hover:border-[#1e1e1e] dark:border-white/15 dark:text-white dark:hover:border-white">
          Explore tools
        </Link>
        <Link href="/contact" className="rounded-full border border-[#e3e3e3] px-6 py-3 text-sm font-semibold text-[#1e1e1e] transition-colors hover:border-[#1e1e1e] dark:border-white/15 dark:text-white dark:hover:border-white">
          Contact us
        </Link>
      </div>
    </div>
  );
}

export function Spotlight404() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const overlay = overlayRef.current;
    const ring = ringRef.current;
    if (!section || !overlay || !ring) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.4;
    const R = 135;

    const paint = () => {
      const rect = section.getBoundingClientRect();
      const lx = x - rect.left;
      const ly = y - rect.top;
      overlay.style.setProperty("--x", `${lx}px`);
      overlay.style.setProperty("--y", `${ly}px`);
      ring.style.transform = `translate(${lx - R}px, ${ly - R}px)`;
      raf.current = null;
    };
    const schedule = () => { if (raf.current == null) raf.current = requestAnimationFrame(paint); };

    const onMove = (e: PointerEvent) => { x = e.clientX; y = e.clientY; ring.style.opacity = "1"; schedule(); };

    const hoverable = window.matchMedia("(hover: hover)").matches;
    let autoT = 0, autoId = 0;
    const auto = () => {
      const rect = section.getBoundingClientRect();
      autoT += 0.012;
      x = rect.left + rect.width * (0.5 + 0.32 * Math.cos(autoT));
      y = rect.top + rect.height * (0.45 + 0.28 * Math.sin(autoT * 1.3));
      schedule();
      autoId = requestAnimationFrame(auto);
    };

    paint();
    if (hoverable) {
      window.addEventListener("pointermove", onMove, { passive: true });
    } else {
      ring.style.opacity = "1";
      autoId = requestAnimationFrame(auto);
    }

    return () => {
      window.removeEventListener("pointermove", onMove);
      if (autoId) cancelAnimationFrame(autoId);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const R = 135;

  return (
    <div
      ref={sectionRef}
      className="relative isolate flex min-h-screen flex-col overflow-hidden bg-white dark:bg-[#0d0d0d] md:cursor-none"
    >
      {/* subtle grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.07]"
        style={{ backgroundImage: "linear-gradient(#1e1e1e 1px,transparent 1px),linear-gradient(90deg,#1e1e1e 1px,transparent 1px)", backgroundSize: "44px 44px" }}
      />

      {/* top brand bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-2 text-[#1e1e1e] dark:text-white">
          <NomarcMark size={30} />
          <span className="text-lg font-bold tracking-tight">Nomarc</span>
        </Link>
        <Link href="/" className="text-sm font-medium text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white">
          nomarcprojects.com
        </Link>
      </header>

      {/* base (always visible) */}
      <div className="relative z-10 flex flex-1 items-center justify-center pb-24">
        <Heading />
      </div>

      {/* reveal overlay — masked to a circle around the cursor */}
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center pb-24 [--x:50%] [--y:40%]"
        style={{
          WebkitMaskImage: `radial-gradient(circle ${R}px at var(--x) var(--y), #000 0%, #000 62%, transparent 100%)`,
          maskImage: `radial-gradient(circle ${R}px at var(--x) var(--y), #000 0%, #000 62%, transparent 100%)`,
        }}
      >
        {/* scattered construction glyphs */}
        {GLYPHS.map((g, i) => (
          <div
            key={i}
            className={`absolute ${g.accent ? "text-[#ffd716]" : "text-[#1e1e1e] dark:text-white"}`}
            style={{ left: g.x, top: g.y, width: g.size, height: g.size, transform: `translate(-50%,-50%) rotate(${g.rot ?? 0}deg)` }}
          >
            <g.C />
          </div>
        ))}
        <Heading ghost />
      </div>

      {/* SVG refraction filter for the glass lens (watery displacement of the backdrop) */}
      <svg width="0" height="0" aria-hidden className="absolute">
        <filter id="nm-fluid-glass" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.015" numOctaves="2" seed="11" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* fluid-glass lens (follows cursor) */}
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-30 opacity-0 transition-opacity duration-300"
        style={{ width: R * 2, height: R * 2 }}
      >
        {/* refraction + frost: distorts and saturates whatever is revealed beneath */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backdropFilter: "url(#nm-fluid-glass) blur(0.5px) saturate(1.7) brightness(1.06)",
            WebkitBackdropFilter: "saturate(1.7) brightness(1.06) blur(0.5px)",
          }}
        />
        {/* chromatic-aberration rim (the rainbow glass edge) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 210deg, #ff2d6b, #ffd716, #29e7ff, #7a5cff, #ff2d6b)",
            WebkitMaskImage: "radial-gradient(circle, transparent 58%, #000 70%, #000 90%, transparent 100%)",
            maskImage: "radial-gradient(circle, transparent 58%, #000 70%, #000 90%, transparent 100%)",
            filter: "blur(4px)",
            mixBlendMode: "plus-lighter",
            opacity: 0.75,
          }}
        />
        {/* specular sheen + glass edge + depth */}
        <div
          className="absolute inset-0 rounded-full border border-white/45 dark:border-white/25"
          style={{
            background: "radial-gradient(60% 55% at 32% 26%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%)",
            boxShadow: "inset 0 1px 20px rgba(255,255,255,0.35), inset 0 -16px 36px rgba(0,0,0,0.18), 0 12px 40px rgba(0,0,0,0.22)",
          }}
        />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd716] shadow-[0_0_8px_#ffd716]" />
        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-[#1e1e1e]/45 dark:text-white/45">
          keep looking
        </span>
      </div>

      {/* hint */}
      <p className="relative z-10 pb-8 text-center text-xs text-[#9a9a9a]">
        Move your cursor around — there&apos;s more on this site than meets the eye.
      </p>
    </div>
  );
}
