"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Right-docked slide-over panel — the redesign's "Overview" quick-view pattern
 * for detail views (jobs, products, directory records) and long-form content
 * (posting guidelines). Generic: pass a title + any content as children.
 */
export function SlideOverDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClassName = "w-full sm:max-w-[480px]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        // z-[60]: above the dashboard sidebar / mobile nav (z-50) so a drawer
        // always slides over the chrome, but below Modal (z-[100]).
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={cn("relative z-10 flex h-full flex-col bg-white dark:bg-[#1e1e1e] border-l border-[#ececec] dark:border-white/10 shadow-2xl", widthClassName)}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#ececec] px-5 py-4 dark:border-white/10">
              <div className="min-w-0">
                <h2 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[12.5px] text-[#9a9a9a]">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#9a9a9a] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:hover:bg-white/5 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
