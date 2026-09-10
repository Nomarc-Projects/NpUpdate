"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, CreditCard } from "lucide-react";
import { setPaymentPlans } from "@/lib/services/platform-settings";
import type { PaymentPlansSetting } from "@/lib/services/platform-settings-shared";
import { cn } from "@/lib/utils";

export function PaymentPlansView({ current }: { current: PaymentPlansSetting }) {
  const [enabled, setEnabled] = useState(current.enabled);
  const [pending, start] = useTransition();

  function toggle(v: boolean) {
    setEnabled(v);
    start(async () => {
      try {
        await setPaymentPlans({ enabled: v });
        toast.success(v ? "Plans & upgrades is available again" : "Plans & upgrades hidden");
      } catch {
        setEnabled(!v);
        toast.error("Couldn't save. Check you're still signed in as an admin.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div
        className={cn(
          "rounded-2xl border bg-white p-5 transition-colors dark:bg-[#1e1e1e]",
          enabled
            ? "border-[#22c55e]/50 bg-[#f4fbf5] dark:border-[#22c55e]/30 dark:bg-[#22c55e]/[0.04]"
            : "border-[#ececec] dark:border-white/10",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div
              className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                enabled ? "bg-[#22c55e] text-white" : "bg-[#f5f5f5] text-[#9a9a9a] dark:bg-white/5",
              )}
            >
              <CreditCard size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">
                Payment Plans
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9a9a9a]">
                {enabled
                  ? "The 'Plans & upgrades' entry in Account Settings and the pricing page are live on the dashboard."
                  : "Payment plans are paused. In Account Settings, the 'Plans & upgrades' entry is hidden from everyone."}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggle(!enabled)}
            disabled={pending}
            aria-label={enabled ? "Hide Payment Plans" : "Open Payment Plans to everyone"}
            className={cn(
              "relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors disabled:opacity-60",
              enabled ? "bg-[#22c55e]" : "bg-[#e3e3e3] dark:bg-white/10",
            )}
          >
            <div
              className={cn(
                "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all",
                enabled ? "left-[22px]" : "left-[3px]",
              )}
            />
          </button>
        </div>

        <a
          href="/dashboard/plans"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#22c55e] dark:border-white/15 dark:text-white"
        >
          <ExternalLink size={13} /> Preview plans page
        </a>
      </div>
    </div>
  );
}