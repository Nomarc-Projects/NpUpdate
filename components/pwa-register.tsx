"use client";

import { useEffect } from "react";

export function PwaRegister({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Never let a SW serve assets in development: `next dev` reuses chunk URLs
    // across edits, so the cache-first strategy in sw.js would keep serving
    // stale code after every change. Actively unregister any leftover SW.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      return;
    }

    // PWA toggle is off: unregister any service worker left over from before it
    // was flipped, so the toggle takes effect for visitors who already had one.
    if (!enabled) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      return;
    }

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check for SW updates immediately, then every 60s
      reg.update().catch(() => {});
      const interval = setInterval(() => reg.update().catch(() => {}), 60_000);

      // When a new SW is waiting, activate it immediately
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          if (next.state === "activated" && navigator.serviceWorker.controller) {
            // New SW took over — no reload needed, skipWaiting handles it
          }
        });
      });

      return () => clearInterval(interval);
    }).catch(() => {});
  }, []);
  return null;
}
