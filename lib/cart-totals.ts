import type { CartItem } from "@/lib/store/cart";

/** Shared subtotal/shipping/VAT/total math for the cart drawer, cart page and
 *  checkout review step. Mirrors the backend's actual charge (see
 *  `placeOrder` in lib/services/orders.ts / `cartTotal` in
 *  lib/services/checkout.ts) so what a buyer is shown pre-payment always
 *  matches what gets charged — shipping is demo-free (0) for now. */
export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const shipping = 0;
  const vat = Math.round(subtotal * 0.075);
  const total = subtotal + shipping + vat;
  return { subtotal, shipping, vat, total };
}
