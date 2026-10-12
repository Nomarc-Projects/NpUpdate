"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, CreditCard, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/theme";
import { naira, planPrice, PLAN_LABEL, type BillingCycle, type ExhibitorPlan } from "@/lib/entitlements";
import { startCheckout } from "@/lib/services/billing";
import { toast } from "sonner";

const MOCK_GATEWAYS = [
  { id: "paystack", name: "Paystack", color: "#00C3F7", desc: "Cards, Bank Transfer, USSD, Mobile Money" },
  { id: "seerbit", name: "SeerBit", color: "#0057FF", desc: "Cards, Bank Transfer, USSD" },
] as const;

export default function MockPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const [step, setStep] = useState<"gateway" | "processing" | "success">("gateway");
  const [selectedGateway, setSelectedGateway] = useState<"paystack" | "seerbit">("paystack");
  const [mounted, setMounted] = useState(false);

  const plan = (searchParams.get("plan") as ExhibitorPlan) || "sme";
  const cycle = (searchParams.get("billing") as BillingCycle) || "monthly";
  const isDark = resolvedTheme === "dark";

  const amount = planPrice(plan, cycle);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleMockPayment() {
    setStep("processing");
    // Simulate payment processing delay
    await new Promise((r) => setTimeout(r, 2000));
    
    // Complete the checkout via the demo path
    try {
      const res = await startCheckout(plan, cycle, selectedGateway as any);
      if (res.demo) {
        setStep("success");
        // Redirect after showing success
        setTimeout(() => router.push("/dashboard/plans/exhibitor"), 1500);
      } else if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        router.push("/dashboard/plans/exhibitor");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
      setStep("gateway");
    }
  }

  if (!mounted) return <div className="min-h-screen flex items-center justify-center" aria-hidden="true" />;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDark ? "bg-[#111] text-white" : "bg-white text-neutral-900"}`}>
      <div className="w-full max-w-md mx-auto py-12">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${isDark ? "bg-neutral-800" : "bg-neutral-100"}`}>
            <CreditCard size={32} className="text-[#ffd716]" />
          </div>
          <h1 className="text-2xl font-bold">Test Payment</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {PLAN_LABEL[plan]} · {cycle === "monthly" ? "Monthly" : cycle === "biannual" ? "Bi-Annual" : "Annual"}
          </p>
        </div>

        {step === "gateway" && (
          <div className="space-y-4">
            <div className="bg-[#fffdf2] dark:bg-[#ffd716]/5 border border-[#ffd716]/30 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-[#8a7400] dark:text-[#ffd716] mb-1">
                {PLAN_LABEL[plan]} Plan
              </p>
              <p className="text-2xl font-extrabold text-[#1e1e1e] dark:text-white">
                {naira(amount)}
              </p>
              <p className="text-xs text-[#8a7400] dark:text-[#ffd716]/80">
                {cycle === "monthly" ? "billed monthly" : cycle === "biannual" ? "billed bi-annually" : "billed annually"}
              </p>
            </div>
            <p className="text-sm text-neutral-500 text-center">
              Select a gateway to simulate payment (Demo Mode)
            </p>
            {MOCK_GATEWAYS.map((gw) => (
              <button
                key={gw.id}
                onClick={() => setSelectedGateway(gw.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedGateway === gw.id
                    ? `border-2 bg-[#ffd716]/10`
                    : isDark
                    ? "border-neutral-700 hover:border-neutral-500"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${gw.color}18` }}>
                  <CreditCard size={18} style={{ color: gw.color }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{gw.name}</div>
                  <div className="text-xs text-neutral-500">{gw.desc}</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedGateway === gw.id ? `border-${gw.color} bg-${gw.color}` : "border-neutral-300 dark:border-neutral-600"
                }`}>
                  {selectedGateway === gw.id && <CheckCircle2 size={10} className="text-white" />}
                </div>
              </button>
            ))}
            <button
              onClick={handleMockPayment}
              className="w-full py-3 rounded-xl bg-[#ffd716] text-neutral-900 font-semibold hover:bg-[#e6c114] transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight size={16} /> Pay {naira(amount)}
            </button>
            <p className="text-xs text-neutral-400 text-center">
              Demo mode — no real payment will be processed
            </p>
          </div>
        )}

        {step === "processing" && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ffd716]/10">
              <Loader2 size={32} className="animate-spin text-[#ffd716]" />
            </div>
            <h3 className="text-lg font-semibold">Processing payment…</h3>
            <p className="text-sm text-neutral-500">Simulating {MOCK_GATEWAYS.find(g => g.id === selectedGateway)?.name} payment</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold">Payment Successful!</h3>
            <p className="text-sm text-neutral-500">Activating your {PLAN_LABEL[plan]} plan…</p>
            <p className="text-xs text-neutral-400">Redirecting to dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}