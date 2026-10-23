"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { startPropertyTransaction } from "@/lib/services/property-transactions";

export function PropertyPurchaseButton({ propertyId, existingId }: { propertyId: string; existingId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (existingId) {
    return (
      <Link href="/dashboard/properties/transactions" className="mt-2 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#e3e3e3] text-[12.5px] font-semibold text-[#1e1e1e] dark:border-white/15 dark:text-white">
        <Handshake size={14} /> View purchase request
      </Link>
    );
  }

  async function start() {
    setBusy(true);
    try {
      await startPropertyTransaction(propertyId);
      toast.success("Purchase request recorded");
      router.push("/dashboard/properties/transactions");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start this purchase");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} onClick={start} className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[#e3e3e3] text-[12.5px] font-semibold text-[#1e1e1e] disabled:opacity-60 dark:border-white/15 dark:text-white">
      <Handshake size={14} /> {busy ? "Starting…" : "Request to purchase"}
    </button>
  );
}
