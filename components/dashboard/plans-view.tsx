"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Sparkles, Crown, Star, Lock } from "lucide-react";
import { useViewer } from "@/lib/use-viewer";
import { planPrice, cycleSaving, PLAN_LABEL, naira, type Plan, type BillingCycle } from "@/lib/entitlements";
import { exhibitorPlanFeatures } from "@/lib/services/exhibitor-plan-rules";
import { cancelPlan } from "@/lib/services/plans";

const CYCLES: { key: BillingCycle; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "biannual", label: "Bi-annual" },
  { key: "annual", label: "Annual" },
];

type Tier = { plan: Plan; icon: typeof Star; tagline: string; features: string[]; comingSoon?: boolean; popular?: boolean };

const PROFESSIONAL_TIERS: Tier[] = [
  { plan: "free", icon: Star, tagline: "Get started on Nomarc", features: ["Browse & apply to jobs", "Exhibition Hub access", "Professional directory", "AI Assistant (support)", "Your profile, services & reviews"] },
  { plan: "plus", icon: Sparkles, tagline: "Tools to work smarter", features: ["Everything in Free", "Project Management (Asana-style)", "Professional Practice Templates", "AI Consultant", "Monthly Industry Reports"] },
  { plan: "pro", icon: Crown, tagline: "Win more work", features: ["Everything in Plus", "Verified Professionals access", "Bids & Competitions", "Priority ranking on applications"] },
  { plan: "premium", icon: Crown, tagline: "The full Nomarc suite", features: ["Everything in Pro", "Nomarc Digital Seal", "Building Permit tools", "BIM Tools"], comingSoon: true },
];

/** Listing/ad bullets come from the entitlement table so the cards can't
 *  advertise limits different from the ones actually enforced on publish. */
const EXHIBITOR_TIERS: Tier[] = [
  { plan: "sme", icon: Star, tagline: "For small suppliers finding their feet", features: ["Digital showroom on the Exhibition Hub", ...exhibitorPlanFeatures("sme"), "Quote requests & buyer messaging"] },
  { plan: "exhibitor", icon: Sparkles, tagline: "For established suppliers", features: ["Everything in SMEs", ...exhibitorPlanFeatures("exhibitor"), "Commerce analytics"], popular: true },
  { plan: "key_player", icon: Crown, tagline: "For market leaders", features: ["Everything in Exhibitors", ...exhibitorPlanFeatures("key_player"), "Priority placement in buyer searches"] },
];

