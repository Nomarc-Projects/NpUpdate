"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Check, ShieldCheck, Lock, Loader2 } from "lucide-react";
import { NomarcMark } from "@/components/ui/nomarc-mark";
import { startCheckout } from "@/lib/services/billing";
import type { ProviderName } from "@/lib/payments/types";
import { planPrice, cycleSaving, isExhibitorPlan, CYCLE_MONTHS, PLAN_LABEL, naira, type Plan, type BillingCycle } from "@/lib/entitlements";
import { exhibitorPlanFeatures } from "@/lib/services/exhibitor-plan-rules";
import { cn } from "@/lib/utils";

export type CheckoutPlan = "plus" | "pro" | "sme" | "exhibitor" | "key_player";

/** Whether a gateway is selectable is decided by the server from its keys —
 *  see `configuredProviders()`. This list is presentation only. */
const GATEWAYS: { key: ProviderName; name: string; desc: string; color: string }[] = [
  { key: "paystack", name: "Paystack", desc: "Cards, bank transfer, USSD, mobile money", color: "#00C3F7" },
  { key: "flutterwave", name: "Flutterwave", desc: "Cards, bank transfer, USSD, mobile money", color: "#F5A623" },
  { key: "seerbit", name: "SeerBit", desc: "Cards, bank transfer, USSD", color: "#0057FF" },
];

const CYCLES: { key: BillingCycle; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "biannual", label: "Bi-annual" },
  { key: "annual", label: "Annual" },
];

const PRO_FEATURES: Record<"plus" | "pro", string[]> = {
  plus: ["Project Management (Asana-style)", "Professional Practice Templates", "AI Consultant", "Monthly Industry Reports", "Faster, priority support"],
  pro: ["Everything in Plus", "Verified Professionals access", "Bids & Competitions", "Priority ranking on applications"],
};

/** Exhibitor bullets come from the entitlement table, so cards can't drift from the caps actually enforced. */
const featuresFor = (plan: CheckoutPlan): string[] =>
  isExhibitorPlan(plan)
    ? ["Digital showroom on the Exhibition Hub", ...exhibitorPlanFeatures(plan), "Quote requests & buyer messaging"]
    : PRO_FEATURES[plan];

function perMonth(plan: Plan, cycle: BillingCycle): string {
  return naira(Math.round(planPrice(plan, cycle) / CYCLE_MONTHS[cycle]));
}

