"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, PackageSearch, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart, groupByVendor } from "@/lib/store/cart";
import { cartTotals } from "@/lib/cart-totals";
import { naira } from "@/lib/sample-catalog";

/** Full `/exhibition-hub/cart` page (AC Store ref layout) — grouped by
 *  vendor, qty/remove, subtotal/shipping/tax/total. Guest-friendly: reading
 *  and editing the cart never requires sign-in; "Continue to checkout" is the
 *  only gate. */
export function CartPage({ signedIn }: { signedIn: boolean }) {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.removeItem);
  const router = useRouter();

  const groups = groupByVendor(items);
  const { subtotal, shipping, vat, total } = cartTotals(items);

  function continueToCheckout() {
    router.push(signedIn ? "/exhibition-hub/checkout" : "/signup?redirect=/exhibition-hub/checkout");
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-12 max-w-[1000px] mx-auto">
      <Link href="/exhibition-hub" className="inline-flex items-center gap-1.5 text-[13px] text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors mb-4">
        <ArrowLeft size={14} /> Continue browsing
      </Link>
      <h1 className="text-[22px] sm:text-[26px] font-bold text-[#1e1e1e] dark:text-white mb-6">Your cart</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><ShoppingBag size={22} /></div>
          <p className="mt-3 text-[15px] font-bold text-[#1e1e1e] dark:text-white">Your cart is empty</p>
          <p className="mt-1 text-[13px] text-[#9a9a9a] max-w-sm">Browse verified materials, equipment and products from suppliers across Nigeria.</p>
          <Link href="/exhibition-hub" className="mt-4 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">
            Browse Exhibition Hub
          </Link>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
          {/* Line items, grouped by vendor */}
          <div className="space-y-6">
            <AnimatePresence>
              {groups.map((g) => (
                <motion.div key={g.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
                  <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/10">
                    <p className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">{g.vendorName}</p>
                    <p className="text-[12.5px] font-semibold text-[#9a9a9a]">{naira(g.subtotal)}</p>
                  </div>
                  <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
                    {g.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-3.5 px-4 sm:px-5 py-4">
                        <div className="w-16 h-16 rounded-xl bg-[#f5f5f5] dark:bg-white/5 overflow-hidden flex-shrink-0">
                          {it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#c9c9c9]"><PackageSearch size={18} /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white leading-snug line-clamp-2">{it.name}</p>
                          {it.variantName && <p className="text-[12px] text-[#9a9a9a] mt-0.5">{it.variantName}</p>}
                          <p className="text-[12px] text-[#9a9a9a] mt-0.5">{naira(it.unitPrice)} / {it.unit}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center rounded-lg border border-[#e3e3e3] dark:border-white/15 overflow-hidden">
                            <button onClick={() => setQty(it.id, it.qty - 1)} disabled={it.qty <= 1} className="w-7 h-7 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 disabled:opacity-40 transition-colors"><Minus size={12} /></button>
                            <span className="w-7 text-center text-[12.5px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{it.qty}</span>
                            <button onClick={() => setQty(it.id, it.qty + 1)} className="w-7 h-7 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><Plus size={12} /></button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{naira(it.unitPrice * it.qty)}</span>
                            <button onClick={() => removeItem(it.id)} aria-label="Remove" className="text-[#c9c9c9] hover:text-[#e5484d] transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="mt-6 lg:mt-0 lg:sticky lg:top-24 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-3">
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-1">Order summary</h2>
            <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>Subtotal</span><span className="font-medium text-[#1e1e1e] dark:text-white">{naira(subtotal)}</span></div>
            <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>Shipping</span><span className="font-medium text-[#16a34a]">{shipping === 0 ? "Free" : naira(shipping)}</span></div>
            <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>VAT (7.5%)</span><span className="font-medium text-[#1e1e1e] dark:text-white">{naira(vat)}</span></div>
            <div className="flex items-center justify-between pt-3 border-t border-[#ececec] dark:border-white/10 text-[16px] font-black text-[#1e1e1e] dark:text-white"><span>Total</span><span>{naira(total)}</span></div>
            <button onClick={continueToCheckout} className="w-full mt-2 py-3 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13.5px] font-bold hover:bg-[#e6c114] transition-colors">
              Continue to checkout
            </button>
            <p className="flex items-center gap-1.5 text-[11px] text-[#9a9a9a] pt-1"><ShieldCheck size={13} className="flex-shrink-0" /> Buyer protection on every order via Nomarc escrow.</p>
          </div>
        </div>
      )}
    </div>
  );
}
