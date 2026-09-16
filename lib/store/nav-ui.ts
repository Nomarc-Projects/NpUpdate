import { create } from "zustand";

/** UI-only (not persisted) — whether the mobile navigation panel is open.
 *  Mirrors `lib/store/cart-ui.ts`: the navbar owns the menu, but surfaces
 *  mounted as its siblings in the layout (the Helm FAB) need to know when the
 *  panel covers the screen so they can get out of its way, and there's no
 *  common client parent to prop-drill through. */
interface NavUiState {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}

export const useNavUi = create<NavUiState>()((set) => ({
  menuOpen: false,
  setMenuOpen: (v) => set({ menuOpen: v }),
}));
