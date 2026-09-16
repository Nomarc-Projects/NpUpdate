"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CheckCircle2 } from "lucide-react";

export interface Step {
  title: string;
  desc: string;
}
export interface Testimonial {
  quote: string;
  name: string;
}

interface BrandPanelProps {
  images: string[];
  heading: React.ReactNode;
  steps?: Step[];
  testimonials?: Testimonial[];
}

export function BrandPanel({ images, heading, steps, testimonials }: BrandPanelProps) {
  const [idx, setIdx] = useState(0);
  const count = images.length;

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % count), 4500);
    return () => clearInterval(id);
  }, [count]);

  return (
    <div className="relative hidden lg:flex flex-col w-[46%] min-h-screen overflow-hidden bg-[#1e1e1e]">
      {/* rotating background */}
      <AnimatePresence mode="sync">
        <motion.div
          key={idx}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${images[idx]}')` }}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1e1e1e]/35 via-[#1e1e1e]/25 to-[#1e1e1e]/80" />

      {/* content */}
      <div className="relative z-10 flex flex-col h-full p-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Nomarc home">
            <Logo size="sm" tone="yellow" />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col justify-end pb-4">
          <h2 className="text-3xl md:text-[34px] font-bold text-white leading-tight max-w-[420px]">
            {heading}
          </h2>

          {steps && (
            <div className="mt-7 space-y-5 max-w-[420px]">
              {steps.map((s, i) => (
                <motion.div
                  key={s.title}
                  className="flex items-start gap-3.5"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.15 + i * 0.12 }}
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#ffd716] text-[#1e1e1e] text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-white">{s.title}</p>
                    <p className="text-[13px] text-white/65 leading-snug">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {testimonials && (
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="mt-6 max-w-[460px]"
              >
                <p className="text-xl md:text-2xl font-medium text-white leading-snug">
                  {testimonials[idx % testimonials.length].quote}
                </p>
                <p className="mt-4 flex items-center gap-2 text-sm text-white/80">
                  <CheckCircle2 size={15} className="text-[#ffd716]" />
                  <span className="font-semibold text-white">
                    {testimonials[idx % testimonials.length].name}
                  </span>
                  <span className="text-white/50">| Verified user</span>
                </p>
              </motion.div>
            </AnimatePresence>
          )}

          {/* progress dots */}
          <div className="mt-8 flex gap-2.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === idx ? "w-10 bg-white" : "w-8 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
