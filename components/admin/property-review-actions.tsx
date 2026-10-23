"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, MessageSquareWarning, X } from "lucide-react";
import { reviewProperty, type ReviewDecision } from "@/lib/services/property-admin";
import { cn } from "@/lib/utils";

export function PropertyReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<ReviewDecision | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function run(decision: ReviewDecision) {
    if ((decision === "reject" || decision === "request_changes") && !note.trim()) {
      toast.error("Add a note explaining what needs to change");
      return;
    }
    start(async () => {
      try {
        await reviewProperty(id, decision, note);
        toast.success(decision === "approve" ? "Approved — the lister can now pay" : decision === "reject" ? "Listing rejected" : "Sent back for changes");
        setMode(null);
        setNote("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't update the listing");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} onClick={() => run("approve")} className="inline-flex items-center gap-1 rounded-lg bg-[#1f7a3d] px-2.5 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60"><Check size={12} /> Approve</button>
        <button disabled={pending} onClick={() => setMode(mode === "request_changes" ? null : "request_changes")} className={cn("inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold disabled:opacity-60", mode === "request_changes" ? "border-[#f59e0b] text-[#a16207]" : "border-[#e3e3e3] text-[#1e1e1e] dark:border-white/15 dark:text-white")}><MessageSquareWarning size={12} /> Request changes</button>
        <button disabled={pending} onClick={() => setMode(mode === "reject" ? null : "reject")} className={cn("inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold disabled:opacity-60", mode === "reject" ? "border-[#e5484d] text-[#b4232a]" : "border-[#e3e3e3] text-[#1e1e1e] dark:border-white/15 dark:text-white")}><X size={12} /> Reject</button>
      </div>
      {(mode === "reject" || mode === "request_changes") && (
        <div className="mt-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "reject" ? "Explain why this listing was rejected…" : "Tell the lister exactly what to fix…"} className="min-h-20 w-full rounded-lg border border-[#e3e3e3] bg-transparent p-2.5 text-[12px] outline-none focus:border-[#22c55e] dark:border-white/15" />
          <button disabled={pending} onClick={() => run(mode)} className="mt-1.5 rounded-lg bg-[#1e1e1e] px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-[#1e1e1e]">
            {pending ? "Saving…" : mode === "reject" ? "Confirm rejection" : "Send back for changes"}
          </button>
        </div>
      )}
    </div>
  );
}
