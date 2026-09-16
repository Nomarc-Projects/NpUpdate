"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, Package, Calendar, MapPin, MessageSquare,
  CheckCircle2, XCircle, HelpCircle, User, Building2,
  Mail, Loader2, ShoppingBag,
} from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { type QuoteDetail } from "@/lib/services/rfq";
import { createOrderFromQuote } from "@/lib/services/orders";
import { QuoteProposalPanel } from "@/components/dashboard/quote-proposal-panel";
import { setQuoteArchived } from "@/lib/services/quote-proposals";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "Pending",   color: "text-[#f59e0b]", bg: "bg-[#fef3c7] dark:bg-[#f59e0b]/15" },
  quoted:   { label: "Quoted",    color: "text-[#16a34a]", bg: "bg-[#dcfce7] dark:bg-[#16a34a]/15" },
  clarify:  { label: "Needs Info",color: "text-[#0ea5e9]", bg: "bg-[#e0f2fe] dark:bg-[#0ea5e9]/15" },
  declined: { label: "Declined",  color: "text-[#ef4444]", bg: "bg-[#fee2e2] dark:bg-[#ef4444]/15" },
  accepted: { label: "Accepted",  color: "text-white",     bg: "bg-[#16a34a]" },
};

export function QuoteDetailView({ quote }: { quote: QuoteDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const s = STATUS[quote.status] ?? STATUS.pending;

  async function handleAccept() {
    setBusy(true);
    try {
      await createOrderFromQuote(quote.id);
      toast.success("Order created from quote!");
      router.push("/dashboard/my-orders");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/quotes" className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">
              RFQ-{quote.id.slice(0, 8).toUpperCase()}
            </h1>
            <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full", s.color, s.bg)}>
              {s.label}
            </span>
          </div>
          <p className="text-[13px] text-[#9a9a9a] mt-0.5">Submitted {quote.date}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f0f0f0] dark:border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40">Product Requested</p>
            </div>
            <div className="p-5 flex gap-4">
              {quote.productImage && (
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#f5f5f5] dark:bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={quote.productImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{quote.productName}</p>
                {quote.productPrice && (
                  <p className="text-[13px] text-[#9a9a9a] mt-1">Listed price: {naira(quote.productPrice)}</p>
                )}
                {quote.productId && (
                  <Link href={`/dashboard/products`} className="text-[12px] font-semibold text-[#ffd716] hover:underline mt-1 inline-block">
                    View product →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quote details */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f0f0f0] dark:border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40">Request Details</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {quote.quantity && (
                  <div className="flex items-start gap-2.5">
                    <Package size={15} className="text-[#9a9a9a] mt-0.5" />
                    <div>
                      <p className="text-[10.5px] font-semibold text-[#9a9a9a] uppercase tracking-wider">Quantity</p>
                      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5">{quote.quantity}</p>
                    </div>
                  </div>
                )}
                {quote.requiredBy && (
                  <div className="flex items-start gap-2.5">
                    <Calendar size={15} className="text-[#9a9a9a] mt-0.5" />
                    <div>
                      <p className="text-[10.5px] font-semibold text-[#9a9a9a] uppercase tracking-wider">Required By</p>
                      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5">{quote.requiredBy}</p>
                    </div>
                  </div>
                )}
                {quote.deliveryLocation && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-[#9a9a9a] mt-0.5" />
                    <div>
                      <p className="text-[10.5px] font-semibold text-[#9a9a9a] uppercase tracking-wider">Delivery</p>
                      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5">{quote.deliveryLocation}</p>
                    </div>
                  </div>
                )}
              </div>

              {quote.message && (
                <div className="mt-4 pt-4 border-t border-[#f0f0f0] dark:border-white/10">
                  <p className="text-[10.5px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-2">Message from buyer</p>
                  <div className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] px-4 py-3">
                    <p className="text-[13px] text-[#4a4a4a] dark:text-white/80 leading-relaxed">{quote.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Priced terms — replaces the free-text reply, which was never
              persisted, and gives the buyer Decline / Request Changes as well
              as Accept. */}
          <QuoteProposalPanel
            quoteRequestId={quote.id}
            productName={quote.productName}
            isBuyer={quote.isBuyer}
            onChanged={() => router.refresh()}
          />

          {/* Clears the thread out of the inbox — what the "Archived" chip filters on. */}
          <div className="flex justify-end">
            <button
              onClick={async () => {
                try {
                  await setQuoteArchived(quote.id, !quote.archived);
                  toast.success(quote.archived ? "Moved back to your inbox" : "Archived");
                  router.refresh();
                } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
              }}
              className="text-[12.5px] font-medium text-[#9a9a9a] underline underline-offset-2 hover:text-[#1e1e1e] dark:hover:text-white"
            >
              {quote.archived ? "Unarchive this request" : "Archive this request"}
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Buyer info */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40 mb-3">
              {quote.isBuyer ? "Supplier" : "Buyer"}
            </p>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#ffd716]/15 flex items-center justify-center text-[#b89500] font-bold text-sm">
                {(quote.isBuyer ? quote.vendorName : quote.buyerName).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">
                  {quote.isBuyer ? quote.vendorName : quote.buyerName}
                </p>
                {(quote.isBuyer ? quote.vendorCompany : quote.buyerCompany) && (
                  <p className="text-[11px] text-[#9a9a9a]">{quote.isBuyer ? quote.vendorCompany : quote.buyerCompany}</p>
                )}
              </div>
            </div>
            {!quote.isBuyer && (
              <div className="space-y-1.5 text-[12px] text-[#6b6b6b] dark:text-white/60">
                <div className="flex items-center gap-2"><Mail size={12} className="text-[#9a9a9a]" /> {quote.buyerEmail}</div>
              </div>
            )}
            <Link href="/dashboard/messages"
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"
            ><MessageSquare size={13} /> Send Message</Link>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40 mb-3">Timeline</p>
            <div className="space-y-3">
              {[
                { label: "Request submitted", done: true, date: quote.date },
                { label: "Supplier reviewed", done: quote.status !== "pending" },
                { label: "Quote sent", done: ["quoted", "accepted"].includes(quote.status) },
                { label: "Order created", done: quote.status === "accepted" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    step.done ? "bg-[#16a34a] text-white" : "border-2 border-[#e3e3e3] dark:border-white/20"
                  )}>
                    {step.done && <CheckCircle2 size={12} />}
                  </div>
                  <div>
                    <p className={cn("text-[12.5px] font-semibold", step.done ? "text-[#1e1e1e] dark:text-white" : "text-[#b0b0b0]")}>{step.label}</p>
                    {step.done && step.date && <p className="text-[10.5px] text-[#9a9a9a]">{step.date}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
