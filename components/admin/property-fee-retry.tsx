"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { retryPropertyFeeAsAdmin } from "@/lib/services/property-payments";

export function PropertyFeeRetry({ reference }: { reference: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        try {
          const result = await retryPropertyFeeAsAdmin(reference);
          toast.success(result === "success" ? "Payment verified and listing published" : result === "failed" ? "Payment failed at the provider" : "Still pending at the provider");
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not verify this payment");
        }
      })}
      className="text-[11.5px] font-semibold text-[#1f7a3d] hover:underline disabled:opacity-60 dark:text-[#4ade80]"
    >
      {pending ? "Verifying…" : "Verify now"}
    </button>
  );
}
