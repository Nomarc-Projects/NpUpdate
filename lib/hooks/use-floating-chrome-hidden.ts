"use client";

import { usePathname } from "next/navigation";

/** Floating chrome (back-to-top, etc.) shows on marketing pages only — not on
 *  auth, the app, or admin. Split out of the old chat support-fab (removed —
 *  pre-Helm leftover) since other floating widgets share the same rule. */
export function useFloatingChromeHidden() {
  const pathname = usePathname();
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    ["/login", "/signup", "/forgot-password"].some((p) => pathname.startsWith(p))
  );
}
