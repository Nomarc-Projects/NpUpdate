"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelMyPropertyTransaction } from "@/lib/services/property-transactions";

export function CancelPurchaseButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        try {
          await cancelMyPropertyTransaction(id);
          toast.success("Purchase request cancelled");
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not cancel");
        }
      })}
      className="text-[11.5px] font-semibold text-[#b4232a] hover:underline disabled:opacity-60"
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}