export function CheckoutView({ plan, initialCycle, available = [] }: { plan: CheckoutPlan; initialCycle: BillingCycle; available?: ProviderName[] }) {
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  // Default to a gateway that can actually take the payment, rather than
  // whichever one happens to be listed first.
  const [method, setMethod] = useState<ProviderName>(available[0] ?? "flutterwave");
  const [busy, setBusy] = useState(false);
  const total = planPrice(plan, cycle);
  const canPay = available.length > 0;

  async function subscribe() {
    setBusy(true);
    try {
      const res = await startCheckout(plan, cycle, method);
      if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
      router.push("/dashboard/plans/receipt");
    } catch (e) { setBusy(false); toast.error(e instanceof Error ? e.message : "Couldn't start checkout"); }
  }


  return (
    <div className="min-h-[calc(100dvh-3.5rem)] lg:min-h-screen bg-[#f9f9f9] dark:bg-[#161616] p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="max-w-[1040px] mx-auto rounded-2xl overflow-hidden border border-[#ececec] dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.08)] grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-[#1e1e1e]">

        {/* ── Left: summary ── */}
        <div className="relative bg-[#1e1e1e] text-white p-6 sm:p-8 overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#ffd716]/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <Link href="/dashboard/plans" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors mb-6"><ArrowLeft size={15} /> Back to plans</Link>
            <div className="flex items-center gap-2 mb-5"><NomarcMark size={22} className="text-[#ffd716]" /><span className="text-[13px] font-bold tracking-tight">Nomarc Projects</span></div>
            <h1 className="text-2xl sm:text-[28px] font-bold leading-tight">Activate your Nomarc {PLAN_LABEL[plan]}</h1>
            <p className="text-[13px] text-white/55 mt-2">Unlock the full toolkit in seconds. Cancel anytime.</p>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-[34px] font-bold">{perMonth(plan, cycle)}</span>
              <span className="text-[13px] text-white/55">/ month</span>
            </div>

            {/* cycle toggle */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {CYCLES.map((c) => {
                const save = cycleSaving(plan, c.key);
                return (
                  <button key={c.key} onClick={() => setCycle(c.key)}
                    className={cn("rounded-xl border px-2 py-2.5 text-left transition-colors", cycle === c.key ? "border-[#ffd716] bg-[#ffd716]/10" : "border-white/15 hover:border-white/30")}>
                    <span className="block text-[12px] font-semibold">{c.label}</span>
                    {save > 0 ? <span className="block text-[10px] font-bold text-[#ffd716] mt-0.5">Save {save}%</span> : <span className="block text-[10px] text-white/40 mt-0.5">&nbsp;</span>}
                  </button>
                );
              })}
            </div>

            {/* features */}
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-3">What you'll unlock</p>
              <ul className="space-y-2.5">
                {featuresFor(plan).map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/80">
                    <span className="w-4 h-4 rounded-full bg-[#ffd716] text-[#1e1e1e] flex items-center justify-center flex-shrink-0"><Check size={11} strokeWidth={3} /></span>{f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 pt-5 border-t border-white/10 flex items-center justify-between">
              <span className="text-[13px] text-white/55">Total {cycle !== "monthly" ? `(billed ${cycle === "annual" ? "yearly" : "every 6 months"})` : "(billed monthly)"}</span>
              <span className="text-xl font-bold">{naira(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Right: payment ── */}
        <div className="p-6 sm:p-8">
          <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Payment details</h2>
          <p className="text-[12.5px] text-[#9a9a9a] mt-0.5">Choose how you'd like to pay.</p>

          {/* payment gateway selection */}
          <div className="mt-5 space-y-2.5">
            {GATEWAYS.map((g) => ({ ...g, active: available.includes(g.key) })).map((gw) => (
              <button
                key={gw.key}
                onClick={() => setMethod(gw.key)}
                disabled={!gw.active}
                className={cn(
                  "w-full flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all",
                  method === gw.key
                    ? "border-[#ffd716] bg-[#fff7cc] dark:bg-[#ffd716]/10 shadow-[0_0_0_1px_#ffd716]"
                    : "border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716]/60",
                  !gw.active && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${gw.color}18` }}>
                  <CreditCard size={18} style={{ color: gw.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{gw.name}</span>
                    {!gw.active && <span className="text-[10px] font-bold text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 px-1.5 py-0.5 rounded">Coming soon</span>}
                  </div>
                  <p className="text-[11.5px] text-[#9a9a9a] mt-0.5">{gw.desc}</p>
                </div>
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors", method === gw.key ? "border-[#ffd716] bg-[#ffd716]" : "border-[#d4d4d4] dark:border-white/20")}>
                  {method === gw.key && <Check size={12} className="text-[#1e1e1e]" strokeWidth={3} />}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4">
            <p className="text-[13px] text-[#6b6b6b] dark:text-white/60">
              {canPay ? (
                <>You&apos;ll be redirected to <span className="font-semibold text-[#1e1e1e] dark:text-white capitalize">{method}</span>&apos;s secure checkout to complete your payment. All card details, bank transfers, and USSD are handled directly by them.</>
              ) : (
                <>Checkout is temporarily unavailable — no payment provider is reachable right now. Please try again shortly.</>
              )}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-[13px] text-[#9a9a9a]">Total</span>
            <span className="text-lg font-bold text-[#1e1e1e] dark:text-white">{naira(total)}</span>
          </div>

          <button onClick={subscribe} disabled={busy || !canPay} className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[14px] font-bold hover:bg-[#e6c114] transition-colors disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : !canPay ? "Checkout unavailable" : <><Lock size={15} /> Subscribe · {naira(total)}</>}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-[#9a9a9a]"><ShieldCheck size={13} className="text-[#16a34a]" /> Your payment data is encrypted and handled to the highest standards.</p>
        </div>
      </motion.div>
    </div>
  );
}
