"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

const faqs = [
  {
    q: "What is Nomarc Projects?",
    a: "Nomarc Projects is a digital platform by Nomadic Architects that connects construction professionals and contractors to real job opportunities in Nigeria.\n\nIt's designed to make team-building and project staffing easier, faster, and more professional.",
  },
  {
    q: "Who can use Nomarc Projects?",
    a: "The platform is made for professionals in the built environment: architects, engineers, interior designers, project managers, and especially contractors who can provide teams of skilled workers like masons, painters, and carpenters.",
  },
  {
    q: "Can artisans register directly?",
    a: "No. At this stage, individual artisans like carpenters or electricians cannot register directly. However, they can get work through registered contractors who manage and represent them on the platform.",
  },
  {
    q: "Is it free to join Nomarc Projects?",
    a: "Yes, it's currently free to sign up, create a profile, and browse available jobs. We may add premium features in the future to enhance your experience.",
  },
  {
    q: "Can a professional post a job on Nomarc Projects?",
    a: "Yes. If you're a professional leading a project and need a team (e.g. contractors, designers, engineers), you can post a job and hire from our verified network.",
  },
];

/** Bolds a short lead-in clause before the first colon, if the answer has one
 *  (e.g. "The platform is made for professionals in the built environment:"). */
function FaqAnswer({ text }: { text: string }) {
  const firstLine = text.split("\n")[0];
  const colonIdx = firstLine.indexOf(":");
  if (colonIdx < 0 || colonIdx > 90) return <>{text}</>;
  const lead = firstLine.slice(0, colonIdx + 1);
  const rest = text.slice(lead.length);
  return (
    <>
      <strong className="text-white font-bold">{lead}</strong>
      {rest}
    </>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? -1 : i));

  return (
    <section className="bg-white dark:bg-[#111] py-24 px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e1e1e] dark:text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="mt-3 text-[#898989] text-sm">Everything you need to know about the product.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const open = openIndex === i;
            return (
              <div
                key={faq.q}
                className={`rounded-xl overflow-hidden transition-colors ${
                  open ? "bg-[#1e1e1e]" : "bg-white dark:bg-[#161616] border border-[#ececec] dark:border-white/10"
                }`}
              >
                <button onClick={() => toggle(i)} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left">
                  <span className={`font-bold text-[15px] ${open ? "text-white" : "text-[#1e1e1e] dark:text-white"}`}>{faq.q}</span>
                  {open ? (
                    <Minus size={18} className="text-[#ffd716] flex-shrink-0" strokeWidth={2.4} />
                  ) : (
                    <Plus size={18} className="text-[#898989] flex-shrink-0" strokeWidth={2.4} />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-[13.5px] text-white/70 leading-relaxed whitespace-pre-line">
                        <FaqAnswer text={faq.a} />
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
