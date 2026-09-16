"use client";

import { useEffect } from "react";
import { heartbeat } from "@/lib/services/network";

/**
 * Marks the signed-in user as "active now" on a light interval while the tab is
 * visible. Powers the real online/offline dots in messaging and network lists.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const beat = () => { if (document.visibilityState === "visible") void heartbeat(); };
    beat();
    const t = setInterval(beat, 45_000);
    document.addEventListener("visibilitychange", beat);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", beat); };
  }, []);
  return null;
}
