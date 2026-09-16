"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GhostButton, PrimaryButton } from "@/components/ui/modal";
import { AlertTriangle } from "lucide-react";

/**
 * Generic confirm dialog — destructive delete confirms across the app (image 67).
 * Rendered as a small CENTERED dialog (not the app's right slide-over `Modal`,
 * which is for long forms and left short confirms visually clipped at the top
 * of the viewport).
 *
 * Portalled to <body>: callers like the dashboard top bar sit inside sticky /
 * framer-motion-transformed ancestors, and a CSS transform on an ancestor makes
 * it the containing block for `position: fixed` — which pinned the dialog to
 * that bar and clipped it off the top of the screen instead of centring it in
 * the viewport. z-[110] keeps it above slide-over drawers (z-[60]) so a
 * confirm raised from inside a drawer is never buried.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  danger = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.25)] p-6"
          >
            <div className="flex items-start gap-3">
              {danger && (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#fdecec] dark:bg-[#e5484d]/10">
                  <AlertTriangle size={17} className="text-[#e5484d]" />
                </span>
              )}
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{description}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
              {danger ? (
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="rounded-lg bg-[#e5484d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d33a3f] disabled:opacity-60"
                >
                  {loading ? "Working…" : confirmLabel}
                </button>
              ) : (
                <PrimaryButton onClick={onConfirm} disabled={loading}>{loading ? "Working…" : confirmLabel}</PrimaryButton>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
