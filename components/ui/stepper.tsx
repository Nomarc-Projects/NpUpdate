"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type Step = { label: string; description?: string };

/**
 * Reusable on-brand step indicator. Two layouts:
 *  - horizontal (top): numbered circles + connector lines, for ≤5 steps.
 *  - vertical (left rail): step + label/description, for long sectioned forms.
 * Completed steps are clickable to jump back (via onStepClick).
 */
export function Stepper({ steps, current, onStepClick, orientation = "horizontal", className = "" }: {
  steps: Step[]; current: number; onStepClick?: (i: number) => void; orientation?: "horizontal" | "vertical"; className?: string;
}) {
  const dot = (i: number) => {
    const done = i < current;
    const active = i === current;
    const clickable = done && !!onStepClick;
    return (
      <button type="button" disabled={!clickable} onClick={() => clickable && onStepClick!(i)}
        className={`relative flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-bold flex-shrink-0 transition-colors ${
          done ? "bg-[#ffd716] text-[#1e1e1e]" : active ? "bg-[#1e1e1e] text-white dark:bg-white dark:text-[#1e1e1e] ring-4 ring-[#ffd716]/30" : "bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]"
        } ${clickable ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}>
        {done ? <Check size={15} /> : i + 1}
      </button>
    );
  };

  if (orientation === "vertical") {
    return (
      <ol className={`space-y-1 ${className}`}>
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              {dot(i)}
              {i < steps.length - 1 && <div className={`w-0.5 flex-1 my-1 ${i < current ? "bg-[#ffd716]" : "bg-[#ececec] dark:bg-white/10"}`} />}
            </div>
            <div className={`pb-5 pt-1 ${i === current ? "" : "opacity-70"}`}>
              <p className={`text-sm font-semibold ${i <= current ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a]"}`}>{s.label}</p>
              {s.description && <p className="text-[12px] text-[#9a9a9a] mt-0.5">{s.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((s, i) => (
        <div key={i} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
          <div className="flex flex-col items-center gap-1.5">
            {dot(i)}
            <span className={`text-[11px] font-medium whitespace-nowrap ${i <= current ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a]"}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 -mt-5 rounded-full bg-[#ececec] dark:bg-white/10 overflow-hidden">
              <motion.div className="h-full bg-[#ffd716]" initial={false} animate={{ width: i < current ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Compact "Step X of N" bar — for mobile / collapsed layouts. */
export function StepperCompact({ steps, current, className = "" }: { steps: Step[]; current: number; className?: string }) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{steps[current]?.label}</span>
        <span className="text-[12px] text-[#9a9a9a]">Step {current + 1} of {steps.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
        <motion.div className="h-full rounded-full bg-[#ffd716]" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
      </div>
    </div>
  );
}

/** Headless multi-step controller with per-step validation gating. */
export function useMultiStep(total: number) {
  const [step, setStep] = useState(0);
  const next = useCallback((validate?: () => boolean) => {
    if (validate && !validate()) return false;
    setStep((s) => Math.min(s + 1, total - 1));
    return true;
  }, [total]);
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const goTo = useCallback((i: number) => setStep(() => Math.max(0, Math.min(i, total - 1))), [total]);
  return { step, setStep, next, prev, goTo, isFirst: step === 0, isLast: step === total - 1 };
}
