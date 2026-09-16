"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store/auth";

type HeroSlide = {
  line1: string;
  line2: string;
  /** which line carries the brand-yellow treatment */
  yellowLine: 1 | 2;
  subcopy: string;
  img: string;
};

const heroSlides: HeroSlide[] = [
  {
    line1: "The Largest Global Community",
    line2: "of construction professionals.",
    yellowLine: 1,
    subcopy:
      "Find jobs, products, tools and opportunities designed for construction professionals at every stage of your career.",
    img: "/media/hero-i.webp",
  },
  {
    line1: "Build Your Career.",
    line2: "Shape Your Future.",
    yellowLine: 2,
    subcopy:
      "Find jobs, products, tools and opportunities designed for construction professionals at every stage of your career.",
    img: "/media/hero-ii.webp",
  },
  {
    line1: "Hire Verified Talent.",
    line2: "Construct Better Projects.",
    yellowLine: 2,
    subcopy: "Find skilled, trusted construction professionals faster and build stronger teams with confidence.",
    img: "/media/hero-iii.webp",
  },
  {
    line1: "Showcase Your Brand to the",
    line2: "People Who Build Africa.",
    yellowLine: 2,
    subcopy:
      "Reach architects, engineers, contractors, developers, and decision-makers through Africa's fastest-growing construction ecosystem.",
    img: "/media/hero-iv.webp",
  },
];

const SLIDE_INTERVAL_MS = 6000;

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const isSignedIn = useAuth((s) => s.isSignedIn);
  const slide = heroSlides[activeIndex];

  useEffect(() => {
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % heroSlides.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="bg-white dark:bg-[#111] px-0 md:px-10 lg:px-14 pt-0 md:pt-3 pb-0 md:pb-5"
      style={{ height: "calc(100dvh - 64px)" }}
    >
      <div className="relative rounded-none md:rounded-[18px] overflow-hidden h-full flex items-center justify-center">
        {/* ── Crossfading background images ── */}
        <AnimatePresence>
          <motion.div
            key={activeIndex}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${slide.img}')` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
        </AnimatePresence>
        {/* the New Images hero photography already bakes in a dark scrim, so this stays light to avoid double-darkening */}
        <div className="absolute inset-0 bg-[#0f0f0f]/25" />

        {/* ── Content ── */}
        <div className="relative z-10 text-center w-[94%] sm:w-[92%] lg:w-[85%] max-w-[1120px] mx-auto">
          <AnimatePresence mode="wait">
            {/* Sized off the longest line any slide carries ("of construction
                professionals."), so every headline lands in two lines rather
                than four on a phone. `text-wrap: balance` is the safety net if
                a future slide runs longer still. */}
            <motion.h1
              key={activeIndex}
              className="text-[clamp(1.35rem,6.4vw,1.75rem)] sm:text-[38px] md:text-[48px] lg:text-[64px] font-bold leading-[1.08] tracking-tight [text-wrap:balance]"
              style={{ fontFamily: "'Outfit', sans-serif" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6 }}
            >
              <span className={slide.yellowLine === 1 ? "text-[#ffd716]" : "text-white"}>{slide.line1}</span>
              <br />
              <span className={slide.yellowLine === 2 ? "text-[#ffd716]" : "text-white"}>{slide.line2}</span>
            </motion.h1>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={activeIndex}
              className="mt-5 sm:mt-6 text-white/65 text-[13.5px] sm:text-[15px] md:text-[17px] leading-relaxed max-w-[340px] sm:max-w-[480px] md:max-w-[540px] mx-auto"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, delay: 0.08 }}
            >
              {slide.subcopy}
            </motion.p>
          </AnimatePresence>

          {/* Login/Sign up mean nothing to someone already signed in, so the row
              swaps to the two things they actually came back to do rather than
              disappearing. */}
          <motion.div
            className="mt-8 sm:mt-9 flex flex-row flex-wrap justify-center gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {isSignedIn ? (
              <>
                <Button href="/dashboard/find-professionals" variant="primary" size="sm">
                  Find professionals
                </Button>
                <Button href="/dashboard/jobs" variant="light" size="sm" arrow={false}>
                  Find jobs
                </Button>
              </>
            ) : (
              <>
                <Button href="/login" variant="primary" size="sm">
                  Login
                </Button>
                <Button href="/signup" variant="light" size="sm" arrow={false}>
                  Sign up
                </Button>
              </>
            )}
          </motion.div>
        </div>

        {/* slide dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-6 bg-[#ffd716]" : "w-1.5 bg-white/40"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
