"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Footer actions (e.g. Cancel / Add buttons) */
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = "max-w-[440px]" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Right slide-over: full-height, scrollable body, sticky header/footer (responsive). */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className={`relative h-full w-full ${maxWidth} bg-white dark:bg-[#1e1e1e] shadow-[0_24px_70px_rgba(0,0,0,0.25)] flex flex-col`}
          >
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[#ececec] dark:border-white/10 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{title}</h3>
                {subtitle && <p className="text-[13px] text-[#9a9a9a] mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 hover:text-[#1e1e1e] dark:hover:text-white transition-colors flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#ececec] dark:border-white/10 flex-shrink-0">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* Shared form field helpers used across profile / settings forms */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{label}</label>
        {hint && <span className="text-[11px] text-[#b3b3b3]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors";

export function GhostButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-4 py-2 text-sm font-medium text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/70 dark:hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114] transition-colors"
    >
      {children}
    </button>
  );
}
