"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";

/**
 * Gate shown before an unverified exhibitor can upload products (image 73).
 * A trusted-marketplace requirement — routes to KYC to complete business
 * verification. Rendered in place of the add-product form when the company
 * isn't verified yet.
 */
export function VerificationRequired() {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[560px] rounded-2xl border border-[#ececec] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e1e] sm:p-7"
      >
        <button
          onClick={() => router.push("/dashboard")}
          aria-label="Close"
          className="absolute right-5 top-5 text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff7cc] text-[#8a6d00] dark:bg-[#ffd716]/10 dark:text-[#ffd716]">
            <ShieldCheck size={19} />
          </span>
          <h1 className="text-[18px] font-bold text-[#1e1e1e] dark:text-white">Verification Required</h1>
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
          To maintain a trusted marketplace for active buyers, all Exhibitors must complete their
          business verification before uploading products to the catalog. It only takes a few minutes.
        </p>

        <div className="mt-6 flex justify-end">
          <Link
            href="/dashboard/profile?tab=verification"
            className="inline-flex items-center justify-center rounded-lg bg-[#ffd716] px-4 py-2.5 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
          >
            Verify Business Identity
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
