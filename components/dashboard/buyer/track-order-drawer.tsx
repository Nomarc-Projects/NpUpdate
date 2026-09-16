"use client";

import Link from "next/link";
import { Check, Package, Truck, PackageCheck, XCircle, ShieldCheck, FileText } from "lucide-react";
import { SlideOverDrawer } from "@/components/dashboard/kit/slide-over-drawer";
import { naira } from "@/lib/sample-catalog";
import type { OrderRow, OrderStatus } from "@/lib/services/orders";
import { cn } from "@/lib/utils";

const STEPS: { key: OrderStatus; label: string; Icon: typeof Package }[] = [
  { key: "pending", label: "Order placed", Icon: Package },
  { key: "processing", label: "Processing", Icon: Package },
  { key: "shipped", label: "Shipped", Icon: Truck },
  { key: "completed", label: "Delivered", Icon: PackageCheck },
];
const ORDER: OrderStatus[] = ["pending", "processing", "shipped", "completed"];

const ESCROW_LABEL: Record<string, string> = {
  held: "Held in escrow — released once the order is marked delivered.",
  released: "Released to the supplier.",
  refunded: "Refunded to your wallet.",
};

/** Buyer-facing order tracking — a status timeline derived from
 *  `salesOrder.status`/`escrowState` (not real carrier tracking; this
 *  marketplace doesn't integrate a shipping API). Off `my-orders` rows. */
export function TrackOrderDrawer({ order, open, onClose }: { order: OrderRow | null; open: boolean; onClose: () => void }) {
  if (!order) return <SlideOverDrawer open={open} onClose={onClose} title="Track order">{null}</SlideOverDrawer>;

  const cancelled = order.status === "cancelled";
  const currentIdx = cancelled ? -1 : ORDER.indexOf(order.status);

  return (
    <SlideOverDrawer open={open} onClose={onClose} title="Track order" subtitle={order.ref}>
      <div className="space-y-6">
        {cancelled ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#fdecec] dark:bg-[#e5484d]/10">
            <XCircle size={20} className="text-[#e5484d] flex-shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-[#c0392b] dark:text-[#f87171]">Order cancelled</p>
              <p className="text-[12px] text-[#9a9a9a] mt-0.5">This order was cancelled and will not be fulfilled.</p>
            </div>
          </div>
        ) : (
          <ol className="space-y-0">
            {STEPS.map((s, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <li key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      done ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f0f0f0] dark:bg-white/10 text-[#b0b0b0]",
                    )}>
                      {done && !active ? <Check size={15} /> : <s.Icon size={14} />}
                    </div>
                    {i < STEPS.length - 1 && <div className={cn("w-0.5 flex-1 min-h-[28px] my-1", i < currentIdx ? "bg-[#ffd716]" : "bg-[#ececec] dark:bg-white/10")} />}
                  </div>
                  <div className={cn("pb-6 pt-1", !done && "opacity-60")}>
                    <p className={cn("text-[13px] font-semibold", done ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a]")}>{s.label}</p>
                    {active && <p className="text-[11.5px] text-[#caa400] dark:text-[#ffd716] mt-0.5 font-medium">Current status</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Escrow state */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10">
          <ShieldCheck size={16} className="text-[#9a9a9a] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white capitalize">Payment {order.payment} · Escrow {order.escrowState}</p>
            <p className="text-[11.5px] text-[#9a9a9a] mt-0.5">{ESCROW_LABEL[order.escrowState] ?? ""}</p>
          </div>
        </div>

        {/* Items */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#b0b0b0] dark:text-white/30 mb-2">Items ({order.items.length})</p>
          <div className="space-y-2.5">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] dark:bg-white/5 overflow-hidden flex-shrink-0">
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-[#1e1e1e] dark:text-white truncate">{it.name}</p>
                  <p className="text-[11px] text-[#9a9a9a]">×{it.qty}</p>
                </div>
                <span className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white">{naira(it.unitPrice * it.qty)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[13.5px] font-bold text-[#1e1e1e] dark:text-white pt-3 border-t border-[#ececec] dark:border-white/10">
          <span>Total</span><span>{naira(order.total)}</span>
        </div>

        <div className="flex gap-2 pt-1">
          <Link href={`/dashboard/orders/${order.id}/invoice`} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
            <FileText size={14} /> View invoice
          </Link>
        </div>
      </div>
    </SlideOverDrawer>
  );
}
