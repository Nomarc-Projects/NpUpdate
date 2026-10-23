"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { reviewPropertyDocument } from "@/lib/services/property-admin";

export function PropertyDocumentReview({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function run(decision: "approve" | "reject") {
    if (decision === "reject" && !note.trim()) return toast.error("Add a reason for rejecting this document");
    start(async () => {
      try {
        await reviewPropertyDocument(id, decision, note);
        toast.success(decision === "approve" ? "Document approved" : "Document rejected");
        setRejecting(false);
        setNote("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't update the document");
      }
    });
  }

  if (status === "approved") return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1f7a3d] dark:text-[#4ade80]"><Check size={12} /> Approved</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b4232a] dark:text-[#f87171]"><X size={12} /> Rejected</span>;

  return (
    <div>
      <div className="flex gap-1.5">
        <button disabled={pending} onClick={() => run("approve")} className="rounded-lg bg-[#1f7a3d] px-2 py-1 text-[10.5px] font-semibold text-white disabled:opacity-60">Approve</button>
        <button disabled={pending} onClick={() => setRejecting((v) => !v)} className="rounded-lg border border-[#e3e3e3] px-2 py-1 text-[10.5px] font-semibold dark:border-white/15">Reject</button>
      </div>
      {rejecting && (
        <div className="mt-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason…" className="h-8 w-full rounded-lg border border-[#e3e3e3] bg-transparent px-2 text-[11px] outline-none dark:border-white/15" />
          <button disabled={pending} onClick={() => run("reject")} className="mt-1 rounded-lg bg-[#b4232a] px-2 py-1 text-[10.5px] font-semibold text-white disabled:opacity-60">Confirm reject</button>
        </div>
      )}
    </div>
  );
}
