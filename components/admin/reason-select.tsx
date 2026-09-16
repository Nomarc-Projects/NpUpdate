"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Reason = { label: string; description: string };

/**
 * Reject/clarify reason picker used on Verifications and Ad Reviews. A native
 * <select> can't show a description per option, so this renders a listbox —
 * bold label + one-line description — with an "Other (Specify)" free-text
 * reveal at the bottom. `value` is the composed string sent to the server:
 * the reason label, or the free-text when "Other" is chosen.
 */
export function ReasonSelect({
  reasons,
  value,
  onChange,
}: {
  reasons: Reason[];
  value: string;
  onChange: (value: string) => void;
}) {
  const isOther = !reasons.some((r) => r.label === value) ;
  const [otherText, setOtherText] = useState(isOther ? value : "");

  return (
    <div className="space-y-1.5">
      {reasons.map((r) => {
        const selected = value === r.label;
        return (
          <button
            key={r.label}
            type="button"
            onClick={() => onChange(r.label)}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
              selected
                ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]"
                : "border-[#e3e3e3] hover:bg-[#f7f7f7] dark:border-white/15 dark:hover:bg-white/5"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
                selected ? "border-[#ffd716] bg-[#ffd716]" : "border-[#c9c9c9] dark:border-white/25"
              )}
            >
              {selected && <Check size={10} strokeWidth={3.5} className="text-[#1e1e1e]" />}
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{r.label}</span>
              <span className="block text-[12px] leading-relaxed text-[#8a8a8a] dark:text-white/50">{r.description}</span>
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onChange(otherText)}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
          isOther ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]" : "border-[#e3e3e3] hover:bg-[#f7f7f7] dark:border-white/15 dark:hover:bg-white/5"
        )}
      >
        <span className={cn("mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border", isOther ? "border-[#ffd716] bg-[#ffd716]" : "border-[#c9c9c9] dark:border-white/25")}>
          {isOther && <Check size={10} strokeWidth={3.5} className="text-[#1e1e1e]" />}
        </span>
        <span className="block text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Other (Specify)</span>
      </button>
      {isOther && (
        <input
          autoFocus
          value={otherText}
          onChange={(e) => { setOtherText(e.target.value); onChange(e.target.value); }}
          placeholder="Describe the reason…"
          className="ml-7 w-[calc(100%-1.75rem)] rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white"
        />
      )}
    </div>
  );
}
