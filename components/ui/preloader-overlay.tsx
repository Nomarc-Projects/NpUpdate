"use client";

import { motion, AnimatePresence } from "framer-motion";
import { NomarcMark } from "@/components/ui/nomarc-mark";

/**
 * Visual preloader overlay — centred Nomarc mark on a theme-aware background.
 * Adapted from rp-web's PreloaderOverlay.
 *   - `pulse`  → mark scales 1 → 1.08 → 1 in a soft loop.
 *   - `reveal` → mark scales 1 → 22 over `revealMs`; background holds opaque
 *                for ~60% then fades, so the mark clears the viewport before
 *                the page behind shows.
 */
export interface PreloaderOverlayProps {
  visible: boolean;
  phase: "pulse" | "reveal";
  revealMs?: number;
  zIndex?: number;
}

export function PreloaderOverlay({ visible, phase, revealMs = 600, zIndex = 2000 }: PreloaderOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <div
          key="nomarc-preloader-overlay"
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex }}
        >
          <motion.div
            className="absolute inset-0 bg-white dark:bg-[#1e1e1e]"
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === "reveal" ? [1, 1, 0] : 1 }}
            transition={
              phase === "reveal"
                ? { duration: revealMs / 1000, times: [0, 0.6, 1], ease: "easeIn" }
                : { duration: 0 }
            }
          />
          <motion.div
            className="relative text-[#1e1e1e] dark:text-white"
            style={{ width: 72, height: 72, transformOrigin: "center center" }}
            animate={phase === "pulse" ? { scale: [1, 1.08, 1], opacity: 1 } : { scale: 22, opacity: [1, 1, 0] }}
            transition={
              phase === "pulse"
                ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
                : {
                    scale: { duration: revealMs / 1000, ease: [0.6, 0, 0.4, 1] },
                    opacity: { duration: revealMs / 1000, times: [0, 0.7, 1], ease: "easeIn" },
                  }
            }
          >
            {/* auto = colored mark on the white (light) bg, white mark on the
                dark bg → readable in both themes. Yellow-on-white was invisible. */}
            <NomarcMark size={72} tone="auto" className="w-full h-full" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
