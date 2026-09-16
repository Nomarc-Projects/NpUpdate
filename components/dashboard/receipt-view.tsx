"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, ArrowRight } from "lucide-react";
import { naira } from "@/lib/entitlements";
import type { TxRow } from "@/lib/services/billing";
import { ReceiptPrinterIntro } from "@/components/ui/receipt-printer";

export function ReceiptView({ tx }: { tx: TxRow }) {
  const [showPrinter, setShowPrinter] = useState(true);

  return (
    <>
      {showPrinter && (
        <ReceiptPrinterIntro
          variant="receipt"
          amountStr={naira(tx.amount)}
          label={`${tx.planLabel} Plan`}
          typeColor="#ffd716"
          onDismiss={() => setShowPrinter(false)}
        />
      )}
    <div className="min-h-[calc(100dvh-3.5rem)] lg:min-h-screen bg-[#f9f9f9] dark:bg-[#161616] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative w-full max-w-[420px] bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.12)] overflow-hidden"
      >
        {/* top */}
        <div className="px-7 pt-9 pb-7 text-center">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-3 text-2xl font-bold text-[#1e1e1e] dark:text-white">Thank you</h1>
          <p className="mt-1.5 text-[13.5px] text-[#9a9a9a]">Your payment has been processed successfully.</p>
        </div>

        {/* perforation */}
        <div className="relative">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f9f9f9] dark:bg-[#161616]" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f9f9f9] dark:bg-[#161616]" />
          <div className="border-t border-dashed border-[#e3e3e3] dark:border-white/15 mx-5" />
        </div>

        {/* details */}
        <div className="px-7 py-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-wide text-[#9a9a9a]">Order ID</p><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white break-all">{tx.reference}</p></div>
            <div className="text-right"><p className="text-[11px] uppercase tracking-wide text-[#9a9a9a]">Amount</p><p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{naira(tx.amount)}</p></div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-wide text-[#9a9a9a]">Plan</p><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white capitalize">{tx.planLabel} · {tx.cycle}</p></div>
            <div className="text-right"><p className="text-[11px] uppercase tracking-wide text-[#9a9a9a]">Date</p><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{tx.date}</p></div>
          </div>
          <div className="rounded-xl bg-[#f5f5f4] dark:bg-white/[0.04] px-4 py-3 flex items-center justify-between">
            <span className="text-[12.5px] text-[#6b6b6b] dark:text-white/60">Paid via</span>
            <span className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white capitalize">{tx.provider}{tx.provider === "demo" ? " · no charge" : ""}</span>
          </div>
        </div>

        {/* actions */}
        <div className="px-7 pb-7 flex flex-col gap-2.5">
          <Link href={`/dashboard/billing/invoice/${tx.id}`} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
            <FileText size={15} /> View invoice
          </Link>
          <Link href="/dashboard" className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">
            Back to dashboard <ArrowRight size={15} />
          </Link>
        </div>
      </motion.div>
    </div>
    </>
  );
}
