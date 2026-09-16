"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useFloatingChromeHidden } from "@/lib/hooks/use-floating-chrome-hidden";

/**
 * Bottom-right "back to top" button. Appears once the page is scrolled down,
 * scrolls smoothly to the top. Marketing-only (hidden on auth + app), and sits
 * below the menus/sidebars (z-30) so they overlay it.
 */
export function BackToTop() {
  const hidden = useFloatingChromeHidden();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (hidden) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed z-30 bottom-5 right-4 sm:right-5 w-12 h-12 rounded-full bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e] shadow-[0_8px_24px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-[#000] dark:hover:bg-[#f0f0f0] transition-colors"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
