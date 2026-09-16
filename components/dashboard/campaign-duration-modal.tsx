"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Lock } from "lucide-react";
import { Modal, GhostButton } from "@/components/ui/modal";
import { CAMPAIGN_PLANS, naira, type CampaignDuration } from "@/lib/entitlements";
import { startPromotionCheckout } from "@/lib/services/promotion-checkout";
import type { ProviderName } from "@/lib/payments/types";
import { cn } from "@/lib/utils";

const GATEWAYS: { key: ProviderName; name: string; icon: string }[] = [
  { key: "paystack", name: "Paystack", icon: "/payment-icons/paystack.png" },
  { key: "flutterwave", name: "Flutterwave", icon: "/payment-icons/flutterwave.png" },
  { key: "seerbit", name: "SeerBit", icon: "/payment-icons/seerbit.png" },
];

/**
 * Campaign duration → payment, for a promotion that has been composed but not
 * yet paid for.
 *
 * Two steps in one modal because they are one decision: the buyer picks a run
 * length, sees the price, then picks a gateway. Nothing here computes the
 * amount — the server prices the duration, so a tampered client cannot buy a
 * month for a week's money.
 */
export function CampaignDurationModal({
  open, onClose, promotionId, alreadyPaid = false, available = [], onDone,
}: {
  open: boolean;
  onClose: () => void;
  promotionId: string | null;
  /** A rejected ad keeps its credit — resubmission takes no new payment. */
  alreadyPaid?: boolean;
  available?: ProviderName[];
  onDone?: () => void;
}) {
  const [duration, setDuration] = useState<CampaignDuration>("month");
  const [method, setMethod] = useState<ProviderName>(available[0] ?? "flutterwave");
  const [step, setStep] = useState<"duration" | "pay">("duration");
  const [busy, setBusy] = useState(false);
  const canPay = available.length > 0 || alreadyPaid;

  async function go() {
    if (!promotionId) return;
    setBusy(true);
    try {
      const res = await startPromotionCheckout(promotionId, duration, method);
      if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
      toast.success(alreadyPaid ? "Resubmitted for review" : "Payment received — your ad is under review");
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start checkout");
    } finally { setBusy(false); }
  }

  const amount = CAMPAIGN_PLANS[duration].amount;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "duration" ? "Select Campaign Duration" : "Confirm Subscription"}
      maxWidth="max-w-[560px]"
      footer={
        step === "duration" ? (
          <>
            <GhostButton type="button" onClick={onClose}>Back</GhostButton>
            <button
              type="button"
              onClick={() => (alreadyPaid ? go() : setStep("pay"))}
              disabled={busy}
              className="rounded-lg bg-[#ffd716] px-5 py-2.5 text-sm font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-60"
            >
              {busy ? "Working…" : alreadyPaid ? "Resubmit at no extra cost" : "Continue to Payment"}
            </button>
          </>
        ) : (
          <>
            <GhostButton type="button" onClick={() => setStep("duration")}>Cancel</GhostButton>
            <button
              type="button"
              onClick={go}
              disabled={busy || !canPay}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ffd716] px-5 py-2.5 text-sm font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : !canPay ? "Checkout unavailable" : <><Lock size={14} /> Pay Now</>}
            </button>
          </>
        )
      }
    >
      {step === "duration" ? (
        <div>
          <p className="text-[13px] text-[#6b6b6b] dark:text-white/70">Choose how long your ad will run on the platform.</p>
          <p className="mt-1 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
            Your promotion will go live immediately after Admin approval.
          </p>

          <p className="mt-5 text-[12px] font-bold uppercase tracking-wide text-[#9a9a9a]">Pricing categories</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.entries(CAMPAIGN_PLANS) as [CampaignDuration, typeof CAMPAIGN_PLANS[CampaignDuration]][]).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDuration(key)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  duration === key ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.08]" : "border-[#ececec] hover:border-[#ffd716]/60 dark:border-white/10",
                )}
              >
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
                  {p.label} {p.popular && <span className="text-[#8a7400]">(Most Popular)</span>}
                </p>
                <p className="mt-2 text-2xl font-extrabold text-[#1e1e1e] dark:text-white">
                  {naira(p.amount)} <span className="text-[12px] font-medium text-[#9a9a9a]">/ {p.days} days</span>
                </p>
                <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-[#4a4a4a] dark:text-white/70">
                  <Check size={14} className="mt-0.5 flex-shrink-0 text-[#16a34a]" /> {p.blurb}
                </p>
              </button>
            ))}
          </div>

          <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-[#9a9a9a]">
            <Lock size={13} className="mt-0.5 flex-shrink-0" />
            Secure payment guaranteed. If your ad requires edits or is rejected by our admins, your payment will be held as a credit so you can adjust and resubmit at no extra cost.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between rounded-lg bg-[#fafafa] px-4 py-3 text-[13px] dark:bg-white/[0.03]">
            <span className="font-semibold text-[#1e1e1e] dark:text-white">{CAMPAIGN_PLANS[duration].label}</span>
            <span className="text-[#6b6b6b] dark:text-white/60">{naira(amount)} / {CAMPAIGN_PLANS[duration].days} days</span>
          </div>

          <p className="mt-5 text-[12px] font-bold uppercase tracking-wide text-[#9a9a9a]">Select Payment Method</p>
          <div className="mt-2 space-y-2">
            {GATEWAYS.map((g) => {
              const enabled = available.includes(g.key);
              return (
                <button
                  key={g.key}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setMethod(g.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    method === g.key && enabled ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.08]" : "border-[#e3e3e3] dark:border-white/15",
                    !enabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className={cn("flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2", method === g.key && enabled ? "border-[#ffd716] bg-[#ffd716]" : "border-[#d4d4d4] dark:border-white/20")}>
                    {method === g.key && enabled && <Check size={11} strokeWidth={3} className="text-[#1e1e1e]" />}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.icon} alt="" className="h-5 w-auto" />
                  <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{g.name}</span>
                  {!enabled && <span className="ml-auto rounded bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] font-bold text-[#9a9a9a] dark:bg-white/10">Coming soon</span>}
                </button>
              );
            })}
          </div>
          {!canPay && (
            <p className="mt-3 text-[12.5px] text-[#9a9a9a]">
              Checkout is temporarily unavailable — no payment provider is reachable right now.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
