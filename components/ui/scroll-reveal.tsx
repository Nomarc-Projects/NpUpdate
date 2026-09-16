"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/**
 * Word-by-word reveal driven by scroll position. Port of the React Bits
 * ScrollReveal component.
 *
 * Two deliberate changes from the original snippet:
 *
 *  - Cleanup only kills the triggers this instance created. The original calls
 *    `ScrollTrigger.getAll().forEach(t => t.kill())`, which kills every trigger
 *    on the page — with more than one instance mounted, unmounting any one of
 *    them silently freezes the others.
 *  - `trail` renders a second, muted run of words inside the same paragraph, so
 *    the two-tone headings in the design animate as one continuous stagger
 *    instead of two blocks racing each other.
 */
export function ScrollReveal({
  children,
  trail,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = "",
  textClassName = "",
  trailClassName = "",
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
  as: Tag = "h2",
}: {
  children: string;
  trail?: string;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  trailClassName?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  const containerRef = useRef<HTMLElement>(null);

  const split = (text: string, muted: boolean): ReactNode[] =>
    text.split(/(\s+)/).map((word, i) =>
      word.match(/^\s+$/) ? (
        word
      ) : (
        <span className={cn("nm-word inline-block", muted && trailClassName)} key={`${muted ? "t" : "l"}-${i}`}>
          {word}
        </span>
      ),
    );

  const lead = useMemo(() => split(children, false), [children, trailClassName]);
  const tail = useMemo(() => (trail ? split(trail, true) : null), [trail, trailClassName]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Respect a reduced-motion preference: land on the final state, animate nothing.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el.querySelectorAll(".nm-word"), { opacity: 1, filter: "blur(0px)" });
      gsap.set(el, { rotate: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { transformOrigin: "0% 50%", rotate: baseRotation },
        { ease: "none", rotate: 0, scrollTrigger: { trigger: el, start: "top bottom", end: rotationEnd, scrub: true } },
      );

      const words = el.querySelectorAll(".nm-word");

      gsap.fromTo(
        words,
        { opacity: baseOpacity, willChange: "opacity" },
        {
          ease: "none",
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: "top bottom-=20%", end: wordAnimationEnd, scrub: true },
        },
      );

      if (enableBlur) {
        gsap.fromTo(
          words,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: "none",
            filter: "blur(0px)",
            stagger: 0.05,
            scrollTrigger: { trigger: el, start: "top bottom-=20%", end: wordAnimationEnd, scrub: true },
          },
        );
      }
    }, containerRef);

    // Scoped to this instance — see the note above.
    return () => ctx.revert();
  }, [enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength, children, trail]);

  return (
    <Tag ref={containerRef as React.RefObject<HTMLHeadingElement>} className={containerClassName}>
      <span className={cn("block", textClassName)}>
        {lead}
        {tail && <> {tail}</>}
      </span>
    </Tag>
  );
}
