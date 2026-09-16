"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check } from "lucide-react";
import { COUNTRIES, flagEmoji, type Country } from "@/lib/countries";

/**
 * Phone input: searchable country-code selector (flag + dial) + national number.
 * onChange returns the combined "<dial> <number>" string. Defaults to Nigeria.
 */
export function PhoneInput({ value = "", onChange, defaultCountry = "NG", placeholder = "(000) 000-0000", className = "" }: {
  value?: string; onChange?: (full: string) => void; defaultCountry?: string; placeholder?: string; className?: string;
}) {
  const [country, setCountry] = useState<Country>(() => COUNTRIES.find((c) => c.iso2 === defaultCountry) ?? COUNTRIES[0]);
  const [num, setNum] = useState(value);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.dial.includes(s)) : COUNTRIES;
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const emit = (c: Country, n: string) => onChange?.(`${c.dial} ${n}`.trim());

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="flex items-stretch rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent focus-within:border-[#ffd716] transition-colors overflow-hidden">
        <button type="button" onClick={() => { setOpen((o) => !o); setQ(""); }} className="flex items-center gap-1.5 pl-3 pr-2 border-r border-[#e3e3e3] dark:border-white/15 text-sm text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">
          <span className="text-base leading-none">{flagEmoji(country.iso2)}</span>
          <span className="text-[13px] text-[#6b6b6b] dark:text-white/70">{country.dial}</span>
          <ChevronDown size={14} className={`text-[#9a9a9a] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <input type="tel" value={num} onChange={(e) => { setNum(e.target.value); emit(country, e.target.value); }} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none" />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-[0_18px_50px_rgba(0,0,0,0.18)] overflow-hidden">
            <div className="p-2 border-b border-[#f0f0f0] dark:border-white/10">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country" className="w-full rounded-lg bg-[#f4f4f4] dark:bg-white/5 pl-8 pr-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none" />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? <p className="px-3.5 py-3 text-[13px] text-[#9a9a9a]">No matches</p> : filtered.map((c) => {
                const sel = c.iso2 === country.iso2;
                return (
                  <button key={c.iso2} type="button" onClick={() => { setCountry(c); setOpen(false); emit(c, num); }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-left transition-colors ${sel ? "bg-[#fffdf2] dark:bg-[#ffd716]/10" : "hover:bg-[#f7f7f7] dark:hover:bg-white/5"}`}>
                    <span className="text-base leading-none">{flagEmoji(c.iso2)}</span>
                    <span className="flex-1 truncate text-[#1e1e1e] dark:text-white/80">{c.name}</span>
                    <span className="text-[#9a9a9a]">{c.dial}</span>
                    {sel && <Check size={14} className="text-[#caa400]" />}
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
