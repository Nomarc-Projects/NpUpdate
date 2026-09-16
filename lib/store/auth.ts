import { create } from "zustand";

export interface AuthUser {
  name: string;
  email: string;
  avatar?: string;
  /** Authorization role ("client" | "professional" | ... | "admin" | "super_admin").
   *  Drives super-admin-only nav/UI on the client; server actions re-enforce it. */
  role?: string;
}

interface AuthState {
  isSignedIn: boolean;
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}

/**
 * Lightweight client auth state. Real session wiring (next-auth) can call
 * `signIn`/`signOut` here once available; until then it defaults to signed-out
 * so the marketing navbar shows Login / Sign Up.
 */
export const useAuth = create<AuthState>((set) => ({
  isSignedIn: false,
  user: null,
  signIn: (user) => set({ isSignedIn: true, user }),
  signOut: () => set({ isSignedIn: false, user: null }),
}));
