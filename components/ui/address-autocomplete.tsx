"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2 } from "lucide-react";

type Suggestion = { display_name: string; lat: string; lon: string; place_id: number };

/**
 * Address / city / country autocomplete via OpenStreetMap Nominatim (free, no
 * key). Debounced; returns the chosen address string (+ optional lat/lon).
 * Respect Nominatim usage policy: debounce + a descriptive UA via Referer.
 */
export function AddressAutocomplete({
  value, onChange, onSelect, placeholder = "Search address, city or country", countryCodes, className = "",
}: {
  value: string; onChange: (v: string) => void;
  onSelect?: (s: { label: string; lat: number; lon: number }) => void;
  placeholder?: string; countryCodes?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skip = useRef(false);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    if (tRef.current) clearTimeout(tRef.current);
    const q = value.trim();
    if (q.length < 3) { setResults([]); setLoading(false); return; }
    setLoading(true);
    tRef.current = setTimeout(async () => {
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", q);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "0");
        url.searchParams.set("limit", "6");
        if (countryCodes) url.searchParams.set("countrycodes", countryCodes);
        const res = await fetch(url.toString(), { headers: { "Accept-Language": "en" } });
        const data: Suggestion[] = await res.json();
        setResults(data); setOpen(true);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 450);
    return () => { if (tRef.current) clearTimeout(tRef.current); };
  }, [value, countryCodes]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent pl-9 pr-9 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors"
        />
        {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a] animate-spin" />}
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            className="absolute z-50 mt-2 w-full rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-[0_18px_50px_rgba(0,0,0,0.18)] overflow-hidden">
            <div className="max-h-64 overflow-y-auto py-1">
              {results.map((r) => (
                <button key={r.place_id} type="button"
                  onClick={() => { skip.current = true; onChange(r.display_name); onSelect?.({ label: r.display_name, lat: +r.lat, lon: +r.lon }); setOpen(false); }}
                  className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#1e1e1e] dark:text-white/80 hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">
                  <MapPin size={14} className="text-[#9a9a9a] mt-0.5 flex-shrink-0" />
                  <span className="leading-snug">{r.display_name}</span>
                </button>
              ))}
            </div>
            <p className="px-3.5 py-1.5 text-[10px] text-[#b3b3b3] border-t border-[#f0f0f0] dark:border-white/10">Powered by OpenStreetMap</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
