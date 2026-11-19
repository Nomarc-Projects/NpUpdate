"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { acceptCurrentTerms } from "@/lib/services/terms";

export function TermsAcceptanceGate() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const busy = pending || submitting;

  async function onAccept() {
    if (busy) return;
    setSubmitting(true);
    const res = await acceptCurrentTerms();
    if (!res.success) {
      setSubmitting(false);
      toast.error(res.error);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
    // Fallback in case refresh doesn't remount layout quickly enough.
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-gate-title"
        className="w-full max-w-lg rounded-2xl border border-[#ececec] bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1e1e1e] sm:p-7"
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7cc] text-[#9a7b00] dark:bg-[#ffd716]/10 dark:text-[#ffd716]">
          <ShieldCheck size={22} />
        </div>
        <h2 id="terms-gate-title" className="text-[22px] font-bold leading-tight text-[#1e1e1e] dark:text-white">
          Accept our updated Terms to continue
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5f5f5f] dark:text-white/65">
          To keep using Nomarc, please review and accept our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-[#1e1e1e] underline hover:text-black dark:text-white dark:hover:text-white/80">Terms</a>
          {" "}and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#1e1e1e] underline hover:text-black dark:text-white dark:hover:text-white/80">Privacy Policy</a>.
          You need to accept before you can continue.
        </p>
        <p className="mt-3 text-[12.5px] text-[#8a8a8a] dark:text-white/45">
          We&apos;ll save your acceptance (date, time, and terms version) on your account.
        </p>

        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd716] px-4 py-3 text-[14px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#f2ca10] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          I agree to the Terms and Privacy Policy
        </button>
      </div>
    </div>
  );
}
