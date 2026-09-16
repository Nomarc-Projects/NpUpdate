"use client";

import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Compact "Verification Required" dialog (image 102) — gates a specific
 * ACTION (publishing a job, uploading a product) behind Tier-2 identity
 * verification, as opposed to the full-page LockedState which gates an
 * entire SCREEN. Reuses the existing Tier 1/2/3 KYC system (kyc-view.tsx /
 * getKycState) — this is just the trigger dialog pointing at it.
 */
export function VerificationRequiredModal({
  open,
  onClose,
  message = "To maintain a trusted marketplace, users must complete their Tier 2 identity verification before publishing job listings. It only takes a few minutes.",
}: {
  open: boolean;
  onClose: () => void;
  message?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative z-10 w-full max-w-[400px] rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-2xl p-6 text-center"
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white">
              <X size={18} />
            </button>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10">
              <ShieldCheck size={26} className="text-[#caa400]" />
            </div>
            <h2 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">Verification Required</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{message}</p>
            <Link
              href="/dashboard/profile?tab=verification"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#ffd716] px-4 py-2.5 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
            >
              Verify Identity
            </Link>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
