"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, User, Briefcase, Package, CreditCard, ShieldCheck, ChevronDown,
  type LucideIcon,
} from "lucide-react";

type FAQ = { q: string; a: string };
type Category = {
  icon: LucideIcon;
  label: string;
  body: string;
  color: string;
  faqs: FAQ[];
};

const CATEGORIES: Category[] = [
  {
    icon: BookOpen,
    label: "Getting Started",
    body: "Everything you need to get set up and start using Nomarc.",
    color: "bg-[#dcfce7] dark:bg-[#22c55e]/15 text-[#16803c] dark:text-[#4ade80]",
    faqs: [
      {
        q: "How do I create a Nomarc account?",
        a: "Click Sign Up at the top of any page, choose your account type (Professional or Exhibitor), fill in your details and verify your email. Setup takes under 2 minutes.",
      },
      {
        q: "What types of accounts are available?",
        a: "Nomarc has three user types — Professionals (architects, engineers, quantity surveyors, PMs), Exhibitors (material suppliers and brands), and Clients/Buyers (developers and hirers).",
      },
      {
        q: "How do I complete my profile?",
        a: "After signing in, go to Dashboard → Profile. Add your bio, skills, certifications, portfolio and a profile photo. A complete profile receives 3× more client enquiries.",
      },
      {
        q: "What is the Nomarc digital seal?",
        a: "The Nomarc Digital Seal is awarded after KYC verification. It confirms your identity and professional credentials to any client or employer browsing the platform.",
      },
    ],
  },
  {
    icon: User,
    label: "Profile & Verification",
    body: "Edit your profile, upload documents, and earn your digital seal.",
    color: "bg-[#fce8e8] dark:bg-[#e5484d]/15 text-[#e5484d] dark:text-[#f87171]",
    faqs: [
      {
        q: "What documents are required for KYC?",
        a: "You need a government-issued ID (NIN slip, international passport, or driver's licence) plus at least one professional credential — ARCON licence, COREN certificate, NIA membership card, etc.",
      },
      {
        q: "How long does verification take?",
        a: "Our admin team reviews submissions within 24–48 business hours. You'll receive an email notification once your seal is approved or if we need additional documents.",
      },
      {
        q: "Can I update my profile after verification?",
        a: "Yes — your bio, portfolio, skills and contact info can be updated at any time. Significant changes to professional credentials may trigger a brief re-review.",
      },
      {
        q: "What does a verified badge look like on my profile?",
        a: "Verified professionals display a yellow ✦ Nomarc Seal badge prominently on their public profile, visible to every client or employer who views it.",
      },
    ],
  },
  {
    icon: Briefcase,
    label: "Jobs & Hiring",
    body: "Post jobs, apply to roles, and manage your pipeline.",
    color: "bg-[#e0e7ff] dark:bg-[#6366f1]/20 text-[#6366f1] dark:text-[#818cf8]",
    faqs: [
      {
        q: "How do I post a job?",
        a: "Go to Dashboard → Jobs → Post a Job. Fill in the role title, description, location, budget range and deadline, then publish. Your listing goes live instantly.",
      },
      {
        q: "How do I apply for a job?",
        a: "Browse the Job Board, click any listing, and hit Apply. Include a short cover note — your profile is automatically attached to the application.",
      },
      {
        q: "Can I save jobs to look at later?",
        a: "Yes — click the bookmark icon on any job card to save it. Find all saved jobs under Dashboard → Saved Jobs.",
      },
      {
        q: "How do I hire a professional directly?",
        a: "Use the Professional Directory to search by occupation, location, experience level and verification status. Click any profile to view their work and send a direct hiring enquiry.",
      },
    ],
  },
  {
    icon: Package,
    label: "Products & Orders",
    body: "List products, respond to RFQs, and manage orders.",
    color: "bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#caa400] dark:text-[#ffd716]",
    faqs: [
      {
        q: "How do I list a product as an Exhibitor?",
        a: "Go to Dashboard → Products → Add New Product. Enter the product name, description, technical specifications, pricing and upload high-quality images. Publish when ready.",
      },
      {
        q: "What is an RFQ?",
        a: "A Request for Quotation (RFQ) is sent by a buyer asking for your pricing on specific products or quantities. You'll receive a notification and can respond directly from your dashboard.",
      },
      {
        q: "How are orders tracked?",
        a: "All orders appear in Dashboard → Orders with real-time status (pending, confirmed, shipped, completed). You can message buyers and update status from the same view.",
      },
      {
        q: "What image formats and sizes are supported?",
        a: "JPG, PNG and WebP files up to 10 MB per image. You can upload up to 8 images per product listing for maximum visibility.",
      },
    ],
  },
  {
    icon: CreditCard,
    label: "Payments & Billing",
    body: "Manage your plan, invoices, and payout settings.",
    color: "bg-[#f3e8ff] dark:bg-[#9333ea]/15 text-[#9333ea] dark:text-[#c084fc]",
    faqs: [
      {
        q: "What subscription plans does Nomarc offer?",
        a: "Nomarc offers a Free plan (core features), a Professional plan (enhanced visibility and tools), and an Enterprise plan (custom seats and analytics). All plans include marketplace access.",
      },
      {
        q: "How do I upgrade or change my plan?",
        a: "Go to Dashboard → Settings → Billing, select your desired plan and complete payment. Upgrades take effect immediately; downgrades apply at the end of your billing cycle.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept card payments, bank transfer and USSD via Paystack. All transactions are in Nigerian Naira (₦). Annual plans may be paid by direct bank transfer.",
      },
      {
        q: "How do wallet payouts work?",
        a: "Earnings from platform transactions are held in your Nomarc Wallet. Withdraw to any Nigerian bank account at any time from Dashboard → Wallet → Withdraw. Payouts arrive within 1–2 business days.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    label: "Account & Privacy",
    body: "Update credentials, manage sessions, and control your data.",
    color: "bg-[#e0f2fe] dark:bg-[#0369a1]/15 text-[#0369a1] dark:text-[#38bdf8]",
    faqs: [
      {
        q: "How do I change my password?",
        a: "Go to Dashboard → Settings → Security. Enter your current password, then choose a new one. You can also reset via the Forgot Password link on the login page.",
      },
      {
        q: "Who can see my profile?",
        a: "Your public profile (name, occupation, bio, portfolio) is visible to all signed-in users. Your private contact details are only shared after a mutual connection or direct hiring enquiry.",
      },
      {
        q: "How is my personal data stored?",
        a: "All data is encrypted at rest and in transit using industry-standard TLS. We store data on secure cloud infrastructure and never sell personal information to third parties.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Dashboard → Settings → Account → Danger Zone and follow the deletion steps. Account deletion permanently removes your profile, listings and data. This action cannot be undone.",
      },
    ],
  },
];

export function ContactHelp() {
  const [active, setActive]   = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function selectCategory(i: number) {
    if (active === i) {
      setActive(null);
      setOpenFaq(null);
    } else {
      setActive(i);
      setOpenFaq(null);
    }
  }

  return (
    <div>
      {/* ── Category cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => selectCategory(i)}
            className={[
              "text-left rounded-2xl border p-5 transition-all duration-200",
              active === i
                ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] shadow-sm"
                : "border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] hover:border-[#ffd716] hover:shadow-sm",
            ].join(" ")}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={19} />
            </div>
            <p className={[
              "text-[13.5px] font-bold transition-colors",
              active === i ? "text-[#caa400] dark:text-[#ffd716]" : "text-[#1e1e1e] dark:text-white",
            ].join(" ")}>
              {c.label}
            </p>
            <p className="mt-1 text-[12.5px] text-[#9a9a9a] leading-relaxed">{c.body}</p>
          </button>
        ))}
      </div>

      {/* ── FAQ panel ── */}
      <AnimatePresence mode="wait">
        {active !== null && (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden"
          >
            {/* panel header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f0f0] dark:border-white/5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${CATEGORIES[active].color}`}>
                {(() => { const Icon = CATEGORIES[active].icon; return <Icon size={16} />; })()}
              </div>
              <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{CATEGORIES[active].label}</p>
              <p className="text-[12px] text-[#9a9a9a] hidden sm:block">— quick answers</p>
            </div>

            {/* FAQ accordion */}
            <div className="divide-y divide-[#f0f0f0] dark:divide-white/5">
              {CATEGORIES[active].faqs.map((faq, i) => (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white leading-snug">
                      {faq.q}
                    </span>
                    <motion.span
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      <ChevronDown size={15} className="text-[#9a9a9a]" />
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* footer nudge */}
            <div className="px-5 py-3 border-t border-[#f0f0f0] dark:border-white/5 bg-[#fafafa] dark:bg-white/[0.02]">
              <p className="text-[12px] text-[#9a9a9a]">
                Still need help?{" "}
                <span className="text-[#caa400] dark:text-[#ffd716] font-semibold">Fill out the form below</span>{" "}
                and we&apos;ll get back to you within a few hours.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
