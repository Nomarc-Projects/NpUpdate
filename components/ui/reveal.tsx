"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** stagger delay in seconds */
  delay?: number;
  /** travel distance in px */
  y?: number;
  once?: boolean;
}

/**
 * Site-wide scroll-reveal. Fades + lifts content into view once, with a
 * polished spring-like ease. Honours prefers-reduced-motion (renders static).
 * Grounded in the gsap-framer-scroll-animation / ui-animation skills.
 */
export function Reveal({ children, className, delay = 0, y = 22, once = true }: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
