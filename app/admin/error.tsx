"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, LayoutGrid, AlertTriangle } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[440px] text-center"
      >
        <div className="relative mx-auto mb-6 w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-[#ffd716]/25 blur-xl" />
          <div className="relative w-16 h-16 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 border border-[#ffd716]/40 flex items-center justify-center">
            <AlertTriangle size={28} className="text-[#caa400]" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#6b6b6b] dark:text-white/60 leading-relaxed">
          We hit a snag loading the admin console. It&apos;s usually temporary — try again, or head back to the overview.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors"
          >
            <RefreshCw size={15} /> Try again
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors"
          >
            <LayoutGrid size={15} /> Admin overview
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
