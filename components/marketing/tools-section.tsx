"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 48 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const toolCards = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* document */}
        <path d="M11 4.5h11.2L29 11.4V31a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3Z" fill="#ffd716" />
        <path d="M22.2 4.5 29 11.4h-4.8a2 2 0 0 1-2-2V4.5Z" fill="#d6ad08" />
        <rect x="12.5" y="16" width="11" height="2.4" rx="1.2" fill="#1e1e1e" />
        <rect x="12.5" y="21" width="7.5" height="2.4" rx="1.2" fill="#1e1e1e" />
        {/* gear */}
        <g transform="translate(25.5 26)">
          <path
            d="M0-6.4l1.3.9 1.5-.5.6 1.5 1.6.2-.2 1.6 1 1.3-1 1.3.2 1.6-1.6.2-.6 1.5-1.5-.5L0 6.4l-1.3-.9-1.5.5-.6-1.5-1.6-.2.2-1.6-1-1.3 1-1.3-.2-1.6 1.6-.2.6-1.5 1.5.5L0-6.4Z"
            fill="#1e1e1e"
          />
          <circle r="2.4" fill="#ffd716" />
        </g>
      </svg>
    ),
    title: "Project Management",
    desc: "Foundational tools and templates to construct and execute your projects seamlessly.",
    items: ["Project Management", "Business Templates", "Professional Practice Templates"],
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <line x1="20" y1="13" x2="11" y2="25" stroke="#ffd716" strokeWidth="2.2" />
        <line x1="20" y1="13" x2="28" y2="25" stroke="#ffd716" strokeWidth="2.2" />
        <line x1="20" y1="20" x2="11" y2="25" stroke="#ffd716" strokeWidth="2.2" />
        <line x1="20" y1="20" x2="28" y2="25" stroke="#ffd716" strokeWidth="2.2" />
        <circle cx="20" cy="11.5" r="4.5" fill="#ffd716" />
        <circle cx="20" cy="20" r="3" fill="#ffd716" />
        <circle cx="10.5" cy="26" r="4" fill="#ffd716" />
        <circle cx="28.5" cy="26" r="4" fill="#ffd716" />
      </svg>
    ),
    title: "Career Growth",
    desc: "Build your professional framework, connect with top talent, and secure your industry standing.",
    items: ["Job Board", "Hire Professionals", "AI Assistant"],
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M15 13v-1.6A2.4 2.4 0 0 1 17.4 9h5.2A2.4 2.4 0 0 1 25 11.4V13" stroke="#ffd716" strokeWidth="2.6" strokeLinecap="round" />
        <rect x="7" y="12.5" width="26" height="19" rx="3.2" fill="#ffd716" />
        <rect x="7" y="19" width="26" height="2.6" fill="#d6ad08" />
        <rect x="16.6" y="17.6" width="6.8" height="5" rx="1.4" fill="#1e1e1e" />
      </svg>
    ),
    title: "Network",
    desc: "Connect your practice to a wider ecosystem of industry insights, showcases, and opportunities.",
    items: ["Newsfeed", "Exhibition Hub", "Property Listings"],
  },
];

/**
 * Dark "Tools" grouped-features section. Pulled off the marketing homepage
 * during the Figma redesign (destined for the exhibitor dashboard instead)
 * but kept intact here so nothing is lost.
 */
export function ToolsSection() {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
      <section className="bg-[#1e1e1e] py-24 px-6 md:px-10 lg:px-14">
        {/* top: heading left, description right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14 md:items-end">
          <div>
            <p className="text-[#ffd716] text-[11px] font-bold uppercase tracking-[0.24em] mb-4">Tools</p>
            <h2 className="text-4xl md:text-[44px] lg:text-[48px] font-bold text-white leading-[1.05] tracking-tight">
              Everything you need,
              <br />
              grouped for clarity.
            </h2>
          </div>
          <div className="md:pb-1.5">
            <p className="text-[#9a9a9a] text-[15px] leading-relaxed max-w-[360px] md:ml-auto md:text-right">
              Twelve focused tools, organised into three areas of work, so you spend less time hunting and more time building.
            </p>
          </div>
        </div>

        {/* 3 cards with subtle dividers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {toolCards.map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.015] px-7 py-8 transition-colors duration-300 hover:border-[#ffd716]/40 hover:bg-white/[0.03]"
            >
              <div className="mb-6">{card.icon}</div>
              <h3 className="text-white font-bold text-[19px] mb-2.5">{card.title}</h3>
              <p className="text-[#8c8c8c] text-[13.5px] leading-relaxed mb-7">{card.desc}</p>
              <ul className="space-y-3.5">
                {card.items.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[14px] text-[#d4d4d4]">
                    <ArrowRight size={14} className="text-[#ffd716] flex-shrink-0" strokeWidth={2.4} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
