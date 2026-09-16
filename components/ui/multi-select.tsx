"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check, X, Plus } from "lucide-react";

/**
 * Multi-select / tag input: chips for chosen values + a searchable dropdown with
 * checkmarks, and optional "Create new" for free-form tags (skills, categories…).
 * On-brand, light/dark, responsive.
 */
export function MultiSelect({ options, value, onChange, placeholder = "Select…", searchPlaceholder = "Search…", allowCreate = false, max, className = "" }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string; searchPlaceholder?: string; allowCreate?: boolean; max?: number; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const all = useMemo(() => Array.from(new Set([...options, ...value])), [options, value]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? all.filter((o) => o.toLowerCase().includes(s)) : all;
  }, [q, all]);
  const canCreate = allowCreate && q.trim() && !all.some((o) => o.toLowerCase() === q.trim().toLowerCase());
  const atMax = max != null && value.length >= max;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = (o: string) => {
    if (value.includes(o)) onChange(value.filter((x) => x !== o));
    else if (!atMax) onChange([...value, o]);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div onClick={() => setOpen(true)} className="min-h-[42px] w-full flex flex-wrap items-center gap-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-2.5 py-1.5 text-sm cursor-text focus-within:border-[#ffd716] transition-colors">
        {value.length === 0 && <span className="text-[#b3b3b3] px-1">{placeholder}</span>}
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border border-[#ffd716]/60 bg-[#fffdf2] dark:bg-[#ffd716]/10 pl-2.5 pr-1.5 py-1 text-[12px] font-medium text-[#1e1e1e] dark:text-white/90">
            {v}
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(v); }} className="text-[#9a9a9a] hover:text-[#e5484d]"><X size={12} /></button>
          </span>
        ))}
        <ChevronDown size={16} className={`text-[#9a9a9a] ml-auto flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {max != null && <p className="mt-1 text-[11px] text-[#b3b3b3]">{value.length}/{max} selected</p>}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-[0_18px_50px_rgba(0,0,0,0.18)] overflow-hidden">
            <div className="p-2 border-b border-[#f0f0f0] dark:border-white/10">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full rounded-lg bg-[#f4f4f4] dark:bg-white/5 pl-8 pr-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none" />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {canCreate && (
                <button type="button" onClick={() => { if (!atMax) { onChange([...value, q.trim()]); setQ(""); } }} className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-left text-[#caa400] font-medium hover:bg-[#f7f7f7] dark:hover:bg-white/5">
                  <Plus size={15} /> Create &ldquo;{q.trim()}&rdquo;
                </button>
              )}
              {filtered.length === 0 && !canCreate ? <p className="px-3.5 py-3 text-[13px] text-[#9a9a9a]">No matches</p> : filtered.map((o) => {
                const sel = value.includes(o);
                return (
                  <button key={o} type="button" onClick={() => toggle(o)} disabled={!sel && atMax}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-[13px] text-left transition-colors disabled:opacity-40 ${sel ? "bg-[#fffdf2] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white font-medium" : "text-[#1e1e1e] dark:text-white/80 hover:bg-[#f7f7f7] dark:hover:bg-white/5"}`}>
                    <span className="truncate">{o}</span>
                    {sel && <Check size={15} className="text-[#caa400] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
