"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelAdminPropertyTransaction, completePropertyTransaction } from "@/lib/services/property-transactions";

export function PropertyTransactionActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (status === "completed" || status === "cancelled") return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#f0f0f0] pt-3 dark:border-white/10">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          try {
            const cert = await completePropertyTransaction(id);
            toast.success(`Completed — certificate ${cert} issued`);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not complete");
          }
        })}
        className="rounded-lg bg-[#1f7a3d] px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Working…" : "Mark completed & issue certificate"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          try {
            await cancelAdminPropertyTransaction(id);
            toast.success("Transaction cancelled");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not cancel");
          }
        })}
        className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[11.5px] font-semibold text-[#b4232a] disabled:opacity-60 dark:border-white/15"
      >
        Cancel
      </button>
    </div>
  );
}
