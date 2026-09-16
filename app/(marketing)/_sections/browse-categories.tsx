"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, Quote } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PromotedListings } from "@/components/ui/promoted-listings";
import { Button } from "@/components/ui/button";
import { ScrollArrow, useScroller } from "@/components/ui/scroller";
import { useAuth } from "@/lib/store/auth";
import { cn } from "@/lib/utils";
import { FadeUp } from "./fade-up";

const profCategories = [
  {
    title: "Engineers",
    desc: "Calculating structural loads, material specifications, and system designs so buildings and infrastructure are safe, efficient, and built to last.",
    img: "/media/engineers.webp",
  },
  {
    title: "Architects",
    desc: "Designing and planning builds that are functional, aesthetically appealing and structurally sound ensuring compliance with safety and zoning regulations.",
    img: "/media/architects.webp",
  },
  {
    title: "Builders",
    desc: "The actual hands on work: pouring concrete, welding steel, installing wiring, turning plans into new buildings.",
    img: "/media/builders.webp",
  },
  {
    title: "Survey & Geoinformaticians",
    desc: "Measuring land, mapping site conditions, and capturing geospatial data to give accurate, up-to-date information for design, construction, and planning.",
    img: "/media/survey.webp",
  },
  {
    title: "Quantity Surveyors",
    desc: "Estimating costs, managing budgets, and valuing materials and labor throughout a project's lifecycle, from initial tender to final account.",
    img: "/media/quantity-surveyors.webp",
  },
  {
    title: "Urban and Regional Planners",
    desc: "Develops plans for land use, transportation and infrastructure to create sustainable, well organised urban environments.",
    img: "/media/urban-planners.webp",
  },
  {
    title: "Estate Managers",
    desc: "Facilitates property buying, selling and leasing helping clients find the best real estate opportunities based on needs.",
    img: "/media/estate-managers.webp",
  },
  {
    title: "Designers",
    desc: "Focuses on interior, landscape or structural aesthetics ensuring spaces are functional, visually appealing and aligned with client preferences.",
    img: "/media/designers.webp",
  },
];

/* success-story testimonials shown in the dark panel */
const successStories = [
  {
    quote: "Nomarc's project tools cut our bidding time by 40%.",
    body: "We landed two commercial contracts in months, not years.",
    name: "Adegoke Micheal",
  },
  {
    quote: "I built a verified portfolio and got hired in 3 weeks.",
    body: "Firms reached out to me directly through the directory.",
    name: "Chiamaka Eze",
  },
  {
    quote: "Our firm sourced 12 vetted professionals in one quarter.",
    body: "The digital seal gives us confidence in every hire.",
    name: "Tunde Bakare",
  },
];

