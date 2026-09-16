"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, Share2, Briefcase, LayoutGrid, BadgeCheck, FileText, type LucideIcon } from "lucide-react";

type Badge = {
  Icon: LucideIcon;
  tone: "yellow" | "dark";
  label: string; // tooltip text
  tx: number; // final x offset from center (px)
  ty: number; // final y offset from center (px)
};

// Scattered around the headline, left & right — each a distinct tool, with an
// instant (no-delay) tooltip on hover.
const badges: Badge[] = [
  { Icon: FileSearch, tone: "yellow", label: "Find Jobs",          tx: -430, ty: -150 },
  { Icon: Share2,     tone: "dark",   label: "Network",            tx: -480, ty: 20 },
  { Icon: Briefcase,  tone: "yellow", label: "Career Growth",      tx: -360, ty: 155 },
  { Icon: LayoutGrid, tone: "dark",   label: "Project Management", tx: 430,  ty: -120 },
  { Icon: BadgeCheck, tone: "yellow", label: "Verified Profile",   tx: 480,  ty: 20 },
  { Icon: FileText,   tone: "dark",   label: "Business Templates", tx: 400,  ty: 155 },
];

export function ToolsHero() {
  // On phones the desktop scatter (±480px) is off-screen, so shrink the offsets
  // and the badges themselves — the icons then orbit the headline on mobile too.
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const sx = mobile ? 0.34 : 1;
  const sy = mobile ? 0.82 : 1;

  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#111]">
      {/* faint grid behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[420px] opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #f1f1f1 1px, transparent 1px), linear-gradient(to bottom, #f1f1f1 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 75%)",
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-6">
        <div className="relative min-h-[460px] md:min-h-[520px] flex flex-col items-center justify-center text-center">
          {/* floating icon badges — scattered on desktop, scaled-down orbit on mobile */}
          {badges.map((b, i) => {
            const Icon = b.Icon;
            const tx = b.tx * sx;
            const ty = b.ty * sy;
            return (
              <motion.div
                key={i}
                className="flex group absolute left-1/2 top-1/2 -ml-6 -mt-6 w-12 h-12 md:-ml-8 md:-mt-8 md:w-16 md:h-16 rounded-full items-center justify-center shadow-sm cursor-default"
                style={{
                  backgroundColor: b.tone === "yellow" ? "#ffd716" : "#1e1e1e",
                }}
                initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
                animate={{
                  x: tx,
                  y: [ty, ty - 8, ty],
                  scale: 1,
                  opacity: 1,
                  rotate: [0, i % 2 === 0 ? 6 : -6, 0],
                }}
                transition={{
                  x: { duration: 0.9, delay: 1.45 + i * 0.08, ease: [0.22, 1, 0.36, 1] },
                  opacity: { duration: 0.9, delay: 1.45 + i * 0.08 },
                  scale: { duration: 0.9, delay: 1.45 + i * 0.08, ease: [0.22, 1, 0.36, 1] },
                  y: { duration: 3 + i * 0.4, delay: 1.45 + i * 0.08, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                  rotate: { duration: 4 + i * 0.5, delay: 2 + i * 0.1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                }}
              >
                <Icon
                  size={mobile ? 18 : 24}
                  strokeWidth={2}
                  className={b.tone === "yellow" ? "text-[#1e1e1e]" : "text-[#ffd716]"}
                />
                {/* instant tooltip — no delay, fades in on hover */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1e1e1e] dark:bg-white px-2.5 py-1 text-[11px] font-semibold text-white dark:text-[#1e1e1e] opacity-0 scale-95 shadow-md transition-all duration-100 ease-out group-hover:opacity-100 group-hover:scale-100"
                >
                  {b.label}
                </span>
              </motion.div>
            );
          })}

          {/* headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
            className="relative max-w-[760px] text-4xl md:text-6xl font-bold text-[#1e1e1e] dark:text-white leading-[1.08] tracking-tight"
          >
            Focused tools designed to give you an edge.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.3, ease: "easeOut" }}
            className="relative mt-6 max-w-[620px] text-[#898989] text-lg leading-relaxed"
          >
            Everything you need to manage projects, grow your career and stay connected with the construction community.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
