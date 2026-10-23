"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markPropertyOutcome } from "@/lib/services/property-listings";

export function PropertyOutcomeActions({ id, kind }: { id: string; kind: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const closeLabel = kind === "rent" ? "Mark rented" : kind === "lease" ? "Mark leased" : "Mark sold";
  const closeStatus = kind === "rent" ? "rented" : kind === "lease" ? "leased" : "sold";

  function run(outcome: "sold" | "leased" | "rented" | "archived") {
    const label = outcome === "archived" ? "archive" : `mark this property ${outcome}`;
    if (!window.confirm(`Are you sure you want to ${label}? This closes the live listing.`)) return;
    startTransition(async () => {
      try {
        await markPropertyOutcome(id, outcome);
        toast.success(outcome === "archived" ? "Listing archived" : `Listing marked ${outcome}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update this listing");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} onClick={() => run(closeStatus)} className="rounded-lg border border-[#e3e3e3] px-2.5 py-1.5 text-[11.5px] font-semibold dark:border-white/15 disabled:opacity-60">
        {pending ? "Updating…" : closeLabel}
      </button>
      <button type="button" disabled={pending} onClick={() => run("archived")} className="rounded-lg border border-[#e3e3e3] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#b4232a] dark:border-white/15 disabled:opacity-60">
        Archive
      </button>
    </div>
  );
}
