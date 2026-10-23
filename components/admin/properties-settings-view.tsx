"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Building2, ExternalLink } from "lucide-react";
import { setProperties } from "@/lib/services/platform-settings";
import type { PropertiesSetting } from "@/lib/services/platform-settings-shared";
import { minorToMajor, parseMoneyToMinor } from "@/lib/properties/pricing";
import { cn } from "@/lib/utils";
import { Field, inputClass } from "@/components/ui/modal";

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors",
        on ? "bg-[#22c55e]" : "bg-[#e3e3e3] dark:bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

export function PropertiesSettingsView({ current }: { current: PropertiesSetting }) {
  const [enabled, setEnabled] = useState(current.enabled);
  const [approvalRequired, setApprovalRequired] = useState(current.approvalRequired);
  const [duration, setDuration] = useState(String(current.listingDurationDays));
  const [flatFee, setFlatFee] = useState(String(minorToMajor(current.flatListingFeeMinor)));
  const [usd, setUsd] = useState(String(current.fxRates.USD));
  const [gbp, setGbp] = useState(String(current.fxRates.GBP));
  const [sowr, setSowr] = useState(current.sowr);
  const [pending, start] = useTransition();

  function save() {
    const flatMinor = parseMoneyToMinor(flatFee);
    if (flatMinor == null) return toast.error("Enter a valid flat listing fee");
    start(async () => {
      try {
        await setProperties({
          enabled,
          approvalRequired,
          listingDurationDays: Number(duration),
          flatListingFeeMinor: flatMinor,
          fxRates: { USD: Number(usd), GBP: Number(gbp) },
          sowr,
        });
        toast.success("Property settings saved");
      } catch {
        toast.error("Couldn't save. Check you're still signed in as a super admin.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div
        className={cn(
          "rounded-2xl border bg-white p-5 dark:bg-[#1e1e1e]",
          enabled
            ? "border-[#22c55e]/50 bg-[#f4fbf5] dark:border-[#22c55e]/30 dark:bg-[#22c55e]/[0.04]"
            : "border-[#ececec] dark:border-white/10",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", enabled ? "bg-[#22c55e] text-white" : "bg-[#f5f5f5] text-[#9a9a9a] dark:bg-white/5")}>
              <Building2 size={17} />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">Nomarc Projects</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9a9a9a]">
                {enabled
                  ? "The property marketplace is live — the dashboard nav group and public listings are visible."
                  : "The marketplace is locked. The nav group and public property pages are hidden."}
              </p>
            </div>
          </div>
          <Toggle on={enabled} onClick={() => setEnabled((v) => !v)} label="Toggle the property marketplace" />
        </div>
        <a href="/properties" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#22c55e] dark:border-white/15 dark:text-white">
          <ExternalLink size={13} /> Preview marketplace
        </a>
      </div>

      <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">Require admin approval</p>
            <p className="mt-0.5 text-[12.5px] text-[#9a9a9a]">Listings enter the review queue before the lister can pay and publish.</p>
          </div>
          <Toggle on={approvalRequired} onClick={() => setApprovalRequired((v) => !v)} label="Toggle approval requirement" />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Listing duration (days)">
            <input className={inputClass} type="number" min={7} max={365} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="Flat listing fee (₦)" hint="Added to the bracket percentage fee.">
            <input className={inputClass} inputMode="decimal" value={flatFee} onChange={(e) => setFlatFee(e.target.value)} />
          </Field>
          <Field label="USD → NGN rate" hint="Used for display and fee normalisation.">
            <input className={inputClass} type="number" min={1} value={usd} onChange={(e) => setUsd(e.target.value)} />
          </Field>
          <Field label="GBP → NGN rate">
            <input className={inputClass} type="number" min={1} value={gbp} onChange={(e) => setGbp(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
        <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">SOWR program banner</p>
        <p className="mt-0.5 text-[12.5px] text-[#9a9a9a]">Shown on the marketplace and property detail pages.</p>
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Show SOWR banner</span>
            <Toggle on={sowr.enabled} onClick={() => setSowr((s) => ({ ...s, enabled: !s.enabled }))} label="Toggle SOWR banner" />
          </div>
          <Field label="Heading"><input className={inputClass} value={sowr.heading} onChange={(e) => setSowr((s) => ({ ...s, heading: e.target.value }))} /></Field>
          <Field label="Body"><textarea className={cn(inputClass, "min-h-24")} value={sowr.body} onChange={(e) => setSowr((s) => ({ ...s, body: e.target.value }))} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CTA label"><input className={inputClass} value={sowr.ctaLabel} onChange={(e) => setSowr((s) => ({ ...s, ctaLabel: e.target.value }))} /></Field>
            <Field label="CTA link"><input className={inputClass} value={sowr.ctaHref} onChange={(e) => setSowr((s) => ({ ...s, ctaHref: e.target.value }))} /></Field>
          </div>
          <Field label="Image URL"><input className={inputClass} value={sowr.imageUrl} onChange={(e) => setSowr((s) => ({ ...s, imageUrl: e.target.value }))} /></Field>
        </div>
      </div>

      <button onClick={save} disabled={pending} className="rounded-xl bg-[#1e1e1e] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-[#1e1e1e]">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
