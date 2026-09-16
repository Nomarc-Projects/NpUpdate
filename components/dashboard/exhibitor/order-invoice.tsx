"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { NomarcMark } from "@/components/ui/nomarc-mark";
import { naira } from "@/lib/sample-catalog";
import { CLIENT_SITE_ORIGIN } from "@/lib/site-url";
import { type OrderRow } from "@/lib/services/orders";
import { ReceiptPrinterIntro } from "@/components/ui/receipt-printer";
import { BrandedQR } from "@/components/ui/qr-code";

export function OrderInvoice({ order }: { order: OrderRow }) {
  const [showPrinter, setShowPrinter] = useState(true);
  const subtotal = order.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const shipping = order.delivery.toLowerCase().includes("pickup") ? 0 : 35000;
  const vat = Math.round(subtotal * 0.075);
  const total = subtotal + shipping + vat;
  const invoiceNo = `INV-${order.ref.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
  const invoiceUrl = `${CLIENT_SITE_ORIGIN}/dashboard/orders/${order.id}/invoice`;

  return (
    <>
      {showPrinter && (
        <ReceiptPrinterIntro
          variant="invoice"
          amountStr={naira(total)}
          label={invoiceNo}
          typeColor="#ffd716"
          onDismiss={() => setShowPrinter(false)}
        />
      )}
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[820px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5 print:hidden">
        <Link href={`/dashboard/orders/${order.id}`} className="inline-flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white"><ArrowLeft size={16} /> Back to order</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors"><Printer size={15} /> Print / Download</button>
      </div>

      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-6 sm:p-10 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white">Invoice</h1>
            <p className="text-[13px] text-[#9a9a9a] mt-1">{invoiceNo} · {order.ref}</p>
          </div>
          <div className="flex items-center gap-2">
            <NomarcMark size={26} className="text-[#1e1e1e] dark:text-white" />
            <span className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Nomarc Projects</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#9a9a9a] mb-1">Billed to</p>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{order.customer}</p>
            <p className="text-[12.5px] text-[#9a9a9a]">{order.company}</p>
            <p className="text-[12.5px] text-[#9a9a9a]">{order.address}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#9a9a9a] mb-1">From</p>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{order.items[0] ? "Nomarc Exhibitor" : "Nomadic Architects"}</p>
            <p className="text-[12.5px] text-[#9a9a9a]">orders@nomarcprojects.com</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-wide text-[#9a9a9a] mb-1">Issued</p>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{order.date}</p>
            <p className="text-[12.5px] font-semibold capitalize mt-1 text-[#16a34a]">{order.payment}</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[#ececec] dark:border-white/10 overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[420px]">
            <thead><tr className="bg-[#fafafa] dark:bg-white/[0.02] text-[11px] uppercase tracking-wide text-[#9a9a9a]">
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold text-right">Qty</th>
              <th className="px-4 py-3 font-semibold text-right">Unit</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
            </tr></thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-t border-[#f0f0f0] dark:border-white/10">
                  <td className="px-4 py-3 text-[#1e1e1e] dark:text-white">{it.name}</td>
                  <td className="px-4 py-3 text-right text-[#6b6b6b] dark:text-white/60">{it.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[#6b6b6b] dark:text-white/60">{naira(it.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#1e1e1e] dark:text-white">{naira(it.qty * it.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <div className="w-full sm:w-[280px] space-y-2">
            <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
            <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>Shipping</span><span>{shipping === 0 ? "Free" : naira(shipping)}</span></div>
            <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>VAT (7.5%)</span><span>{naira(vat)}</span></div>
            <div className="flex items-center justify-between pt-2 border-t border-[#ececec] dark:border-white/10 text-[15px] font-bold text-[#1e1e1e] dark:text-white"><span>Total</span><span>{naira(total)}</span></div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#ececec] dark:border-white/10">
          <p className="text-[12px] text-[#9a9a9a]">Delivery: {order.delivery}. Thank you for your business on Nomarc Projects.</p>
        </div>

        {/* QR code — verify invoice */}
        <div className="mt-8 pt-6 border-t border-dashed border-[#ececec] dark:border-white/10 flex flex-col items-center gap-3">
          <BrandedQR url={invoiceUrl} size={140} />
          <p className="text-[11px] text-[#c0c0c0] dark:text-white/25 text-center">Scan to verify this invoice · nomarcprojects.com</p>
        </div>
      </div>
    </div>
    </>
  );
}
