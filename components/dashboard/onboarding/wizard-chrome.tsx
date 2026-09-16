"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { r2Url } from "@/lib/r2-public";

const OTP_LEN = 6;
const CRANE_IMG = r2Url("site/photo-1504307651254-35680f356dfd.jpg");

export const yellowBtn =
  "group inline-flex items-center justify-center gap-2 rounded-lg bg-[#ffd716] px-5 py-3 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:cursor-not-allowed disabled:opacity-60";
export const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e3e3e3] px-5 py-3 text-[13.5px] font-medium text-[#1e1e1e] transition-colors hover:bg-[#f7f7f7] dark:border-white/15 dark:text-white dark:hover:bg-white/5";

/** decorative footer (crane band + dark bar) shared by every onboarding step */
export function WizardFooter() {
  return (
    <div className="mt-8">
      <div className="relative h-28 sm:h-36 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CRANE_IMG} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/40 to-transparent dark:from-[#1e1e1e] dark:via-[#1e1e1e]/40" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1e1e1e] px-5 py-3.5 sm:px-8">
        <p className="text-[11.5px] text-white/60">© 2026 Nomarc Data Gig by Nomadic Architect. All rights Reserved.</p>
        <div className="flex items-center gap-4 text-[11.5px] text-white/60">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of service</Link>
        </div>
      </div>
    </div>
  );
}

/** segmented progress bar — `total` segments, steps before `current` are filled */
export function SegmentBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#ececec] dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-[#1e1e1e] dark:bg-white"
            initial={false}
            animate={{ width: i <= current ? "100%" : "0%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      ))}
    </div>
  );
}

export function StepHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[#1e1e1e] dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/55">{subtitle}</p>}
      </div>
      <button onClick={onClose} aria-label="Close" className="mt-0.5 flex-shrink-0 text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white">
        <X size={20} />
      </button>
    </div>
  );
}

/** 6-digit OTP input, auto-advance/backspace/paste handling */
export function OtpBoxes({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length: OTP_LEN }, (_, i) => value[i] ?? "");
  const setAt = (i: number, c: string) => onChange((value.slice(0, i) + c + value.slice(i + 1)).slice(0, OTP_LEN).replace(/\D/g, ""));
  return (
    <div className="flex gap-2 sm:gap-2.5">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={c}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, d);
            if (d && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus(); }}
          onPaste={(e) => {
            e.preventDefault();
            const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
            if (d) { onChange(d); refs.current[Math.min(d.length, OTP_LEN - 1)]?.focus(); }
          }}
          className="h-12 w-11 rounded-xl border border-[#e3e3e3] bg-white text-center text-lg font-bold text-[#1e1e1e] transition-colors focus:border-[#ffd716] focus:outline-none focus:ring-2 focus:ring-[#ffd716]/30 dark:border-white/15 dark:bg-transparent dark:text-white sm:w-12"
        />
      ))}
    </div>
  );
}

export function GuideSection({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="mt-6">
      <h3 className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">{title}</h3>
      <ul className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-[#3d3d3d] dark:text-white/70">
        {items.map(([lead, rest]) => (
          <li key={lead} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" />
            <span><span className="font-semibold text-[#1e1e1e] dark:text-white">{lead}:</span> {rest}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Cancel profile setup?" confirmation, shared by both wizards */
export function CancelSetupDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:pt-24">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="relative w-full max-w-[460px] rounded-2xl border border-[#ececec] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1e1e1e]"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">Cancel profile setup?</h3>
              <button onClick={onCancel} aria-label="Close" className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">If you exit now, your progress will not be saved and you will need to restart the setup process next time.</p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button onClick={onCancel} className={cn("px-4 py-2 text-[13.5px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/70 dark:hover:text-white")}>Continue</button>
              <button onClick={onConfirm} className="rounded-lg bg-[#ffd716] px-4 py-2 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">Yes, Cancel Setup</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
