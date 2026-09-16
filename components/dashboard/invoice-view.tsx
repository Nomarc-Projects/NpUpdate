"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { NomarcMark } from "@/components/ui/nomarc-mark";
import { naira } from "@/lib/entitlements";
import { CLIENT_SITE_ORIGIN } from "@/lib/site-url";
import type { TxRow } from "@/lib/services/billing";
import { ReceiptPrinterIntro } from "@/components/ui/receipt-printer";
import { BrandedQR } from "@/components/ui/qr-code";

const CYCLE_LABEL: Record<string, string> = { monthly: "Monthly", biannual: "Bi-annual (6 months)", annual: "Annual (12 months)" };

export function InvoiceView({ tx, billedTo }: { tx: TxRow; billedTo: { name: string; email: string } }) {
  const [showPrinter, setShowPrinter] = useState(true);
  const invoiceNo = `INV-${tx.reference.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
  const statusTone = tx.status === "success" ? "text-[#16a34a]" : tx.status === "failed" ? "text-[#e5484d]" : "text-[#92400e]";
  const invoiceUrl = `${CLIENT_SITE_ORIGIN}/dashboard/billing/invoice/${tx.id}`;

  return (
    <>
      {showPrinter && (
        <ReceiptPrinterIntro
          variant="invoice"
          amountStr={naira(tx.amount)}
          label={invoiceNo}
          typeColor="#ffd716"
          onDismiss={() => setShowPrinter(false)}
        />
      )}
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[820px] mx-auto">
      {/* toolbar (hidden when printing) */}
      <div className="flex items-center justify-between gap-3 mb-5 print:hidden">
        <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white"><ArrowLeft size={16} /> Back to billing</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors"><Printer size={15} /> Print / Download</button>
      </div>

      {/* invoice sheet */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-6 sm:p-10 print:border-0 print:shadow-none">
        {/* header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white">Invoice</h1>
            <p className="text-[13px] text-[#9a9a9a] mt-1">{invoiceNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <NomarcMark size={26} className="text-[#1e1e1e] dark:text-white" />
            <span className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Nomarc Projects</span>
          </div>
        </div>

        {/* parties + dates */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#9a9a9a] mb-1">Billed to</p>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{billedTo.name || "Nomarc member"}</p>
            {billedTo.email && <p className="text-[12.5px] text-[#9a9a9a]">{billedTo.email}</p>}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#9a9a9a] mb-1">From</p>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Nomadic Architects</p>
            <p className="text-[12.5px] text-[#9a9a9a]">billing@nomarcprojects.com</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-wide text-[#9a9a9a] mb-1">Issued</p>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{tx.date}</p>
            <p className={`text-[12.5px] font-semibold capitalize mt-1 ${statusTone}`}>{tx.status}</p>
          </div>
        </div>

        {/* line items */}
        <div className="mt-8 rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead><tr className="bg-[#fafafa] dark:bg-white/[0.02] text-[11px] uppercase tracking-wide text-[#9a9a9a]">
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
            </tr></thead>
            <tbody>
              <tr className="border-t border-[#f0f0f0] dark:border-white/10">
                <td className="px-4 py-3.5 text-[#1e1e1e] dark:text-white">{tx.planLabel} plan — {CYCLE_LABEL[tx.cycle] ?? tx.cycle}</td>
                <td className="px-4 py-3.5 text-right font-medium text-[#1e1e1e] dark:text-white">{naira(tx.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* totals */}
        <div className="mt-5 flex justify-end">
          <div className="w-full sm:w-[260px] space-y-2">
            <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>Subtotal</span><span>{naira(tx.amount)}</span></div>
            <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>Tax</span><span>{naira(0)}</span></div>
            <div className="flex items-center justify-between pt-2 border-t border-[#ececec] dark:border-white/10 text-[15px] font-bold text-[#1e1e1e] dark:text-white"><span>Total</span><span>{naira(tx.amount)}</span></div>
          </div>
        </div>

        {/* payment + note */}
        <div className="mt-8 pt-6 border-t border-[#ececec] dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#9a9a9a] mb-1">Payment method</p>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white capitalize">{tx.provider}{tx.provider === "demo" ? " · no charge" : ""}</p>
          </div>
          <p className="text-[12px] text-[#9a9a9a] sm:text-right">Thank you for subscribing to Nomarc Projects. This invoice was generated automatically.</p>
        </div>

        {/* QR code + watermark strip — print:block */}
        <div className="mt-8 pt-6 border-t border-dashed border-[#ececec] dark:border-white/10 flex flex-col items-center gap-3">
          <BrandedQR url={invoiceUrl} size={140} />
          <p className="text-[11px] text-[#c0c0c0] dark:text-white/25 text-center">Scan to verify this invoice · nomarcprojects.com</p>
        </div>
      </div>
    </div>
    </>
  );
}
