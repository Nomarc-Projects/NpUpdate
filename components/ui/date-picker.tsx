"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const WD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Single-date picker (calendar popover) with day / month / year views so any
 * year is reachable in a couple of taps. Controlled: value = "yyyy-mm-dd" | "".
 * On-brand, light/dark, responsive (never wider than the viewport), keyboard
 * dismiss, click-outside close.
 */
export function DatePicker({ value, onChange, placeholder = "Select date", className = "", disabled = false }: {
  value: string; onChange: (iso: string) => void; placeholder?: string; className?: string;
  /** Renders read-only and refuses to open — used where another control makes
   *  a date meaningless (e.g. an "I'm still studying here" checkbox). */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const ref = useRef<HTMLDivElement>(null);
  const base = value ? new Date(value + "T00:00:00") : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // reset to day view whenever closed
  useEffect(() => { if (!open) setMode("days"); }, [open]);

  const first = new Date(view.y, view.m, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayISO = toISO(new Date());
  const moveMonth = (delta: number) => setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const yearStart = view.y - (((view.y % 12) + 12) % 12); // 12-year page start

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-3.5 py-2.5 text-sm text-left focus:outline-none focus:border-[#ffd716] transition-colors disabled:opacity-55 disabled:cursor-not-allowed">
        <Calendar size={15} className="text-[#9a9a9a] flex-shrink-0" />
        <span className={value ? "text-[#1e1e1e] dark:text-white" : "text-[#b3b3b3]"}>{value ? fmt(value) : placeholder}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-[0_18px_50px_rgba(0,0,0,0.18)] p-3">
            {/* header */}
            <div className="flex items-center justify-between px-1 pb-2 gap-1">
              <button type="button" onClick={() => mode === "years" ? setView((v) => ({ ...v, y: v.y - 12 })) : mode === "months" ? setView((v) => ({ ...v, y: v.y - 1 })) : moveMonth(-1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b6b6b] dark:text-white/70 hover:bg-[#f5f5f5] dark:hover:bg-white/5 flex-shrink-0"><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => setMode((m) => (m === "days" ? "months" : m === "months" ? "years" : "days"))}
                className="flex-1 text-sm font-semibold text-[#1e1e1e] dark:text-white hover:text-[#caa400] transition-colors py-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-white/5">
                {mode === "days" && `${MONTHS[view.m]} ${view.y}`}
                {mode === "months" && view.y}
                {mode === "years" && `${yearStart} – ${yearStart + 11}`}
              </button>
              <button type="button" onClick={() => mode === "years" ? setView((v) => ({ ...v, y: v.y + 12 })) : mode === "months" ? setView((v) => ({ ...v, y: v.y + 1 })) : moveMonth(1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b6b6b] dark:text-white/70 hover:bg-[#f5f5f5] dark:hover:bg-white/5 flex-shrink-0"><ChevronRight size={16} /></button>
            </div>

            {/* DAYS */}
            {mode === "days" && (
              <>
                <div className="grid grid-cols-7 text-center text-[11px] font-medium text-[#9a9a9a] mb-1">{WD.map((d) => <span key={d} className="py-1">{d}</span>)}</div>
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((d, i) => {
                    if (d === null) return <span key={i} />;
                    const iso = toISO(new Date(view.y, view.m, d));
                    const selected = iso === value;
                    const isToday = iso === todayISO;
                    return (
                      <button key={i} type="button" onClick={() => { onChange(iso); setOpen(false); }}
                        className={`h-9 rounded-lg text-[13px] transition-colors ${selected ? "bg-[#ffd716] text-[#1e1e1e] font-semibold" : isToday ? "text-[#1e1e1e] dark:text-white font-semibold ring-1 ring-[#ffd716]/50" : "text-[#1e1e1e] dark:text-white/80 hover:bg-[#f5f5f5] dark:hover:bg-white/5"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* MONTHS */}
            {mode === "months" && (
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS_SHORT.map((mo, i) => {
                  const isSel = value && new Date(value + "T00:00:00").getMonth() === i && new Date(value + "T00:00:00").getFullYear() === view.y;
                  return (
                    <button key={mo} type="button" onClick={() => { setView((v) => ({ ...v, m: i })); setMode("days"); }}
                      className={`h-11 rounded-lg text-[13px] font-medium transition-colors ${isSel ? "bg-[#ffd716] text-[#1e1e1e]" : view.m === i ? "ring-1 ring-[#ffd716]/50 text-[#1e1e1e] dark:text-white" : "text-[#1e1e1e] dark:text-white/80 hover:bg-[#f5f5f5] dark:hover:bg-white/5"}`}>
                      {mo}
                    </button>
                  );
                })}
              </div>
            )}

            {/* YEARS */}
            {mode === "years" && (
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => yearStart + i).map((yr) => {
                  const isSel = value && new Date(value + "T00:00:00").getFullYear() === yr;
                  return (
                    <button key={yr} type="button" onClick={() => { setView((v) => ({ ...v, y: yr })); setMode("months"); }}
                      className={`h-11 rounded-lg text-[13px] font-medium transition-colors ${isSel ? "bg-[#ffd716] text-[#1e1e1e]" : view.y === yr ? "ring-1 ring-[#ffd716]/50 text-[#1e1e1e] dark:text-white" : "text-[#1e1e1e] dark:text-white/80 hover:bg-[#f5f5f5] dark:hover:bg-white/5"}`}>
                      {yr}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#f0f0f0] dark:border-white/10">
              <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-[12px] text-[#9a9a9a] hover:text-[#e5484d]">Clear</button>
              <button type="button" onClick={() => { const t = new Date(); onChange(todayISO); setView({ y: t.getFullYear(), m: t.getMonth() }); setMode("days"); }} className="text-[12px] font-medium text-[#1e1e1e] dark:text-white hover:text-[#caa400]">Today</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