export function BrowseCategorySection() {
  const isSignedIn = useAuth((s) => s.isSignedIn);
  // Signed-out visitors get sent to sign-up first (same rule as the hero CTAs).
  const go = (authed: string) => (isSignedIn ? authed : `/signup?redirect=${encodeURIComponent(authed)}`);
  const [page, setPage] = useState(0);
  const perPage = 3;
  const totalPages = Math.ceil(profCategories.length / perPage);
  const { ref: railRef, canLeft, canRight, scrollBy } = useScroller();

  const [story, setStory] = useState(0);
  const active = successStories[story];

  // auto-advance testimonials every 5s
  useEffect(() => {
    const id = setInterval(() => setStory((s) => (s + 1) % successStories.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <FadeUp>
      <section className="bg-white dark:bg-[#111] py-20 px-6 md:px-10 lg:px-14">
        <PromotedListings />

        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[#ffd716] text-[11px] font-bold uppercase tracking-[0.24em] mb-3">Talent</p>
            <h2 className="text-3xl md:text-[34px] font-bold text-[#1e1e1e] dark:text-white tracking-tight">
              Find the right professional for the job.
            </h2>
          </div>
          {/* prev/next — identical resting style on both; yellow+glow is a hover-only
              cue, not a permanent state, so neither arrow reads as "the important one".
              Disabled (past either edge) stays transparent-ish but keeps its border
              visible, so the control still reads as navigation, just inactive. */}
          <div className="hidden sm:flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-10 h-10 rounded-full border border-[#e5e5e5] dark:border-white/15 flex items-center justify-center text-[#1e1e1e] dark:text-white transition-all hover:bg-[#ffd716] hover:border-[#ffd716] hover:text-[#1e1e1e] hover:shadow-[0_6px_16px_rgba(255,215,22,0.4)] disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous professionals"
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="w-10 h-10 rounded-full border border-[#e5e5e5] dark:border-white/15 flex items-center justify-center text-[#1e1e1e] dark:text-white transition-all hover:bg-[#ffd716] hover:border-[#ffd716] hover:text-[#1e1e1e] hover:shadow-[0_6px_16px_rgba(255,215,22,0.4)] disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next professionals"
            >
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Mobile: swipeable carousel carrying ALL the professions — the
            paging buttons above are `hidden sm:flex`, so slicing to `visible`
            here left 5 of the 8 permanently unreachable on a phone. ≥md the
            paged 3-up grid is back, with off-page cards hidden.
            `scroll-pl-6` matches the `px-6` bleed padding — without it the
            snapport starts at the padding box and the first card loses its
            gutter against the screen edge. */}
        <div className="relative">
          <ScrollArrow dir="left" show={canLeft} onClick={() => scrollBy(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 z-[2] md:hidden" />
          <ScrollArrow dir="right" show={canRight} onClick={() => scrollBy(1)} className="absolute right-1 top-1/2 -translate-y-1/2 z-[2] md:hidden" />

          <div ref={railRef} className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto overscroll-x-contain md:overflow-visible snap-x snap-mandatory md:snap-none -mx-6 px-6 scroll-pl-6 md:mx-0 md:px-0 md:scroll-pl-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {profCategories.map((cat, i) => (
            <Link
              key={cat.title}
              href={go("/dashboard/find-professionals")}
              className={cn(
                "group flex flex-col rounded-2xl p-4 border border-[#ececec] dark:border-white/10 bg-white dark:bg-transparent hover:bg-[#ffd716] hover:border-transparent hover:shadow-[0_8px_30px_rgba(255,215,22,0.35)] transition-all duration-300 shrink-0 w-[85%] sm:w-[70%] md:w-auto snap-start",
                // desktop keeps the 3-at-a-time paging driven by the arrows above
                i >= page * perPage && i < page * perPage + perPage ? "md:flex" : "md:hidden",
              )}
            >
              <div className="px-2 pt-2 pb-4">
                <h3 className="font-bold text-[#1e1e1e] dark:text-white group-hover:text-[#1e1e1e] text-[17px] mb-2">{cat.title}</h3>
                <p className="text-[13px] leading-relaxed text-[#8c8c8c] dark:text-white/50 group-hover:text-[#4a3d00] transition-colors duration-300">
                  {cat.desc}
                </p>
              </div>
              <div className="relative mt-auto h-40 rounded-xl overflow-hidden">
                <img src={cat.img} alt={cat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold shadow-md opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  Find Professionals <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          ))}
          </div>
        </div>

        <div className="flex justify-center mt-9">
          <Button href={go("/dashboard/find-professionals")} variant="primary" size="sm">
            Find Professionals
          </Button>
        </div>

        {/* ── Success Stories panel ── */}
        <div className="mt-14 rounded-[28px] bg-[#1c1c1c] px-6 py-12 sm:px-12 sm:py-14 md:px-16 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,2.15fr)] gap-10 md:gap-16">
            {/* left rail — label, blurb, then arrows sitting lower */}
            <div className="flex flex-col">
              <p className="text-[#ffd716] font-bold text-[19px] md:text-[21px] tracking-tight mb-3">Success Stories</p>
              <p className="text-[#8f8f8f] text-[15px] md:text-[16px] leading-[1.5] max-w-[260px]">
                Hear from young professionals already thriving through Nomarc.
              </p>
              <div className="flex gap-3 mt-10 md:mt-16">
                <button
                  onClick={() => setStory((s) => (s - 1 + successStories.length) % successStories.length)}
                  className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.07] flex items-center justify-center text-white/70 transition-all hover:bg-[#ffd716] hover:border-[#ffd716] hover:text-[#1e1e1e] hover:shadow-[0_6px_16px_rgba(255,215,22,0.4)]"
                  aria-label="Previous story"
                >
                  <ArrowLeft size={17} />
                </button>
                <button
                  onClick={() => setStory((s) => (s + 1) % successStories.length)}
                  className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.07] flex items-center justify-center text-white/70 transition-all hover:bg-[#ffd716] hover:border-[#ffd716] hover:text-[#1e1e1e] hover:shadow-[0_6px_16px_rgba(255,215,22,0.4)]"
                  aria-label="Next story"
                >
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>

            {/* right — compact quote icon sitting just above the blockquote */}
            <div className="relative">
              <Quote size={30} className="text-[#ffd716]/70 mb-3" strokeWidth={0} fill="currentColor" aria-hidden />
              <AnimatePresence mode="wait">
                <motion.div
                  key={story}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  {/* No `whitespace-pre-line`: the quotes used to carry a hard
                      `\n` for the desktop two-line shape, but the text still
                      wrapped naturally on a phone, so the two break points
                      fought and left orphans ("…project tools / cut / our
                      bidding…"). Let it wrap on its own and balance the lines. */}
                  <blockquote className="text-white text-[26px] sm:text-[36px] md:text-[44px] leading-[1.14] tracking-[-0.01em] [text-wrap:balance]">
                    {active.quote}
                  </blockquote>
                  <p className="mt-6 text-white/85 text-[16px] md:text-[18px] leading-[1.5] max-w-[520px]">{active.body}</p>
                  <div className="mt-10 md:mt-14 flex items-center gap-2.5">
                    <span className="w-[22px] h-[22px] rounded-full bg-[#ffd716] flex items-center justify-center flex-shrink-0">
                      <Check size={13} className="text-[#1e1e1e]" strokeWidth={3} />
                    </span>
                    <span className="text-white font-semibold text-[17px] md:text-[19px]">{active.name}</span>
                    <span className="text-white/25 text-[17px] md:text-[19px]">|</span>
                    <span className="text-white/50 text-[16px] md:text-[18px]">Verified user</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
