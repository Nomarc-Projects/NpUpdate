"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Collapsible per-held-role accordion — reused across the Account
 * Information, Verification, Email Notifications, Change Email Address and
 * Delete Account tabs to render one section per role the viewer holds
 * (Exhibitor Information / Exhibitor Verification / etc). Defaults open,
 * matching the Figma mockups (every held-role section renders expanded on
 * first load).
 */
export function RoleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-8 pt-6 border-t border-[#f0f0f0] dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{title}</h3>
        <ChevronDown size={18} className={`text-[#9a9a9a] transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
