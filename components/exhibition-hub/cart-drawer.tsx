"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, PackageSearch } from "lucide-react";
import { SlideOverDrawer } from "@/components/dashboard/kit/slide-over-drawer";
import { useCart, groupByVendor } from "@/lib/store/cart";
import { useCartUi } from "@/lib/store/cart-ui";
import { cartTotals } from "@/lib/cart-totals";
import { naira } from "@/lib/sample-catalog";
import { useAuth } from "@/lib/store/auth";

/** Global quick-access cart drawer — mounted once (Providers), toggled from
 *  anywhere via `useCartUi`/`<CartButton />`. Guest-friendly: shows the cart
 *  regardless of sign-in; "Checkout" only gates on sign-in. */
export function CartDrawer() {
  const open = useCartUi((s) => s.open);
  const setOpen = useCartUi((s) => s.setOpen);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.removeItem);
  const isSignedIn = useAuth((s) => s.isSignedIn);
  const router = useRouter();

  const groups = groupByVendor(items);
  const { subtotal, total } = cartTotals(items);

  function checkout() {
    setOpen(false);
    router.push(isSignedIn ? "/exhibition-hub/checkout" : "/signup?redirect=/exhibition-hub/checkout");
  }

  return (
    <SlideOverDrawer open={open} onClose={() => setOpen(false)} title="Your cart" subtitle={items.length > 0 ? `${items.reduce((n, i) => n + i.qty, 0)} item${items.length > 1 ? "s" : ""}` : undefined}>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"><ShoppingBag size={22} /></div>
          <p className="mt-3 text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white">Your cart is empty</p>
          <p className="mt-1 text-[12.5px] text-[#9a9a9a] max-w-[240px]">Browse the Exhibition Hub and add materials, equipment or products.</p>
          <Link href="/exhibition-hub" onClick={() => setOpen(false)} className="mt-4 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-semibold hover:bg-[#e6c114] transition-colors">
            Browse Exhibition Hub
          </Link>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 space-y-5 -mx-1 px-1">
            {groups.map((g) => (
              <div key={g.key}>
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#b0b0b0] dark:text-white/30 mb-2">{g.vendorName}</p>
                <div className="space-y-3">
                  {g.items.map((it) => (
                    <div key={it.id} className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg bg-[#f5f5f5] dark:bg-white/5 overflow-hidden flex-shrink-0">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#c9c9c9]"><PackageSearch size={16} /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white leading-snug line-clamp-2">{it.name}</p>
                        {it.variantName && <p className="text-[11px] text-[#9a9a9a] mt-0.5">{it.variantName}</p>}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center rounded-lg border border-[#e3e3e3] dark:border-white/15 overflow-hidden">
                            <button onClick={() => setQty(it.id, it.qty - 1)} disabled={it.qty <= 1} className="w-6 h-6 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 disabled:opacity-40 transition-colors"><Minus size={11} /></button>
                            <span className="w-6 text-center text-[11.5px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{it.qty}</span>
                            <button onClick={() => setQty(it.id, it.qty + 1)} className="w-6 h-6 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><Plus size={11} /></button>
                          </div>
                          <span className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{naira(it.unitPrice * it.qty)}</span>
                        </div>
                      </div>
                      <button onClick={() => removeItem(it.id)} aria-label="Remove" className="self-start text-[#c9c9c9] hover:text-[#e5484d] transition-colors flex-shrink-0"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[#ececec] dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#9a9a9a]">Subtotal</span>
              <span className="font-bold text-[#1e1e1e] dark:text-white">{naira(subtotal)}</span>
            </div>
            <Link href="/exhibition-hub/cart" onClick={() => setOpen(false)} className="block w-full text-center py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
              View full cart
            </Link>
            <button onClick={checkout} className="w-full py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] transition-colors">
              Checkout · {naira(total)}
            </button>
          </div>
        </div>
      )}
    </SlideOverDrawer>
  );
}
