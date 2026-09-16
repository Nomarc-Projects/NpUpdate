"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, X } from "lucide-react";
import { useCompare, COMPARE_LIMIT } from "@/lib/store/compare";

/**
 * Floating compare tray — appears once a shopper has shortlisted a product via
 * a card's "Compare" action. Shows the picks, lets them be removed, and links
 * through to /exhibition-hub/compare. Reads the persisted zustand store, so it
 * is mounted client-side only (guarded against SSR hydration mismatch).
 */
export function CompareTray() {
  const [mounted, setMounted] = useState(false);
  const items = useCompare((s) => s.items);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-5 z-[70] sm:w-auto"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur px-3 py-2.5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
            <span className="hidden sm:inline-flex items-center gap-1.5 pl-1 text-[12px] font-bold text-[#1e1e1e] dark:text-white">
              <Scale size={14} className="text-[#caa400] dark:text-[#ffd716]" />
              Compare
              <span className="text-[#9a9a9a] font-semibold">{items.length}/{COMPARE_LIMIT}</span>
            </span>

            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {items.map((it) => (
                <div key={it.id} className="relative flex-shrink-0 group/thumb">
                  {it.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.img} alt={it.name} title={it.name} className="w-11 h-11 rounded-xl object-cover border border-[#ececec] dark:border-white/10" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-[#f4f4f4] dark:bg-white/5" />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    aria-label={`Remove ${it.name} from compare`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e] flex items-center justify-center shadow-sm hover:bg-[#e5484d] dark:hover:bg-[#e5484d] dark:hover:text-white transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={clear}
              className="hidden sm:block text-[12px] font-semibold text-[#9a9a9a] hover:text-[#e5484d] transition-colors"
            >
              Clear
            </button>
            <Link
              href="/exhibition-hub/compare"
              className="flex-shrink-0 h-10 px-4 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold inline-flex items-center gap-1.5 hover:bg-[#e6c114] transition-colors"
            >
              Compare <span className="sm:hidden">({items.length})</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
