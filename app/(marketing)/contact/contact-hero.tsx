"use client";

import { motion } from "framer-motion";
import { MessageSquare, Send, Headphones } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

function FloatingChip({ icon: Icon, bg, delay = 0 }: { icon: typeof MessageSquare; bg: string; delay?: number }) {
  return (
    <motion.span
      animate={{ y: [6, 0, 6], scale: [0.88, 1, 0.88] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay, times: [0, 0.45, 1] }}
      className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-1 sm:mx-1.5 align-middle flex-shrink-0 ${bg}`}
    >
      <Icon size={20} />
    </motion.span>
  );
}

export function ContactHero() {
  return (
    <section className="pt-20 pb-12 px-6 md:px-10 lg:px-14 text-center">
      <div className="max-w-[1180px] mx-auto">
        <Reveal delay={0.04}>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[1.1] text-[#1e1e1e] dark:text-white max-w-[780px] mx-auto">
            We&apos;d love to{" "}
            <FloatingChip icon={MessageSquare} bg="bg-[#ffd716] text-[#1e1e1e]" delay={0} />
            hear from you.{" "}
            <FloatingChip icon={Send} bg="bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]" delay={0.6} />
            Let&apos;s{" "}
            <FloatingChip icon={Headphones} bg="bg-[#6366f1] text-white" delay={1.2} />
            talk.
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-6 text-[15px] sm:text-[16px] text-[#6b6b6b] dark:text-white/50 max-w-[480px] mx-auto leading-relaxed">
            Whether you have a question about the platform, need support,
            or want to explore partnership opportunities — we&apos;re here to help.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
