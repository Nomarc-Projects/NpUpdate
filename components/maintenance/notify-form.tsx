"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Loader2 } from "lucide-react";
import { submitLead } from "@/lib/services/crm";

/** Email capture on the under-construction page. Stores into crm_lead with
 *  source "newsletter" so it surfaces in Admin > CRM. */
export function NotifyForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setPending(true);
    try {
      await submitLead({ name: value, email: value, source: "newsletter" });
      toast.success("Thanks! We'll notify you as soon as NomarcProject is live.");
      setEmail("");
    } catch {
      toast.error("Couldn't save that. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-[420px] shrink-0 flex-col gap-2.5 sm:flex-row sm:gap-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        aria-label="Email address"
        className="h-12 w-full flex-1 rounded-xl border border-[#e3e3e3] bg-white px-4 text-[13.5px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white dark:placeholder:text-white/40"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#ffd716] px-5 text-[13.5px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-60"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
        {pending ? "Saving…" : "Notify me"}
      </button>
    </form>
  );
}
