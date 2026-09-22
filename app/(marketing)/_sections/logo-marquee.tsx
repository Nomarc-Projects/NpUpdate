"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
 * One logo plate. `confirmOpen` turns it into a "you're leaving the page"
 * gate that redirects in the SAME tab on OK; otherwise it stays a plain
 * open-in-a-new-tab link. Shared by the marquee strip and the carousel so
 * both behave identically per context.
 */
function LogoPlate({ logo, confirmOpen }: { logo: Logo; confirmOpen: boolean }) {
  const plate =
    "flex-shrink-0 flex items-center justify-center rounded-2xl px-7 sm:px-10 h-20 sm:h-24 opacity-80 transition-opacity bg-transparent ring-0 shadow-none dark:bg-white dark:ring-1 dark:ring-white/10 dark:shadow-sm";

  const img = (
    <Image src={logo.src} alt={logo.name} width={320} height={96} draggable={false} className="h-9 sm:h-12 md:h-14 w-auto object-contain" />
  );

  if (!logo.href) {
    return <div title={logo.name} className={`${plate} hover:opacity-100`}>{img}</div>;
  }

  return (
    <a
      href={logo.href}
      // Carousel confirms leaving and redirects in this tab; other strips keep
      // the open-in-a-new-tab behavior.
      {...(confirmOpen ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      title={confirmOpen ? `${logo.name} — opens in this tab` : `${logo.name} — opens in a new tab`}
      onClick={(e) => {
        if (confirmOpen && !window.confirm(`You're about to leave this page and visit ${logo.name}. Continue?`)) e.preventDefault();
      }}
      className={`${plate} cursor-pointer hover:opacity-100 hover:ring-2 hover:ring-[#ffd716] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd716]`}
    >
      {img}
    </a>
  );
}

/**
 * Glassy card used by the homepage "Key Players" strip (desktop marquee +
 * mobile carousel). Clickable logos confirm leaving the page and redirect in
 * the same tab. Styled by the .marquee-card rules in globals.css.
 */
function MarqueeCard({ logo, confirmOpen }: { logo: Logo; confirmOpen: boolean }) {
  const shortName = logo.name.split(" — ")[0];
  const img = <img src={logo.src} alt={logo.name} loading="lazy" draggable={false} />;
  const inner = (
    <>
      {img}
      <div className="name">{shortName}</div>
      <div className="tag">Key Player</div>
    </>
  );

  if (!logo.href) return <div className="marquee-card">{inner}</div>;

  return (
    <a
      href={logo.href}
      // Confirms leaving and redirects in this tab; other strips keep the
      // open-in-a-new-tab behavior.
      {...(confirmOpen ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      title={`${shortName} — ${confirmOpen ? "opens in this tab" : "opens in a new tab"}`}
      onClick={(e) => {
        if (confirmOpen && !window.confirm(`You're about to leave this page and visit ${logo.name}. Continue?`)) e.preventDefault();
      }}
      className="marquee-card cursor-pointer"
    >
      {inner}
    </a>
  );
}

/**
 * One marquee group. The logos are full-colour artwork on transparency, so in
 * dark mode they sit on a light plate (rather than being inverted, which would
 * wreck multi-colour marks like the Lagos State seal).
 */
export function LogoGroup({ logos, ariaHidden, confirmOpen = false }: { logos: Logo[]; ariaHidden?: boolean; confirmOpen?: boolean }) {
  return (
    <div aria-hidden={ariaHidden} className="flex items-center gap-5 sm:gap-7 pr-5 sm:pr-7 shrink-0">
      {logos.map((p) => (
        <div key={p.name}>
          <LogoPlate logo={p} confirmOpen={confirmOpen} />
        </div>
      ))}
    </div>
  );
}

/**
 * One-logo-per-view carousel used by the homepage "Key Players" strip on
 * mobile. Each logo fills the full (col-sm-12) width; ←/→ step between slides,
 * dots track position, and it auto-advances every ~5s so the strip still
 * "slides" like the desktop marquee. Hovering pauses the auto-advance;
 * reduced-motion users get a manual carousel.
 */
function CarouselTrack({ logos }: { logos: Logo[] }) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const n = logos.length;

  useEffect(() => {
    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || n <= 1) return;
    const t = setInterval(() => {
      if (!paused.current && !cancelled) setIndex((p) => (p + 1) % n);
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [n, index]);

  const go = (dir: 1 | -1) => setIndex((p) => (p + dir + n) % n);

  return (
    <div
      className="relative overflow-hidden select-none touch-pan-y"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {logos.map((l) => (
          <div key={l.name} className="w-full flex-shrink-0 flex items-center justify-center px-2">
            <MarqueeCard logo={l} confirmOpen />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous logo"
        onClick={() => go(-1)}
        disabled={n <= 1}
        className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 dark:bg-[#161616]/90 border border-[#ececec] dark:border-white/10 text-[#1e1e1e] dark:text-white shadow-sm hover:bg-[#ffd716] hover:border-[#ffd716] transition-colors disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Next logo"
        onClick={() => go(1)}
        disabled={n <= 1}
        className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 dark:bg-[#161616]/90 border border-[#ececec] dark:border-white/10 text-[#1e1e1e] dark:text-white shadow-sm hover:bg-[#ffd716] hover:border-[#ffd716] transition-colors disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>

      <div className="flex items-center justify-center gap-1.5 mt-4">
        {logos.map((l, idx) => (
          <button
            key={l.name}
            type="button"
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => setIndex(idx)}
            className={`w-2 h-2 rounded-full transition-colors ${idx === index ? "bg-[#ffd716]" : "bg-[#e3e3e3] dark:bg-white/15 hover:bg-[#ffd716]/60"}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Marquee for the "Trusted Clients" strip — seamless CSS auto-scroll, unchanged.
 * The homepage Key Players strip (`interactive`) shows the auto-scrolling
 * marquee on desktop (`md`+) and a one-logo-per-view carousel on mobile.
 */
export function LogoMarquee({ logos, interactive = false }: { logos: Logo[]; interactive?: boolean }) {
  if (interactive) {
    // Four identical card groups keep the -25% loop seamless (gap 24px +
    // padding-right 24px == the group boundary pitch).
    const groups = [0, 1, 2, 3].map((k) => (
      <div key={k} aria-hidden={k !== 0} className="flex gap-6">
        {logos.map((l) => (
          <MarqueeCard key={l.name} logo={l} confirmOpen />
        ))}
      </div>
    ));
    return (
      <>
        <div className="hidden md:block marquee-viewport">
          <div className="marquee-track animate-[nm-marquee-4_48s_linear_infinite]">{groups}</div>
        </div>
        <div className="md:hidden">
          <CarouselTrack logos={logos} />
        </div>
      </>
    );
  }

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
      <div className="flex items-center w-max animate-[nm-marquee-4_48s_linear_infinite]">{groups}</div>
    </div>
  );
}