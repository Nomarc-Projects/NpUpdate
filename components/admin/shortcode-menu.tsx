"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Braces, ChevronDown } from "lucide-react";
import { SHORTCODES, type Shortcode } from "./email-shortcodes";

/**
 * Merge-tag picker, styled like every other menu in the console.
 *
 * The app's own menu rather than a native <select>: the OS list rendered with a
 * blue system highlight and its own font, which looked nothing like the rest of
 * the console.
 *
 * Shared by the editor toolbar and the CTA designer, so a button's URL can be a
 * merge tag ({{reset_password_url}}) and not only a literal link.
 */
export function ShortcodeMenu({
  onPick,
  items = SHORTCODES,
  label = "Shortcode…",
  align = "left",
}: {
  onPick: (token: string) => void;
  items?: Shortcode[];
  label?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Insert a merge tag"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-md border border-[#e3e3e3] bg-white pl-2 pr-2.5 text-[13px] text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:bg-transparent dark:text-white"
      >
        <Braces size={13} className="text-[#9a9a9a]" />
        {label}
        <ChevronDown size={13} className={`text-[#9a9a9a] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={`absolute top-10 z-[300] w-[290px] overflow-hidden rounded-xl border border-[#ececec] bg-white shadow-xl dark:border-white/10 dark:bg-[#1e1e1e] ${align === "right" ? "right-0" : "left-0"}`}
          >
            {items.map((s) => (
              <button
                key={s.token}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => { onPick(s.token); setOpen(false); }}
                className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2 text-left transition-colors hover:bg-[#fffbe6] dark:hover:bg-white/5"
              >
                <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{s.label}</span>
                <span className="text-[11.5px] text-[#9a9a9a]">{s.hint}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
