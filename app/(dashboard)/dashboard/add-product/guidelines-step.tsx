"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { EXHIBITOR_GUIDELINE_SECTIONS } from "@/components/dashboard/onboarding/exhibitor-onboarding-wizard";
import { acceptExhibitorGuidelines } from "@/lib/services/exhibitor-onboarding";
import { GuideSection, ghostBtn, yellowBtn } from "@/components/dashboard/onboarding/wizard-chrome";

/**
 * Stage 1 of the Showcase Product funnel: the exhibitor guidelines must be
 * accepted before subscription plans are shown. Acceptance is persisted
 * server-side (exhibitor_guideline_acceptance), so the funnel resumes where
 * the user left off after a reload.
 */
export function ExhibitorGuidelinesStep() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!agreed || busy) return;
    setBusy(true);
    try {
      await acceptExhibitorGuidelines();
      toast.success("Guidelines accepted — choose a plan to open your showroom.");
      router.push("/dashboard/plans/exhibitor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record your acceptance");
      setBusy(false);
    }
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-5 sm:px-10 dark:border-white/10">
          <Logo size="sm" tone="auto" />
          <button onClick={() => router.push("/dashboard")} aria-label="Close" className="text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"><X size={20} /></button>
        </div>

        <div className="border-b border-[#f0f0f0] py-7 text-center dark:border-white/10">
          <h1 className="text-[24px] font-bold leading-tight tracking-tight text-[#1e1e1e] dark:text-white">Exhibition Hub<br />Exhibitor Guidelines</h1>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/55">Standards every exhibitor must meet to showcase products on the Hub.</p>
        </div>

        <div className="px-6 py-6 sm:px-10">
          <p className="text-[12px] font-medium text-[#9a9a9a]">Updated July 10, 2026</p>
          <div className="mt-4 space-y-4 text-[13px] leading-relaxed text-[#3d3d3d] dark:text-white/70">
            <p>Welcome to the Nomarc Exhibition Hub. To ensure a secure, transparent, and high-quality marketplace for buyers and exhibitors, all showcase accounts are required to adhere to the following platform standards.</p>
            <p>By listing products after setup and subscription, you agree to maintain these practices.</p>
          </div>

          {EXHIBITOR_GUIDELINE_SECTIONS.map((section) => (
            <GuideSection key={section.title} title={section.title} items={section.items} />
          ))}

          <label className="mt-7 flex items-start gap-2.5 text-[13px] text-[#3d3d3d] dark:text-white/70">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#ffd716]" />
            I have read and agree to abide by the Nomarc Exhibitor Guidelines.
          </label>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button type="button" onClick={() => router.push("/dashboard")} className={ghostBtn}>Cancel</button>
            <button type="button" disabled={!agreed || busy} onClick={() => void accept()} className={yellowBtn}>
              {busy && <Loader2 size={15} className="animate-spin" />}Accept &amp; continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
