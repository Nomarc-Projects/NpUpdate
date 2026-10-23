"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reviewListerProfile } from "@/lib/services/property-listers";

export function ListerReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function review(decision: "verify" | "reject") {
    startTransition(async () => {
      try {
        await reviewListerProfile(id, decision, note);
        toast.success(decision === "verify" ? "Lister verified" : "Lister rejected");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update this profile");
      }
    });
  }

  return (
    <div className="mt-3 border-t border-[#f0f0f0] pt-3 dark:border-white/10">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the lister (required to reject)" className="min-h-16 w-full rounded-xl border border-[#e3e3e3] bg-transparent px-3 py-2 text-[12px] outline-none focus:border-[#22c55e] dark:border-white/15" />
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={pending} onClick={() => review("verify")} className="rounded-lg bg-[#1f7a3d] px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60">Verify</button>
        <button type="button" disabled={pending} onClick={() => review("reject")} className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[11.5px] font-semibold text-[#b4232a] disabled:opacity-60 dark:border-white/15">Reject</button>
      </div>
    </div>
  );
}
