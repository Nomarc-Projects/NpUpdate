import { create } from "zustand";

interface PreloaderState {
  /** bump to replay the preloader (e.g. on audience toggle) */
  tick: number;
  replay: () => void;
}

export const usePreloader = create<PreloaderState>((set) => ({
  tick: 0,
  replay: () => set((s) => ({ tick: s.tick + 1 })),
}));
