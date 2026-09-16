"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme";
import { animateThemeChange } from "@/lib/theme-transition";

/**
 * Pill theme switcher (1:1 with the reference).
 * The icon shows the mode you'll switch TO, and always sits OPPOSITE the knob:
 *   light → blue track,  MOON on the LEFT, white knob on the RIGHT (click → dark)
 *   dark  → slate track, white knob on the LEFT, SUN on the RIGHT  (click → light)
 * Icon = current mode (sun ⇒ dark, moon ⇒ light). Knob slides with a spring;
 * the icon rolls in with a "wheel" spin.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const spring = { type: "spring" as const, stiffness: 700, damping: 24, mass: 0.6 };

  // geometry: 56x32 track, 26px knob, 3px inset
  const knobX = isDark ? 3 : 27; // dark → knob left, light → knob right
  const iconX = isDark ? 29 : 5; // opposite the knob: dark → sun right, light → moon left

  return (
    <button
      type="button"
      onClick={(e) => animateThemeChange(isDark ? "light" : "dark", setTheme, { x: e.clientX, y: e.clientY })}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`relative w-14 h-8 rounded-full overflow-hidden shrink-0 transition-colors duration-500 outline-none focus-visible:ring-2 focus-visible:ring-[#ffd716] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        isDark
          ? "bg-[#38414f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"
          : "bg-[#1e9df5] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]"
      } ${className}`}
    >
      {/* icon — current mode, opposite the knob, rolls in like a wheel */}
      <motion.span
        className="absolute top-0 h-8 w-[22px] flex items-center justify-center pointer-events-none"
        animate={{ x: iconX }}
        transition={spring}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "sun" : "moon"}
            initial={{ rotate: -180, scale: 0.3, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 180, scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 650, damping: 22, mass: 0.5 }}
            className="flex text-white"
          >
            {isDark ? <Sun size={17} /> : <Moon size={16} fill="currentColor" />}
          </motion.span>
        </AnimatePresence>
      </motion.span>

      {/* knob — slides with a spring + a touch of wheel spin */}
      <motion.span
        className="absolute top-[3px] left-0 w-[26px] h-[26px] rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
        animate={{ x: knobX, rotate: isDark ? -180 : 0 }}
        transition={spring}
      />
    </button>
  );
}
