"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 48 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

type BillingKey = "monthly" | "biannually" | "annually";
const billingCycles: { key: BillingKey; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "biannually", label: "Bi-Annually" },
  { key: "annually", label: "Annually" },
];

// Professional pricing — currently unused (only exhibitor tiers render below)
// but kept intact; the dashboard's professional pricing surfaces still read
// from data shaped like this.
const planFeatures = {
  plus: ["Project Management", "Business Template", "Building Permit", "Monthly Industry Report", "AI Consultant"],
  pro: ["Project Management", "Business Template", "Building Permit", "Monthly Industry Report", "AI Consultant", "Verified Professionals", "Competitions"],
  premium: [
    "Project Management",
    "Business Template",
    "Building Permit",
    "Monthly Industry Report",
    "AI Consultant",
    "Verified Professionals",
    "Professional Directory",
    "Competitions & Tenders",
    "BIM Tools",
    "Digital Seal",
  ],
};

const planPricing: Record<BillingKey, { suffix: string; plus: string; pro: string; premium: string }> = {
  monthly: { suffix: "billed monthly", plus: "₦18,000", pro: "₦30,000", premium: "₦45,000" },
  biannually: { suffix: "billed bi-annually", plus: "₦102,600", pro: "₦171,000", premium: "₦256,500" },
  annually: { suffix: "billed annually", plus: "₦194,400", pro: "₦324,000", premium: "₦486,000" },
};

const planTiers = [
  { key: "plus" as const, name: "Plus", blurb: "For individuals and light users", header: "bg-[#f1f1f1] text-[#1e1e1e]", highlight: false },
  { key: "pro" as const, name: "Pro", blurb: "For growing teams and active networkers", header: "bg-[#ffd716] text-[#1e1e1e]", highlight: true },
  { key: "premium" as const, name: "Premium", blurb: "For established firms maximizing their reach", header: "bg-[#1e1e1e] text-white", highlight: false },
];

/* ── Exhibitor plans ── */
const exhibitorTiers = [
  { key: "plus" as const, name: "Directory", access: "Plus Access", blurb: "For individuals and light users", header: "bg-[#f1f1f1] text-[#1e1e1e]", highlight: false },
  { key: "pro" as const, name: "Exhibit", access: "Pro Access", blurb: "For growing teams and active networkers", header: "bg-[#ffd716] text-[#1e1e1e]", highlight: true },
  { key: "premium" as const, name: "Leader", access: "Premium Access", blurb: "For established firms maximizing their reach", header: "bg-[#1e1e1e] text-white", highlight: false },
];
const exhibitorPricing: Record<BillingKey, { suffix: string; plus: string; pro: string; premium: string }> = {
  monthly: { suffix: "billed monthly", plus: "₦60,000", pro: "₦205,000", premium: "₦500,000" },
  biannually: { suffix: "billed bi-annually", plus: "₦342,000", pro: "₦1,168,500", premium: "₦2,850,000" },
  annually: { suffix: "billed annually", plus: "₦648,000", pro: "₦2,214,000", premium: "₦5,400,000" },
};
const exhibitorFeatures = {
  plus: ["1 Product Upload"],
  pro: ["5 Product Uploads", "Data Insight"],
  premium: ["10+ Product Uploads", "HomePage Product Ads", "Data Insight"],
};

/**
 * Pricing section. Pulled off the marketing homepage during the Figma
 * redesign (destined for the exhibitor dashboard instead) but kept intact
 * here, including the unused-on-homepage `planTiers`/`planFeatures`
 * (professional pricing) data, so nothing is lost.
 */
export function PlansSection() {
  const [billing, setBilling] = useState<BillingKey>("monthly");
  // Exhibitor plans only — professional plans were removed from the pricing
  // section (the professional-side tier data is still used by the dashboard).
  const tiers = exhibitorTiers;
  const price = exhibitorPricing[billing];
  const features = exhibitorFeatures;

  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
      <section className="bg-white dark:bg-[#111] py-24 px-6 md:px-10 lg:px-14">
        <div className="text-center max-w-[640px] mx-auto mb-10">
          <h2 className="text-4xl md:text-[42px] font-bold text-[#1e1e1e] dark:text-white tracking-tight">Plans for every need</h2>
          <p className="mt-4 text-[#898989] text-[15px] leading-relaxed">
            Whether you are launching a new product line or scaling your distribution, choose the plan that drives real-time B2B sales
          </p>
        </div>

        {/* billing toggle */}
        <div className="flex flex-col items-center gap-3 mb-12">
          <div className="inline-flex items-center bg-[#f5f5f5] dark:bg-white/5 rounded-full p-1">
            {billingCycles.map((c) => (
              <button
                key={c.key}
                onClick={() => setBilling(c.key)}
                className={`px-6 py-2 rounded-full text-[13.5px] font-semibold transition-all duration-200 ${
                  billing === c.key ? "bg-[#ffd716] text-[#1e1e1e] shadow-sm" : "text-[#898989] hover:text-[#1e1e1e] dark:hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* tiers — re-animate (fade in up) on billing tab switch */}
        <motion.div
          key={billing}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1080px] mx-auto items-start"
        >
          {tiers.map((tier, ti) => (
            <motion.div
              key={tier.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: ti * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden bg-white dark:bg-[#161616] shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
            >
              <div className={`px-6 py-4 font-bold text-lg ${tier.header}`}>
                {tier.name}
                {"access" in tier && (
                  <span className="font-medium text-[13px] opacity-70 ml-1.5">({(tier as { access: string }).access})</span>
                )}
              </div>
              <div className="p-6">
                <p className="text-[13px] text-[#898989] mb-5">{tier.blurb}</p>
                <div className="mb-6">
                  <span className="text-[28px] font-bold text-[#1e1e1e] dark:text-white">{price[tier.key]}</span>
                  <span className="text-[13px] text-[#898989] ml-2">{price.suffix}</span>
                </div>
                {tier.key === "premium" ? (
                  <span
                    aria-disabled
                    className="block text-center w-full py-3 rounded-[6px] text-sm font-bold mb-6 bg-[#f1f1f1] dark:bg-white/10 text-[#9a9a9a] cursor-not-allowed"
                  >
                    Coming soon
                  </span>
                ) : (
                  <Link
                    href={`/signup?plan=${tier.key}&billing=${billing}`}
                    className={`block text-center w-full py-3 rounded-[6px] text-sm font-bold transition-colors mb-6 ${
                      tier.highlight
                        ? "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]"
                        : "border border-[#e0e0e0] dark:border-white/15 text-[#1e1e1e] dark:text-white hover:border-[#1e1e1e] dark:hover:border-white"
                    }`}
                  >
                    Select
                  </Link>
                )}
                <ul className="space-y-3.5">
                  {features[tier.key].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-[#4a4a4a] dark:text-[#c4c4c4]">
                      <Check size={15} className="text-[#898989] flex-shrink-0" strokeWidth={2.4} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </motion.div>
  );
}

// Re-exported so the dashboard (or a future professional-pricing surface)
// can reuse the same tier/feature data instead of redefining it.
export { planTiers, planFeatures, planPricing };
