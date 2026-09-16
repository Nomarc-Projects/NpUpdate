"use client";

import Link from "next/link";
import { Gift, Lock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** Where the exhibitor manages their subscription. */
const BILLING_HREF = "/dashboard/settings/account?tab=billing";

/**
 * The two states of the exhibitor upload gate, in one dialog:
 *
 *  - `offer` — they still have their free listing. Explains the 30-day, one
 *    product allowance and lets them either use it or go read the plans.
 *  - `paywall` — the allowance is spent (or the window closed). Only route on
 *    is a subscription.
 *
 * Follows the centered-dialog shape of VerificationRequiredModal rather than
 * `components/ui/modal.tsx`, which is a right-side slide-over — this gates an
 * action mid-flow, so it belongs in the middle of the screen.
 */
export function ExhibitorTrialModal({
  open,
  mode,
  daysLeft,
  onClose,
  onUseFreeListing,
}: {
  open: boolean;
  mode: "offer" | "paywall";
  /** Whole days remaining; only shown in `offer`. */
  daysLeft?: number;
  onClose: () => void;
  /** Proceeds to the wizard. Omitted in `paywall`, where there's nothing to proceed to. */
  onUseFreeListing?: () => void;
}) {
  const isOffer = mode === "offer";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exhibitor-trial-title"
            className="relative z-10 w-full max-w-[520px] rounded-2xl border border-[#ececec] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1e1e1e] sm:p-7"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10">
                {isOffer ? <Gift size={22} /> : <Lock size={22} />}
              </span>
              <h2 id="exhibitor-trial-title" className="text-[19px] font-bold leading-tight text-[#1e1e1e] dark:text-white sm:text-[21px]">
                {isOffer ? "Start Your Free 30-Day Trial" : "Activate subscription plan"}
              </h2>
            </div>

            <p className="mt-4 text-[14px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
              {isOffer
                ? "You can upload one product to your catalog completely free for your first month. Want to upload your full inventory? Select a subscription plan to unlock your platform limits."
                : "Select an exhibitor subscription plan to unlock your digital showroom and enable product uploads."}
            </p>

            {isOffer && typeof daysLeft === "number" && (
              <p className="mt-2 text-[12.5px] font-medium text-[#caa400]">
                {daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial`
                  : "Your free trial has ended"}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href={BILLING_HREF}
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#f5f5f5] dark:text-white dark:hover:bg-white/5"
              >
                View subscription plans
              </Link>
              {isOffer ? (
                <button
                  onClick={onUseFreeListing}
                  className="inline-flex items-center justify-center rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13.5px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
                >
                  Upload Free Product
                </button>
              ) : (
                <Link
                  href={BILLING_HREF}
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13.5px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
                >
                  Activate Subscription
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
