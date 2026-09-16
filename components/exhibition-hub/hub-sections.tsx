"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, ChevronDown, ChevronRight, MapPin, PackageSearch, Store, type LucideIcon } from "lucide-react";
import type { ProductCard } from "@/lib/services/catalog";
import { ScrollArrow, useScroller } from "@/components/ui/scroller";
import { cn } from "@/lib/utils";

// The horizontal-scroller primitives now live in components/ui so the promoted
// ad row can share them without reaching into exhibition-hub; re-exported here
// because existing call sites import them from this module.
export { ScrollArrow, useScroller };

/* ── Section header ─────────────────────────────────────────────────────── */
export function SectionHeader({
  title,
  subtitle,
  viewAllHref,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  /** Extra controls (e.g. rail arrows) rendered next to "View all". */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h2 className="text-[18px] sm:text-[21px] font-bold tracking-tight text-[#1e1e1e] dark:text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-[12.5px] text-[#9a9a9a] dark:text-white/45">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {children}
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="group inline-flex items-center gap-1 text-[12.5px] font-bold text-[#1e1e1e] dark:text-white hover:text-[#caa400] dark:hover:text-[#ffd716] transition-colors whitespace-nowrap"
          >
            View All
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Category slider (with arrows) ──────────────────────────────────────── */
export function CategorySlider({
  chips,
  active,
  onPick,
  icons,
}: {
  chips: string[];
  active: string;
  onPick: (c: string) => void;
  /** Optional icon per chip label — adds a bit of storefront-style visual
   *  weight to the row without changing the underlying filter pill pattern. */
  icons?: Record<string, LucideIcon>;
}) {
  const { ref, canLeft, canRight, scrollBy } = useScroller();

  return (
    <div className="relative">
      {/* edge fades so the strip visibly continues under the arrows */}
      <div className={cn("pointer-events-none absolute left-0 inset-y-0 w-10 bg-gradient-to-r from-white dark:from-[#111] to-transparent z-[1] transition-opacity", canLeft ? "opacity-100" : "opacity-0")} />
      <div className={cn("pointer-events-none absolute right-0 inset-y-0 w-10 bg-gradient-to-l from-white dark:from-[#111] to-transparent z-[1] transition-opacity", canRight ? "opacity-100" : "opacity-0")} />

      <ScrollArrow dir="left" show={canLeft} onClick={() => scrollBy(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-[2] hidden sm:flex" />
      <ScrollArrow dir="right" show={canRight} onClick={() => scrollBy(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-[2] hidden sm:flex" />

      <div
        ref={ref}
        className="flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth py-1 sm:px-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map((c) => {
          const Icon = icons?.[c];
          return (
            <button
              key={c}
              onClick={() => onPick(c)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors",
                active === c
                  ? "bg-[#ffd716] text-[#1e1e1e]"
                  : "bg-[#f5f5f5] dark:bg-white/5 text-[#6b6b6b] dark:text-white/55 hover:text-[#1e1e1e] dark:hover:text-white",
              )}
            >
              {Icon && <Icon size={14} className={active === c ? "text-[#1e1e1e]" : "text-[#9a9a9a]"} />}
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Product rail ───────────────────────────────────────────────────────── */
/** 5-up on desktop, horizontal snap-scroll on smaller screens. Arrow controls
 *  appear in the section header only while there's more to scroll to. */
export function ProductRail({
  title,
  subtitle,
  viewAllHref,
  products,
  renderCard,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  products: ProductCard[];
  renderCard: (p: ProductCard) => React.ReactNode;
}) {
  const { ref, canLeft, canRight, scrollBy } = useScroller();
  if (!products.length) return null;

  return (
    <section className="mb-12">
      <SectionHeader title={title} subtitle={subtitle} viewAllHref={viewAllHref} />

      {/* Scroll arrows float over the row itself (left/right edges), same
          placement as the category card carousel — not beside "View All".
          On mobile they sit just inside the row (the gutter has no room) and
          ride at 30% height so they clear the card's slide-up "Add to cart". */}
      <div className="relative">
        <ScrollArrow dir="left" show={canLeft} onClick={() => scrollBy(-1)} className="absolute left-1 md:-left-4 top-[30%] md:top-1/2 -translate-y-1/2 z-[2]" />
        <ScrollArrow dir="right" show={canRight} onClick={() => scrollBy(1)} className="absolute right-1 md:-right-4 top-[30%] md:top-1/2 -translate-y-1/2 z-[2]" />

        <div
          ref={ref}
          className="flex gap-4 md:gap-5 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 scroll-pl-4 md:mx-0 md:px-0 md:scroll-pl-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p) => (
            <div
              key={p.id}
              className="snap-start flex-shrink-0 w-[62%] sm:w-[38%] md:w-[30%] lg:w-[calc((100%-5rem)/5)]"
            >
              {renderCard(p)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Verified suppliers grid ────────────────────────────────────────────── */
export type SupplierSummary = {
  key: string;
  name: string;
  location: string;
  verified: boolean;
  count: number;
  companyId?: string;
};

/** Group the browse list into the distinct suppliers behind it — verified
 *  first, then by how much they list. All fields come off real products. */
export function deriveSuppliers(products: ProductCard[], limit = 8): SupplierSummary[] {
  const map = new Map<string, SupplierSummary>();
  for (const p of products) {
    if (!p.supplier) continue;
    const key = p.vendorCompanyId ?? `name:${p.supplier}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.location && p.location) existing.location = p.location;
      existing.verified = existing.verified || p.verified;
    } else {
      map.set(key, {
        key, name: p.supplier, location: p.location, verified: p.verified,
        count: 1, companyId: p.vendorCompanyId,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => Number(b.verified) - Number(a.verified) || b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "N";
}

export function SupplierGrid({
  suppliers,
  hrefFor,
  viewAllHref,
}: {
  suppliers: SupplierSummary[];
  hrefFor: (s: SupplierSummary) => string;
  viewAllHref?: string;
}) {
  if (!suppliers.length) return null;
  return (
    <section className="mb-12">
      <SectionHeader
        title="Explore supplier stores"
        subtitle="The exhibitors behind the products on this page."
        viewAllHref={viewAllHref}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {suppliers.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, delay: Math.min(i, 7) * 0.04 }}
          >
            <Link
              href={hrefFor(s)}
              className="group flex items-center gap-3 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 hover:border-[#ffd716] hover:shadow-[0_10px_30px_rgba(0,0,0,0.07)] transition-all duration-300"
            >
              <span className="w-11 h-11 flex-shrink-0 rounded-full bg-[#1e1e1e] dark:bg-[#ffd716] text-white dark:text-[#1e1e1e] text-[13px] font-black flex items-center justify-center">
                {initialsOf(s.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 min-w-0">
                  <span className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white truncate group-hover:text-[#caa400] dark:group-hover:text-[#ffd716] transition-colors">
                    {s.name}
                  </span>
                  {s.verified && <BadgeCheck size={13} className="text-[#0369a1] flex-shrink-0" />}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#9a9a9a] truncate">
                  <Store size={10} /> {s.count} product{s.count !== 1 ? "s" : ""}
                  {s.location && <><span className="text-[#d4d4d4] dark:text-white/20">·</span><MapPin size={10} /> {s.location}</>}
                </span>
              </span>
              <ChevronRight size={16} className="text-[#c3c3c3] flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-[#caa400]" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── Category card carousel (replaces the plain pill chips as the hub's
   primary category filter — image cards, ~6 visible with prev/next arrows,
   same click-to-filter behaviour as the old chip row) ────────────────────── */
/**
 * `img` is a representative product photo for the category. When present it
 * replaces the flat colour + icon treatment — real product imagery reads as a
 * storefront, and it means the hub has ONE category surface instead of an icon
 * rail plus a near-identical photo grid underneath. `color`/`icon` remain the
 * fallback for entries with no usable photo (notably "All").
 */
export type CategoryCardData = { name: string; color: string; icon?: LucideIcon; count?: number; img?: string };

export function CategoryCardRail({
  cards,
  active,
  onPick,
}: {
  cards: CategoryCardData[];
  active: string;
  onPick: (c: string) => void;
}) {
  const { ref, canLeft, canRight, scrollBy } = useScroller();
  if (!cards.length) return null;

  return (
    <div className="relative">
      <ScrollArrow dir="left" show={canLeft} onClick={() => scrollBy(-1)} className="absolute left-1 md:-left-4 top-[38%] md:top-1/2 -translate-y-1/2 z-[2]" />
      <ScrollArrow dir="right" show={canRight} onClick={() => scrollBy(1)} className="absolute right-1 md:-right-4 top-[38%] md:top-1/2 -translate-y-1/2 z-[2]" />

      <div
        ref={ref}
        className="flex gap-3 md:gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth -mx-4 px-4 scroll-pl-4 md:mx-0 md:px-0 md:scroll-pl-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((c) => {
          const Icon = c.icon;
          const isActive = active === c.name;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onPick(c.name)}
              className={cn(
                "group snap-start flex-shrink-0 w-[36%] sm:w-[22%] lg:w-[calc((100%-5*1rem)/6)] text-left rounded-2xl border overflow-hidden transition-all duration-300 bg-white dark:bg-[#1e1e1e]",
                isActive ? "border-[#ffd716] ring-2 ring-[#ffd716]/35" : "border-transparent hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)]",
              )}
            >
              <span className="relative block aspect-[4/3] overflow-hidden">
                {c.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.img}
                    alt=""
                    aria-hidden
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:scale-[1.04]"
                    style={{ backgroundColor: c.color }}
                  >
                    {Icon ? <Icon size={22} className="text-white/95" /> : <PackageSearch size={22} className="text-white/95" />}
                  </span>
                )}
              </span>
              <span className="block px-2.5 py-2.5 text-center">
                <span className={cn("block text-[12px] font-bold truncate", isActive ? "text-[#caa400] dark:text-[#ffd716]" : "text-[#1e1e1e] dark:text-white")}>
                  {c.name}
                </span>
                {typeof c.count === "number" && (
                  <span className="block mt-0.5 text-[10.5px] text-[#9a9a9a]">{c.count} product{c.count !== 1 ? "s" : ""}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Compact filter dropdown pill (Category/Availability/Price/Sort) ──────── */
export function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  /** First entry is treated as the "no filter" default. */
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isDefault = value === options[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 h-10 px-3.5 rounded-lg border text-[13px] font-semibold whitespace-nowrap transition-colors",
          isDefault
            ? "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"
            : "border-[#1e1e1e] dark:border-white text-[#1e1e1e] dark:text-white",
        )}
      >
        {isDefault ? label : value}
        <ChevronDown size={14} className={cn("text-[#9a9a9a] transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute z-30 mt-2 min-w-[190px] rounded-xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_16px_44px_rgba(0,0,0,0.14)] p-1.5 max-h-64 overflow-auto"
          >
            {options.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={value === opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  "px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-colors",
                  value === opt
                    ? "bg-[#f5f5f5] dark:bg-white/10 font-semibold text-[#1e1e1e] dark:text-white"
                    : "text-[#4a4a4a] dark:text-white/70 hover:bg-[#f5f5f5] dark:hover:bg-white/5",
                )}
              >
                {opt}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Category tiles ─────────────────────────────────────────────────────── */
export type CategoryTile = { name: string; img: string; count: number };

export function CategoryTiles({ tiles, onPick }: { tiles: CategoryTile[]; onPick: (name: string) => void }) {
  // Carousel below `sm`, plain grid above — the arrows only ever have anything
  // to scroll to in the carousel state, so `show` hides them on desktop.
  const { ref, canLeft, canRight, scrollBy } = useScroller();
  if (!tiles.length) return null;
  return (
    <section className="mb-12">
      <SectionHeader title="Shop by category" subtitle="Jump straight into a material group." />
      <div className="relative">
        <ScrollArrow dir="left" show={canLeft} onClick={() => scrollBy(-1)} className="absolute left-1 top-[38%] -translate-y-1/2 z-[2] sm:hidden" />
        <ScrollArrow dir="right" show={canRight} onClick={() => scrollBy(1)} className="absolute right-1 top-[38%] -translate-y-1/2 z-[2] sm:hidden" />

        <div ref={ref} className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tiles.map((t, i) => (
          <motion.button
            key={t.name}
            type="button"
            onClick={() => onPick(t.name)}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, delay: Math.min(i, 5) * 0.05 }}
            className="group snap-start flex-shrink-0 w-[44%] sm:w-auto text-left rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden hover:border-[#ffd716] hover:shadow-[0_10px_30px_rgba(0,0,0,0.07)] transition-all duration-300"
          >
            <span className="relative block aspect-[4/3] bg-[#f4f4f4] dark:bg-white/5 overflow-hidden">
              {t.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.img} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[#c3c3c3]"><PackageSearch size={22} /></span>
              )}
            </span>
            <span className="block px-3 py-3 text-center">
              <span className="block text-[13px] font-bold text-[#1e1e1e] dark:text-white truncate">{t.name}</span>
              <span className="block mt-0.5 text-[11px] text-[#9a9a9a]">{t.count} product{t.count !== 1 ? "s" : ""}</span>
            </span>
          </motion.button>
        ))}
        </div>
      </div>
    </section>
  );
}

/* ── Full-width promo banner ────────────────────────────────────────────── */
export function HubPromoBanner({ exhibitorHref, onBrowse }: { exhibitorHref: string; onBrowse: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-12 relative overflow-hidden rounded-[24px] bg-[#1e1e1e] dark:bg-[#191919] border border-[#1e1e1e] dark:border-white/10"
    >
      <div className="pointer-events-none absolute -top-24 -right-16 w-[380px] h-[380px] rounded-full bg-[#ffd716]/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:18px_18px]" />

      <div className="relative px-6 py-10 md:px-12 md:py-14 flex flex-col md:flex-row md:items-center gap-7">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#ffd716]">Sell on Nomarc</p>
          <h2 className="mt-3 text-[clamp(1.5rem,3.2vw,2.3rem)] font-bold leading-[1.12] tracking-tight text-white max-w-[560px]">
            Put your materials in front of Nigeria&apos;s builders.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-white/60 max-w-[520px]">
            List your catalogue, take quote requests and orders, and get paid — all from one exhibitor dashboard.
          </p>
        </div>
        {/* Stacked and full-width on mobile — side by side they left a ragged
            gap against the banner's edge; they only sit inline once there's a
            second column to sit in. */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto flex-shrink-0">
          <Link
            href={exhibitorHref}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] px-5 py-3 text-[13.5px] font-bold hover:bg-[#e6c114] transition-colors"
          >
            Become an exhibitor <ArrowRight size={15} />
          </Link>
          <button
            type="button"
            onClick={onBrowse}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/20 text-white px-5 py-3 text-[13.5px] font-semibold hover:border-[#ffd716] hover:text-[#ffd716] transition-colors"
          >
            Browse all products
          </button>
        </div>
      </div>
    </motion.section>
  );
}
