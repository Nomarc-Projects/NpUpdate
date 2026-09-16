"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";

interface SelectMenuProps {
  options: string[];
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  /** Show a type-to-filter box inside the panel. Auto-enables past
   *  `searchThreshold` options, so long lists (states, occupations) stay usable. */
  searchable?: boolean;
  searchThreshold?: number;
  searchPlaceholder?: string;
}

export function SelectMenu({
  options,
  value,
  placeholder = "Select",
  onChange,
  searchable,
  searchThreshold = 8,
  searchPlaceholder = "Search…",
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(value);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable ?? options.length > searchThreshold;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Reset the filter each time the panel opens, and focus the search box.
  useEffect(() => {
    if (!open) { setQuery(""); return; }
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open, showSearch]);

  const pick = (opt: string) => {
    setSelected(opt);
    onChange?.(opt);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#ffd716] transition-colors"
      >
        <span className={selected ? "text-[#1e1e1e] dark:text-white" : "text-[#b3b3b3]"}>
          {selected ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#9a9a9a] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full rounded-xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_16px_44px_rgba(0,0,0,0.14)] p-1.5 max-h-64 overflow-auto"
          >
            {showSearch && (
              <li className="sticky top-0 z-10 -mt-1.5 mb-1 bg-white pt-1.5 pb-1 dark:bg-[#1e1e1e]">
                <div className="flex items-center gap-2 rounded-lg border border-[#e3e3e3] px-2.5 dark:border-white/15">
                  <Search size={13} className="flex-shrink-0 text-[#9a9a9a]" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full min-w-0 bg-transparent py-2 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:outline-none dark:text-white"
                  />
                </div>
              </li>
            )}
            {!query && (
              <li
                role="option"
                aria-selected={!selected}
                onClick={() => pick("")}
                className="px-3 py-2.5 rounded-lg text-sm text-[#b3b3b3] bg-[#f5f5f5] dark:bg-white/5 cursor-pointer"
              >
                {placeholder}
              </li>
            )}
            {shown.length === 0 && (
              <li className="px-3 py-3 text-center text-[13px] text-[#9a9a9a]">No matches</li>
            )}
            {shown.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={selected === opt}
                onClick={() => pick(opt)}
                className={`px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  selected === opt
                    ? "text-[#1e1e1e] dark:text-white font-medium"
                    : "text-[#4a4a4a] dark:text-white/80 hover:bg-[#f5f5f5] dark:hover:bg-white/10"
                }`}
              >
                {opt}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
