"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { naira, planPrice, cycleSaving, PLAN_LABEL, type BillingCycle, type ExhibitorPlan } from "@/lib/entitlements";
import { exhibitorPlanFeatures } from "@/lib/services/exhibitor-plan-rules";

const CYCLES: { key: BillingCycle; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "biannual", label: "Bi-Annually" },
  { key: "annual", label: "Annually" },
];

const TIERS: { plan: ExhibitorPlan; popular?: boolean }[] = [
  { plan: "sme" },
  { plan: "exhibitor", popular: true },
  { plan: "key_player" },
];

function getFeatures(plan: ExhibitorPlan): string[] {
  const catCap = plan === "free" ? 0 : ({ sme: 1, exhibitor: 5, key_player: 10 } as Record<ExhibitorPlan, number>)[plan];
  const perCat = plan === "free" ? 0 : 10;
  const total = catCap * perCat;
  const features = [
    `${catCap} categor${catCap === 1 ? "y" : "ies"}`,
    `${total} product uploads`,
  ];
  if (plan === "exhibitor" || plan === "key_player") features.push("Performance Insight");
  if (plan === "key_player") features.push("Monthly Industry Report");
  return features;
}

function getTagline(plan: ExhibitorPlan): string {
  switch (plan) {
    case "sme": return "For small suppliers finding their feet";
    case "exhibitor": return "For growing teams and active networkers";
    case "key_player": return "For established firms maximizing their reach";
    default: return "";
  }
}

export default function ExhibitorPlansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fromUrl = searchParams.get("billing");
    if (fromUrl && (fromUrl === "monthly" || fromUrl === "biannual" || fromUrl === "annual")) {
      setCycle(fromUrl);
    }
  }, [searchParams]);

  const handleCycleChange = (next: BillingCycle) => {
    setCycle(next);
    router.replace(`/dashboard/plans/exhibitor?billing=${next}`, { scroll: false });
  };

  const isDark = resolvedTheme === "dark";

  if (!mounted) return <div className="min-h-screen flex items-center justify-center" aria-hidden="true" />;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDark ? "bg-[#111] text-white" : "bg-white text-neutral-900"}`}>
      <div className="w-full max-w-5xl mx-auto py-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
            Subscription Plan
          </h2>
        </div>

        <div className="flex justify-center mb-12">
          <div className={`inline-flex bg-white border border-neutral-200 rounded-full p-1 shadow-xs ${isDark ? "bg-[#1e1e1e] border-neutral-800" : ""}`}>
            {CYCLES.map((c) => {
              const on = cycle === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => handleCycleChange(c.key)}
                  className={`inline-flex items-center gap-1.5 px-6 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                    on
                      ? "bg-[#FFD400] text-neutral-900"
                      : isDark
                      ? "text-neutral-400 hover:text-white"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((tier) => {
            const plan = tier.plan;
            const price = planPrice(plan, cycle);
            const saving = cycleSaving(plan, cycle);
            const features = getFeatures(plan);
            const isPopular = tier.popular;
            const isKeyPlayer = plan === "key_player";

            const cardBase = "rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200";
            const cardStyles = isPopular
              ? "bg-white border-2 border-[#FFD400] shadow-md relative"
              : isKeyPlayer
              ? "bg-neutral-900 border border-neutral-800 shadow-lg text-white"
              : isDark
              ? "bg-[#1e1e1e] border border-neutral-800 shadow-xs"
              : "bg-white border border-neutral-200 shadow-xs";

            const headerStyles = isPopular
              ? "bg-[#FFD400] p-5 border-b border-[#FFD400]"
              : isKeyPlayer
              ? "bg-[#1C1C1C] p-5 border-b border-neutral-800"
              : isDark
              ? "bg-neutral-800 p-5 border-b border-neutral-700"
              : "bg-neutral-100 p-5 border-b border-neutral-200";

            const titleColor = isKeyPlayer ? "text-[#FFD400]" : "text-neutral-900";
            const subtitleColor = isKeyPlayer ? "text-neutral-400" : isDark ? "text-neutral-500" : "text-neutral-600";
            const featureColor = isKeyPlayer ? "text-neutral-300" : isDark ? "text-neutral-400" : "text-neutral-700";
            const checkColor = isKeyPlayer ? "text-neutral-400" : isDark ? "text-neutral-600" : "text-neutral-800";
            const priceColor = isKeyPlayer ? "text-white" : "text-neutral-900";
            const intervalColor = isKeyPlayer ? "text-neutral-400" : "text-neutral-400";
            const buttonStyles = isPopular
              ? "w-full bg-[#FFD400] hover:bg-[#ebd000] text-neutral-900 font-semibold py-2.5 rounded-xl transition-colors text-xs mb-8 cursor-pointer"
              : isKeyPlayer
              ? "w-full border border-neutral-700 bg-transparent hover:bg-neutral-800 text-white font-semibold py-2.5 rounded-xl transition-colors text-xs mb-8 cursor-pointer"
              : isDark
              ? "w-full border border-neutral-700 hover:bg-neutral-800 text-white font-semibold py-2.5 rounded-xl transition-colors text-xs mb-8 cursor-pointer"
              : "w-full border border-neutral-200 hover:bg-neutral-50 text-neutral-900 font-semibold py-2.5 rounded-xl transition-colors text-xs mb-8 cursor-pointer";

            const badgeColor = isKeyPlayer
              ? "bg-emerald-900/80 text-emerald-300 border border-emerald-700"
              : "bg-emerald-100 text-emerald-800";

            return (
              <div key={plan} className={`${cardBase} ${cardStyles}`}>
                <div className={headerStyles}>
                  <h3 className={`text-lg font-bold ${titleColor}`}>{PLAN_LABEL[plan]}</h3>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <p className={`text-xs mb-3 font-medium ${subtitleColor}`}>{getTagline(plan)}</p>

                    {(cycle === "biannual" || cycle === "annual") && (
                      <div className="mb-2">
                        <span className={`${badgeColor} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
                          {cycle === "annual" ? "2 Months Free" : "1 Month Free"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-1.5 mb-6">
                      <span className={`text-3xl font-extrabold ${priceColor}`}>{naira(price)}</span>
                      <span className={`text-xs ${intervalColor}`}>{cycle === "monthly" ? "billed monthly" : cycle === "biannual" ? "billed bi-annually" : "billed annually"}</span>
                    </div>
                    <button className={buttonStyles}>
                      Pay Now
                    </button>
                  </div>

                  <div className={`border-t pt-6 ${isKeyPlayer ? "border-neutral-800" : isDark ? "border-neutral-800" : "border-neutral-100"}`}>
                    <ul className="space-y-3 text-xs">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <svg className={`w-3.5 h-3.5 ${checkColor}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className={featureColor}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}