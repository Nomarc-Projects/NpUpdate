"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { startPropertyFeeCheckout } from "@/lib/services/property-payments";
import { formatMoney } from "@/lib/properties/pricing";

export function PayListingFee({ propertyId, feeMinor }: { propertyId: string; feeMinor: number | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function pay() {
    start(async () => {
      try {
        const result = await startPropertyFeeCheckout(propertyId);
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }
        toast.success("Payment recorded — your listing is live");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't start the payment");
      }
    });
  }

  return (
    <button onClick={pay} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] px-3 py-2 text-[11.5px] font-bold text-white disabled:opacity-60 dark:bg-white dark:text-[#1e1e1e]">
      <CreditCard size={13} /> {pending ? "Starting…" : `Pay ${feeMinor != null ? formatMoney(feeMinor, "NGN") : "listing fee"} & publish`}
    </button>
  );
}
