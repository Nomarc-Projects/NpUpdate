"use client";

import { useState } from "react";
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
 * One marquee group. The logos are full-colour artwork on transparency, so in
 * dark mode they sit on a light plate (rather than being inverted, which would
 * wreck multi-colour marks like the Lagos State seal).
 */
export function LogoGroup({ logos, ariaHidden }: { logos: Logo[]; ariaHidden?: boolean }) {
  return (
    <div aria-hidden={ariaHidden} className="flex items-center gap-5 sm:gap-7 pr-5 sm:pr-7 shrink-0">
      {logos.map((p) => (
        <div key={p.name}>
          <LogoPlate logo={p} confirmOpen={false} />
        </div>
      ))}
    </div>
  );
}

/**
 * One-logo-per-view carousel used by the homepage "Key Players" strip.
 * Each logo fills the full (col-sm-12) width; ←/→ step between slides, dots
 * track position. No auto-scroll — the marquee behavior was replaced by the
 * single-slide layout the user asked for.
 */
function CarouselTrack({ logos }: { logos: Logo[] }) {
  const [index, setIndex] = useState(0);
  const n = logos.length;

  const go = (dir: 1 | -1) => setIndex((p) => (p + dir + n) % n);

  return (
    <div className="relative overflow-hidden">
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {logos.map((l) => (
          <div key={l.name} className="w-full flex-shrink-0 flex items-center justify-center px-14 sm:px-24">
            <LogoPlate logo={l} confirmOpen />
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
 * The homepage Key Players strip opts into the carousel via `interactive`.
 */
export function LogoMarquee({ logos, interactive = false }: { logos: Logo[]; interactive?: boolean }) {
  if (interactive) {
    return <CarouselTrack logos={logos} />;
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