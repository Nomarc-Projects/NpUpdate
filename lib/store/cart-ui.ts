import { create } from "zustand";

/** UI-only (not persisted) — whether the quick-access cart drawer is open.
 *  Separate from `lib/store/cart.ts` (the actual cart data) so any surface
 *  (marketing navbar, dashboard header, product cards) can toggle the drawer
 *  without prop-drilling; one `<CartDrawer />` is mounted globally. */
interface CartUiState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useCartUi = create<CartUiState>()((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
