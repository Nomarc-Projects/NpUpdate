"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; hint?: string; keywords?: string; imageUrl?: string };

/**
 * Single-select with a searchable dropdown. Use anywhere a long option list
 * would be unwieldy (occupations, industries, categories, banks…).
 * On-brand, light/dark, responsive, keyboard (Esc) + click-outside close.
 */
export function SearchableSelect({ options, value, onChange, placeholder = "Select…", searchPlaceholder = "Search…", className = "" }: {
  options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string; searchPlaceholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) =>
      o.label.toLowerCase().includes(s) ||
      o.hint?.toLowerCase().includes(s) ||
      o.keywords?.toLowerCase().includes(s)
    ) : options;
  }, [q, options]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => { setOpen((o) => !o); setQ(""); }} className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e]/80 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#ffd716] transition-colors">
        <span className={cn("flex items-center gap-2 truncate", selected ? "text-[#1e1e1e] dark:text-white" : "text-[#b3b3b3] dark:text-white/40")}>
          {selected?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.imageUrl} alt="" className="w-5 h-5 rounded object-contain flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown size={16} className={`text-[#9a9a9a] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
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
              {filtered.length === 0 ? <p className="px-3.5 py-3 text-[13px] text-[#9a9a9a]">No matches</p> : filtered.map((o) => {
                const sel = o.value === value;
                return (
                  <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-[13px] text-left transition-colors ${sel ? "bg-[#fffdf2] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white font-medium" : "text-[#1e1e1e] dark:text-white/80 hover:bg-[#f7f7f7] dark:hover:bg-white/5"}`}>
                    <span className="flex items-center gap-2.5 truncate">
                      {o.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.imageUrl} alt="" className="w-5 h-5 rounded object-contain flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <span className="truncate">{o.label}{o.hint && <span className="text-[#9a9a9a] ml-1.5">{o.hint}</span>}</span>
                    </span>
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
