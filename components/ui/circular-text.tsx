"use client";

import { useEffect } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Text laid out around a circle, spinning continuously. Port of the React Bits
 * CircularText component.
 *
 * Imports from `framer-motion` rather than `motion/react`: the `motion` package
 * is framer-motion v11 under its new name and exports the same API, and this
 * repo already depends on framer-motion. Adding `motion` alongside it would
 * ship two copies of one library.
 */

type HoverBehaviour = "slowDown" | "speedUp" | "pause" | "goBonkers";

const rotationTransition = (duration: number, from: number, loop = true) => ({
  from,
  to: from + 360,
  ease: "linear" as const,
  duration,
  type: "tween" as const,
  repeat: loop ? Infinity : 0,
});

const transitionFor = (duration: number, from: number) => ({
  rotate: rotationTransition(duration, from),
  scale: { type: "spring" as const, damping: 20, stiffness: 300 },
});

export function CircularText({
  text,
  spinDuration = 20,
  onHover = "speedUp",
  className = "",
  fontSize = 24,
}: {
  text: string;
  spinDuration?: number;
  onHover?: HoverBehaviour | null;
  className?: string;
  /** Letter size in px. Drives how far the ring sits from the centre, so it
   *  scales with the container rather than being fixed at the original 24px. */
  fontSize?: number;
}) {
  const letters = Array.from(text);
  const controls = useAnimation();
  const rotation = useMotionValue(0);

  useEffect(() => {
    const start = rotation.get();
    controls.start({
      rotate: start + 360,
      scale: 1,
      transition: transitionFor(spinDuration, start),
    });
  }, [spinDuration, text, onHover, controls, rotation]);

  const handleHoverStart = () => {
    if (!onHover) return;
    const start = rotation.get();
    const spring = { type: "spring" as const, damping: 20, stiffness: 300 };
    // `pause` swaps the linear tween for a spring, so this is a union of two
    // transition shapes rather than one — hence the wider annotation.
    let transition: ReturnType<typeof transitionFor> | { rotate: typeof spring; scale: typeof spring } =
      transitionFor(spinDuration, start);
    let scale = 1;

    switch (onHover) {
      case "slowDown":
        transition = transitionFor(spinDuration * 2, start);
        break;
      case "speedUp":
        transition = transitionFor(spinDuration / 4, start);
        break;
      case "pause":
        transition = { rotate: spring, scale: spring };
        break;
      case "goBonkers":
        transition = transitionFor(spinDuration / 20, start);
        scale = 0.8;
        break;
    }

    controls.start({ rotate: start + 360, scale, transition });
  };

  const handleHoverEnd = () => {
    const start = rotation.get();
    controls.start({
      rotate: start + 360,
      scale: 1,
      transition: transitionFor(spinDuration, start),
    });
  };

  return (
    <motion.div
      className={cn("relative mx-auto rounded-full text-center font-black", className)}
      style={{ rotate: rotation, transformOrigin: "50% 50%" }}
      initial={{ rotate: 0 }}
      animate={controls}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      aria-hidden
    >
      {letters.map((letter, i) => {
        const rotationDeg = (360 / letters.length) * i;
        const factor = Math.PI / letters.length;
        const transform = `rotateZ(${rotationDeg}deg) translate3d(${factor * i}px, ${factor * i}px, 0)`;
        return (
          <span
            key={i}
            className="absolute inset-0 inline-block transition-all duration-500 [transition-timing-function:cubic-bezier(0,0,0,1)]"
            style={{ transform, WebkitTransform: transform, fontSize }}
          >
            {letter}
          </span>
        );
      })}
    </motion.div>
  );
}
