import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Guest-friendly shopping cart. Persisted to localStorage so it survives the
 * guest → signup → checkout handoff (no sign-in required to add items; a
 * sign-in is only enforced once the buyer hits "Continue to checkout").
 * Line items carry the vendor's company id so the cart/checkout can group
 * and split into one salesOrder per vendor (multivendor marketplace).
 */
export type CartItem = {
  /** Stable per-line key: productId, or `productId::variantId` when a variant is picked. */
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  image: string;
  unit: string;
  unitPrice: number;
  qty: number;
  vendorCompanyId?: string;
  vendorName: string;
};

type AddInput = Omit<CartItem, "id" | "qty"> & { qty?: number };

interface CartState {
  items: CartItem[];
  addItem: (item: AddInput) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

const keyOf = (productId: string, variantId?: string) => (variantId ? `${productId}::${variantId}` : productId);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((s) => {
          const id = keyOf(item.productId, item.variantId);
          const qty = Math.max(1, item.qty ?? 1);
          const existing = s.items.find((i) => i.id === id);
          if (existing) {
            return { items: s.items.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i)) };
          }
          return { items: [...s.items, { ...item, id, qty }] };
        }),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.round(qty)) } : i)) })),
      clear: () => set({ items: [] }),
    }),
    { name: "nomarc-cart" },
  ),
);

export const useCartCount = () => useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
export const useCartSubtotal = () => useCart((s) => s.items.reduce((n, i) => n + i.qty * i.unitPrice, 0));

/** Group cart lines by vendor company (falls back to vendor name when the
 *  company id isn't known — e.g. sample/demo products). */
export function groupByVendor(items: CartItem[]): { key: string; vendorName: string; vendorCompanyId?: string; items: CartItem[]; subtotal: number }[] {
  const groups = new Map<string, { key: string; vendorName: string; vendorCompanyId?: string; items: CartItem[]; subtotal: number }>();
  for (const it of items) {
    const key = it.vendorCompanyId ?? `name:${it.vendorName}`;
    const g = groups.get(key) ?? { key, vendorName: it.vendorName, vendorCompanyId: it.vendorCompanyId, items: [], subtotal: 0 };
    g.items.push(it);
    g.subtotal += it.qty * it.unitPrice;
    groups.set(key, g);
  }
  return Array.from(groups.values());
}
