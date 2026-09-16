import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Guest-friendly "compare products" shortlist (Exhibition Hub).
 * Mirrors lib/store/cart.ts: zustand + localStorage persist so the selection
 * survives navigation and the guest → signup handoff. We snapshot the card
 * fields we need (rather than only ids) so /exhibition-hub/compare renders
 * entirely client-side without a second round-trip to the DB.
 */
export const COMPARE_LIMIT = 4;

export type CompareItem = {
  id: string;
  name: string;
  img: string;
  supplier: string;
  location: string;
  avail: string;
  price: number;
  unit?: string;
  verified: boolean;
  tags: string[];
  vendorCompanyId?: string;
};

interface CompareState {
  items: CompareItem[];
  /** Add (or remove if already present). Returns what happened so callers can toast. */
  toggle: (item: CompareItem) => "added" | "removed" | "full";
  remove: (id: string) => void;
  clear: () => void;
}

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const items = get().items;
        if (items.some((i) => i.id === item.id)) {
          set({ items: items.filter((i) => i.id !== item.id) });
          return "removed";
        }
        if (items.length >= COMPARE_LIMIT) return "full";
        set({ items: [...items, item] });
        return "added";
      },
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "nomarc-compare" },
  ),
);

export const useCompareCount = () => useCompare((s) => s.items.length);
export const useIsCompared = (id: string) => useCompare((s) => s.items.some((i) => i.id === id));