export function PlansView({ demoMode = false, unavailable = false }: { demoMode?: boolean; unavailable?: boolean }) {
  const viewer = useViewer();
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [busy, setBusy] = useState<Plan | null>(null);
  const current = viewer.plan;
  const isExhibitor = viewer.role === "exhibitor";
  const tiers = isExhibitor ? EXHIBITOR_TIERS : PROFESSIONAL_TIERS;

  async function choose(plan: Plan) {
    if (plan === current) return;
    // Free = downgrade inline; paid = go to the checkout flow (Plans → Checkout → Receipt).
    if (plan === "free") {
      setBusy("free");
      try {
        const res = await cancelPlan(isExhibitor ? "exhibitor" : "professional");
        toast.success(
          res.effective === "immediately"
            ? "Switched to Free"
            : `Downgrade scheduled — you keep your current limits until ${new Date(res.effective).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
        );
        setTimeout(() => window.location.reload(), 1200);
      }
      catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't change plan"); setBusy(null); }
      return;
    }
    router.push(`/dashboard/plans/checkout?plan=${plan}&billing=${cycle}`);
  }

  const priceFor = (plan: Plan) => naira(planPrice(plan, cycle));
  const period = cycle === "monthly" ? "/mo" : cycle === "biannual" ? "/6mo" : "/yr";

  return (
    <div className="px-6 md:px-8 py-8 max-w-[1100px]">
      <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white">Plans & upgrades</h1>
      <p className="text-sm text-[#9a9a9a] mt-1">
        {isExhibitor ? "Grow your showroom as you scale." : "Unlock professional tools as you grow."} You&apos;re on the <span className="font-semibold text-[#1e1e1e] dark:text-white">{PLAN_LABEL[current]}</span> plan.
      </p>

      <div className="mt-6 inline-flex items-center rounded-full bg-[#f0f0f0] dark:bg-white/5 p-1">
        {CYCLES.map((c) => {
          const on = cycle === c.key;
          return (
            <button key={c.key} onClick={() => setCycle(c.key)} className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${on ? "bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-white shadow-sm" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"}`}>
              {c.label}
            </button>
          );
        })}
      </div>

      <div className={`mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 ${isExhibitor ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {tiers.map((t) => {
          const isCurrent = t.plan === current;
          const Icon = t.icon;
          const saving = cycleSaving(t.plan, cycle);
          return (
            <div key={t.plan} className={`rounded-2xl border p-5 flex flex-col ${isCurrent ? "border-[#ffd716] ring-2 ring-[#ffd716]/30" : "border-[#ececec] dark:border-white/10"} bg-white dark:bg-[#1e1e1e]`}>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Icon size={18} /></div>
                {isCurrent && <span className="text-[11px] font-bold text-[#16803c] bg-[#dcfce7] px-2 py-0.5 rounded-full">Current</span>}
                {t.comingSoon && !isCurrent && <span className="text-[11px] font-bold text-[#8a7400] bg-[#ffd716]/20 px-2 py-0.5 rounded-full">Coming soon</span>}
                {t.popular && !isCurrent && !t.comingSoon && <span className="text-[11px] font-bold text-[#8a7400] bg-[#ffd716]/20 px-2 py-0.5 rounded-full">Most Popular</span>}
              </div>
              <h3 className="mt-3 text-lg font-bold text-[#1e1e1e] dark:text-white">{PLAN_LABEL[t.plan]}</h3>
              <p className="text-[12px] text-[#9a9a9a]">{t.tagline}</p>
              <p className="mt-3 text-2xl font-extrabold text-[#1e1e1e] dark:text-white">{priceFor(t.plan)}<span className="text-[13px] font-medium text-[#9a9a9a]">{t.plan === "free" ? "" : period}</span></p>
              {/* Saving is per-tier: the exhibitor ladder discounts unevenly (17–28%), so a single header chip would misprice most cards. */}
              {saving > 0 && <p className="mt-1 text-[11.5px] font-semibold text-[#16803c]">Save {saving}% vs monthly</p>}

              <ul className="mt-4 space-y-2 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#4b4b4b] dark:text-white/70"><Check size={15} className="text-[#16803c] mt-0.5 flex-shrink-0" /> {f}</li>
                ))}
              </ul>

              <button
                disabled={isCurrent || !!t.comingSoon || busy === t.plan}
                onClick={() => choose(t.plan)}
                className={`mt-5 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                  isCurrent ? "bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]"
                  : t.comingSoon ? "bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]"
                  : "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]"
                }`}>
                {busy === t.plan ? "Updating…" : isCurrent ? "Your plan" : t.comingSoon ? <span className="inline-flex items-center gap-1.5"><Lock size={13} /> Coming soon</span> : t.plan === "free" ? "Switch to Free" : `Choose ${PLAN_LABEL[t.plan]}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[12px] text-[#b3b3b3]">
        {demoMode
          ? "No payment gateway is configured on this environment — subscribing unlocks the tier immediately without a charge, so you can try gated features."
          : unavailable
            ? "Checkout is temporarily unavailable. No payment provider is reachable right now — please try again shortly."
            : "You'll be taken to a secure checkout to complete payment. Cancel anytime from Billing & Subscriptions."}
      </p>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function PlansSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-6 md:px-8 py-8 max-w-[1100px]">
      <S cls="h-7 w-44" />
      <S cls="mt-2 h-3.5 w-72 max-w-full" />
      <div className="mt-6 inline-flex items-center rounded-full bg-[#f0f0f0] dark:bg-white/5 p-1 gap-1">
        <S cls="h-8 w-24 rounded-full" /><S cls="h-8 w-24 rounded-full" />
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`rounded-2xl border p-5 sm:p-6 flex flex-col ${i === 0 ? "border-[#ffd716] ring-2 ring-[#ffd716]/30" : "border-[#ececec] dark:border-white/10"} bg-white dark:bg-[#1e1e1e]`}>
            <div className="flex items-center justify-between">
              <S cls="w-9 h-9 rounded-lg" />
              {i === 0 && <S cls="h-5 w-16 rounded-full" />}
            </div>
            <S cls="mt-3 h-5 w-28" />
            <S cls="mt-1.5 h-3 w-36" />
            <div className="mt-3 flex items-baseline gap-1"><S cls="h-8 w-20" /><S cls="h-3 w-14" /></div>
            <ul className="mt-4 space-y-2.5 flex-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <li key={j} className="flex items-center gap-2"><S cls="w-4 h-4 rounded-full flex-shrink-0" /><S cls="h-3 flex-1 max-w-[160px]" /></li>
              ))}
            </ul>
            <S cls="mt-5 h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
