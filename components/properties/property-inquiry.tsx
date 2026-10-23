"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { startPropertyInquiry } from "@/lib/services/property-inquiries";

export function PropertyInquiry({ propertyId, ownerUserId }: { propertyId: string; ownerUserId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function send() {
    if (body.trim().length < 2) return toast.error("Write a short message first");
    start(async () => {
      try {
        await startPropertyInquiry(propertyId, body);
        toast.success("Message sent to the lister");
        router.push(`/dashboard/messages?to=${ownerUserId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't send the message");
      }
    });
  }

  return (
    <div className="mt-2">
      {open ? (
        <div className="space-y-2">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi, I'm interested in this property. Is it still available?" className="min-h-24 w-full rounded-xl border border-[#e3e3e3] bg-transparent p-3 text-[12px] outline-none focus:border-[#22c55e] dark:border-white/15" />
          <div className="flex gap-2">
            <button onClick={send} disabled={pending} className="flex-1 rounded-xl bg-[#1e1e1e] py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60 dark:bg-white dark:text-[#1e1e1e]">{pending ? "Sending…" : "Send inquiry"}</button>
            <button onClick={() => setOpen(false)} className="rounded-xl border border-[#e3e3e3] px-3 text-[12px] font-semibold dark:border-white/15">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1e1e1e] text-[12.5px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]"><MessageCircle size={13} /> Message lister</button>
      )}
    </div>
  );
}
