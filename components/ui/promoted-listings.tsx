"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { getActiveAdverts, type Advert } from "@/lib/services/adverts";
import { trackPromotion } from "@/lib/track-promotion";
import { PromotedCard, type PromotedCardData } from "@/components/ui/promoted-card";
import { useAutoAdvance } from "@/components/ui/scroller";

/**
 * Promoted-listings surface — the single "Ad Board", rendering admin-managed
 * adverts (lib/services/adverts). Renders nothing at all when no advert is
 * live: a promoted slot has to reflect someone actually advertising.
 *
 * Two presentations off the SAME data:
 *  - `variant="slider"` (default) — the homepage auto-advancing hero slider.
 *  - `variant="row"` — the Exhibition Hub's 3-up banner row at the top of the
 *    storefront (image + heading + "Shop now" pill per banner).
 */

/** A single compact banner in the `row` variant — image backdrop, ink scrim,
 *  heading and a "Shop now" pill. Purely advert-driven (no invented copy). */
function PromoBanner({ ad, index }: { ad: PromotedCardData; index: number }) {
  const accent = ad.accent || "#ffd716";
  const href = ad.ctaHref || "/exhibition-hub";
  const label = ad.ctaLabel || "Shop now";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative snap-start flex-shrink-0 w-[82%] sm:w-auto overflow-hidden rounded-[20px] border border-[#ececec] dark:border-white/10 bg-[#1e1e1e] min-h-[178px] md:min-h-[196px]"
    >
      {ad.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.imageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 ease-out group-hover:scale-[1.07]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/25" style={{ background: `linear-gradient(135deg, ${accent}55, #1e1e1e)` }}>
          <ImageIcon size={22} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1e1e1e]/92 via-[#1e1e1e]/70 to-[#1e1e1e]/25" />

      <div className="relative h-full p-5 md:p-6 flex flex-col justify-center">
        <span
          className="inline-flex self-start items-center px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em]"
          style={{ backgroundColor: accent, color: "#1e1e1e" }}
        >
          {ad.badge || "Promoted"}
        </span>
        <h3 className="mt-2.5 text-[15.5px] md:text-[17px] font-bold leading-snug text-white line-clamp-2 max-w-[88%]">
          {ad.heading}
        </h3>
        {ad.promotedName && (
          <p className="mt-1 text-[11.5px] text-white/60 truncate">{ad.promotedName}</p>
        )}
        <Link
          href={href}
          className="mt-3.5 inline-flex self-start items-center gap-1.5 rounded-full bg-white text-[#1e1e1e] px-4 py-2 text-[12px] font-bold transition-all group-hover:bg-[#ffd716] group-hover:gap-2.5"
        >
          {label} <ArrowRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}

/**
 * How long each promoted banner holds before the row slides to the next one.
 */
const ROW_ROTATE_MS = 30_000;

/** The Exhibition Hub's 3-up banner row: a self-advancing snap carousel below
 *  `sm`, a grid above. No arrow controls — it rotates on its own and stays
 *  drag-scrollable, and a drag pauses the rotation.
 *
 *  `scroll-pl-4` is load-bearing — without it `snap-start` aligns the first
 *  banner to the padding box and the browser eats the gutter, leaving the row
 *  flush against the screen edge. */
function PromotedRow({ ads }: { ads: PromotedCardData[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useAutoAdvance(ref, ROW_ROTATE_MS);
  return (
    <div
      ref={ref}
      className="flex sm:grid gap-4 overflow-x-auto overscroll-x-contain sm:overflow-visible snap-x snap-mandatory -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gridTemplateColumns: `repeat(${ads.length}, minmax(0, 1fr))` }}
    >
      {ads.map((ad, n) => <PromoBanner key={`${ad.heading}-${n}`} ad={ad} index={n} />)}
    </div>
  );
}

export function PromotedListings({ variant = "slider" }: { variant?: "slider" | "row" } = {}) {
  const [ads, setAds] = useState<PromotedCardData[] | null>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    getActiveAdverts()
      .then((rows: Advert[]) => setAds(rows))
      .catch(() => setAds([]));
  }, []);

  const cards = ads ?? [];
  const isRow = variant === "row";

  const next = useCallback(() => setI((n) => (n + 1) % cards.length), [cards.length]);

  useEffect(() => {
    if (isRow || paused || cards.length < 2) return;
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [isRow, paused, next, cards.length]);

  const idx = Math.min(i, cards.length - 1);
  const active = cards[idx];

  // Count an impression each time a paid campaign becomes the visible card.
  // House adverts carry no promotionId and are skipped.
  useEffect(() => {
    const pid = active?.promotionId;
    if (!pid) return;
    trackPromotion(pid, "view");
  }, [active?.promotionId]);
  const prev = useCallback(() => setI((n) => (n - 1 + cards.length) % cards.length), [cards.length]);

  // No live adverts: render nothing. Placeholder fillers were removed — a
  // promoted slot has to reflect someone actually advertising, and the
  // homepage Promotions section is entirely admin-controlled from the Ad
  // Board (/admin/adverts).
  //
  // Must sit below every hook: bailing out earlier changes the hook count
  // between the empty first paint and the loaded one, which React rejects.
  if (cards.length === 0) return null;

  // Exhibition Hub: same adverts, presented as a 3-up banner row.
  if (isRow) {
    const row = cards.slice(0, 3);
    return <PromotedRow ads={row} />;
  }

  return (
    <div
      className="relative mb-16 group/slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <PromotedCard ad={active} />
        </motion.div>
      </AnimatePresence>

      {/* prev/next arrows — desktop hover reveal */}
      {cards.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous promotion"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur shadow-md items-center justify-center text-[#1e1e1e] dark:text-white opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#ffd716] hover:text-[#1e1e1e]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            aria-label="Next promotion"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur shadow-md items-center justify-center text-[#1e1e1e] dark:text-white opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#ffd716] hover:text-[#1e1e1e]"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* dots */}
      {cards.length > 1 && (
        <div className="absolute -bottom-6 inset-x-0 flex items-center justify-center gap-2">
          {cards.map((_, dot) => (
            <button
              key={dot}
              onClick={() => setI(dot)}
              aria-label={`Go to promotion ${dot + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{ width: dot === idx ? 18 : 6, backgroundColor: dot === idx ? "#ffd716" : "#d4d4d4" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
