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
          <Image src={p.src} alt={p.name} width={320} height={96} className="h-7 sm:h-9 w-auto object-contain" />
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

/** Seamless auto-scrolling marquee shared by the partners strip. */
export function LogoMarquee({ logos }: { logos: Logo[] }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-r from-white dark:from-[#111] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-l from-white dark:from-[#111] to-transparent z-10 pointer-events-none" />
      <div className="flex items-center w-max animate-[nm-marquee-4_48s_linear_infinite]">
        <LogoGroup logos={logos} />
        <LogoGroup logos={logos} ariaHidden />
        <LogoGroup logos={logos} ariaHidden />
        <LogoGroup logos={logos} ariaHidden />
      </div>
    </div>
  );
}
