"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Phone, Truck, CheckCircle2, Circle, FileText, ChevronDown, Printer, MessageSquare } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { setOrderStatus, type OrderRow, type OrderStatus } from "@/lib/services/orders";
import { cn } from "@/lib/utils";

const ALL_STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "completed", "cancelled"];

function StatusMenu({ value, onChange }: { value: OrderStatus; onChange: (s: OrderStatus) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 120)} className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors", STATUS_PILL[value])}>
        {value} <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }} className="absolute left-0 top-full mt-1.5 z-30 min-w-[150px] rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#262626] shadow-xl p-1">
            {ALL_STATUSES.map((s) => (
              <button key={s} onMouseDown={() => { onChange(s); setOpen(false); }} className={cn("w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] capitalize transition-colors", s === value ? "bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white font-medium" : "text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5")}>{s}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STATUS_PILL: Record<OrderStatus, string> = {
  pending: "bg-[#fef3c7] text-[#92400e] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]",
  processing: "bg-[#e0f2fe] text-[#0369a1] dark:bg-[#38bdf8]/15 dark:text-[#7dd3fc]",
  shipped: "bg-[#ede9fe] text-[#6d28d9] dark:bg-[#a78bfa]/15 dark:text-[#c4b5fd]",
  completed: "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]",
  cancelled: "bg-[#fde8e8] text-[#c0392b] dark:bg-[#ef4444]/15 dark:text-[#f87171]",
};

const TIMELINE: OrderStatus[] = ["pending", "processing", "shipped", "completed"];
const TL_LABEL: Record<OrderStatus, string> = { pending: "Order placed", processing: "Processing", shipped: "Shipped", completed: "Delivered", cancelled: "Cancelled" };

export function OrderDetail({ order }: { order: OrderRow }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const subtotal = order.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const vat = Math.round(subtotal * 0.075);
  const shipping = order.delivery.toLowerCase().includes("pickup") ? 0 : 35000;
  const stage = status === "cancelled" ? -1 : TIMELINE.indexOf(status);
  const changeStatus = (s: OrderStatus) => {
    const prev = status;
    setStatus(s);
    setOrderStatus(order.id, s).then(() => toast.success(`Order marked as ${s}`)).catch(() => { setStatus(prev); toast.error("Couldn't update status"); });
  };
  const nextStatus = status === "pending" ? "processing" : status === "processing" ? "shipped" : status === "shipped" ? "completed" : null;

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1100px] mx-auto">
      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/orders" className="w-9 h-9 rounded-full border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors flex-shrink-0"><ArrowLeft size={16} /></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[#1e1e1e] dark:text-white">Order {order.ref}</h1>
              <StatusMenu value={status} onChange={changeStatus} />
            </div>
            <p className="text-[12.5px] text-[#9a9a9a] mt-0.5">Placed {order.date} · {order.company}</p>
          </div>
        </div>
        <Link href={`/dashboard/orders/${order.id}/invoice`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors"><FileText size={15} /> View invoice</Link>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5 min-w-0">
          {/* items */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Items ordered</h2>
              <span className="text-[12px] text-[#9a9a9a]">{order.items.length} item{order.items.length > 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-12 h-12 rounded-lg bg-[#f5f5f5] dark:bg-white/5 overflow-hidden flex-shrink-0">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={it.image} alt="" className="w-full h-full object-cover" /></div>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{it.name}</p><p className="text-[12px] text-[#9a9a9a]">{it.qty.toLocaleString()} × {naira(it.unitPrice)}</p></div>
                  <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white tabular-nums">{naira(it.qty * it.unitPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* delivery */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-3">Delivery & customer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div className="space-y-2">
                <p className="font-semibold text-[#1e1e1e] dark:text-white">{order.customer}</p>
                <p className="flex items-start gap-2 text-[#6b6b6b] dark:text-white/60"><MapPin size={15} className="mt-0.5 flex-shrink-0 text-[#9a9a9a]" /> {order.address}</p>
                <p className="flex items-center gap-2 text-[#6b6b6b] dark:text-white/60"><Phone size={15} className="text-[#9a9a9a]" /> {order.phone}</p>
              </div>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-[#6b6b6b] dark:text-white/60"><Truck size={15} className="text-[#9a9a9a]" /> {order.delivery}</p>
                <p className="text-[#9a9a9a]">Payment: <span className="capitalize font-medium text-[#1e1e1e] dark:text-white">{order.payment}</span></p>
              </div>
            </div>
          </div>

          {/* timeline */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-4">Order status</h2>
            {status === "cancelled" ? (
              <p className="text-[13px] text-[#e5484d] font-medium">This order was cancelled and the payment refunded.</p>
            ) : (
              <ol className="relative ml-2">
                {TIMELINE.map((s, i) => {
                  const done = i <= stage;
                  return (
                    <li key={s} className="relative pl-7 pb-5 last:pb-0">
                      {i < TIMELINE.length - 1 && <span className={cn("absolute left-[7px] top-4 bottom-0 w-px", done ? "bg-[#ffd716]" : "bg-[#e3e3e3] dark:bg-white/10")} />}
                      <span className="absolute left-0 top-0.5">{done ? <CheckCircle2 size={16} className="text-[#caa400]" /> : <Circle size={16} className="text-[#d4d4d4] dark:text-white/20" />}</span>
                      <p className={cn("text-[13px] font-medium", done ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a]")}>{TL_LABEL[s]}</p>
                      {i === stage && <p className="text-[12px] text-[#9a9a9a]">Current stage · updated {order.date}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* summary */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-3">Summary</h2>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between text-[#6b6b6b] dark:text-white/60"><span>Subtotal</span><span className="tabular-nums">{naira(subtotal)}</span></div>
              <div className="flex justify-between text-[#6b6b6b] dark:text-white/60"><span>Shipping</span><span className="tabular-nums">{shipping === 0 ? "Free" : naira(shipping)}</span></div>
              <div className="flex justify-between text-[#6b6b6b] dark:text-white/60"><span>VAT (7.5%)</span><span className="tabular-nums">{naira(vat)}</span></div>
              <div className="flex justify-between pt-2 border-t border-[#f0f0f0] dark:border-white/10 text-[15px] font-bold text-[#1e1e1e] dark:text-white"><span>Total</span><span className="tabular-nums">{naira(subtotal + shipping + vat)}</span></div>
            </div>
          </div>
          {status !== "completed" && status !== "cancelled" && (
            <div className="space-y-2">
              {nextStatus && <button onClick={() => changeStatus(nextStatus)} className="w-full py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors capitalize">Mark as {nextStatus}</button>}
              <button onClick={() => changeStatus("cancelled")} className="w-full py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:text-[#e5484d] hover:border-[#e5484d]/40 transition-colors">Cancel order</button>
            </div>
          )}
          <div className="space-y-2">
            <Link href={`/dashboard/orders/${order.id}/invoice`} className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Printer size={15} /> View / print invoice</Link>
            <Link href={`/dashboard/messages`} className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><MessageSquare size={15} /> Message customer</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
