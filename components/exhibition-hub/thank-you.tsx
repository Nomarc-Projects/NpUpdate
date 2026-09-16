"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, FileText, MapPin, ShoppingBag, PackageSearch } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import type { OrderRow } from "@/lib/services/orders";
import { TrackOrderDrawer } from "@/components/dashboard/buyer/track-order-drawer";

/** Micro-animated order confirmation. One checkout can split into several
 *  `salesOrder` rows (one per vendor) sharing a payment reference — shown
 *  here as one purchase with a per-vendor breakdown, reusing the same
 *  `OrderRow` shape `OrderInvoice` renders from. */
export function ThankYou({ orders, reference }: { orders: OrderRow[]; reference: string }) {
  const [tracking, setTracking] = useState<OrderRow | null>(null);
  const total = orders.reduce((s, o) => s + o.total, 0);
  const itemCount = orders.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-14 max-w-[640px] mx-auto text-center">
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="w-20 h-20 mx-auto rounded-full bg-[#dcfce7] dark:bg-[#22c55e]/15 flex items-center justify-center"
      >
        <motion.div initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <Check size={36} className="text-[#16a34a]" strokeWidth={3} />
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="mt-6 text-[24px] sm:text-[28px] font-bold text-[#1e1e1e] dark:text-white">Order placed!</h1>
        <p className="mt-2 text-[13.5px] text-[#9a9a9a]">
          {itemCount} item{itemCount > 1 ? "s" : ""} · {naira(total)} · Ref {reference.slice(0, 14).toUpperCase()}
        </p>
        <p className="mt-1 text-[12.5px] text-[#9a9a9a] max-w-[420px] mx-auto">
          Payment is held in escrow and released to each supplier once you confirm delivery. You&apos;ll get updates as your order moves.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-8 space-y-3 text-left">
        {orders.length === 0 ? (
          <div className="flex items-center gap-2 justify-center py-8 text-[13px] text-[#9a9a9a]">
            <PackageSearch size={16} /> Order details are still syncing — check My Orders in a moment.
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <p className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">{o.ref}</p>
                <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{naira(o.total)}</span>
              </div>
              <div className="space-y-1.5">
                {o.items.map((it, i) => (
                  <p key={i} className="text-[12px] text-[#6b6b6b] dark:text-white/60 truncate">{it.name} ×{it.qty}</p>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f0f0f0] dark:border-white/10">
                <button onClick={() => setTracking(o)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
                  <MapPin size={13} /> Track order
                </button>
                <Link href={`/dashboard/orders/${o.id}/invoice`} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
                  <FileText size={13} /> Invoice
                </Link>
              </div>
            </div>
          ))
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/dashboard/my-orders" className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13.5px] font-bold hover:bg-[#e6c114] transition-colors">
          <ShoppingBag size={15} /> View my orders
        </Link>
        <Link href="/exhibition-hub" className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
          Continue browsing
        </Link>
      </motion.div>

      <TrackOrderDrawer order={tracking} open={!!tracking} onClose={() => setTracking(null)} />
    </div>
  );
}
