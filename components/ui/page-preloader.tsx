"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PreloaderOverlay } from "@/components/ui/preloader-overlay";
import { usePreloader } from "@/lib/store/preloader";

const PULSE_HOLD_MS = 700;
const REVEAL_MS = 600;

/**
 * Returns the top-level "section" for a pathname.
 * Navigations within the same section (e.g. between dashboard pages,
 * between admin pages) skip the preloader — it only fires when crossing
 * sections, and on first mount.
 */
function section(path: string): string {
  const seg = path.split("/")[1] ?? "";
  // Group auth routes together
  if (["login", "signup", "forgot-password"].includes(seg)) return "auth";
  // Everything else is identified by first segment ("", "dashboard", "admin", etc.)
  return seg;
}

export function PagePreloader() {
  const pathname = usePathname();
  const tick = usePreloader((s) => s.tick);
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"pulse" | "reveal">("pulse");

  // Track previous section so we can skip intra-section navigations
  const prevSection = useRef<string | null>(null);
  // Track whether this is the first mount
  const mounted = useRef(false);

  useEffect(() => {
    const currentSection = section(pathname);
    const isCrossSection = prevSection.current !== null && prevSection.current !== currentSection;
    const isFirstMount = !mounted.current;

    mounted.current = true;
    prevSection.current = currentSection;

    // Only play the preloader on first load or when crossing between sections
    // (marketing ↔ dashboard ↔ admin ↔ auth). Skip intra-section navigations.
    if (!isFirstMount && !isCrossSection) return;

    setVisible(true);
    setPhase("pulse");

    const pulseTimer = window.setTimeout(() => setPhase("reveal"), PULSE_HOLD_MS);
    const revealTimer = window.setTimeout(() => setVisible(false), PULSE_HOLD_MS + REVEAL_MS);

    return () => {
      window.clearTimeout(pulseTimer);
      window.clearTimeout(revealTimer);
    };
  }, [pathname]);

  // The tick path (audience toggle on home) always plays the preloader
  useEffect(() => {
    if (tick === 0) return; // skip the initial zero value
    setVisible(true);
    setPhase("pulse");

    const pulseTimer = window.setTimeout(() => setPhase("reveal"), PULSE_HOLD_MS);
    const revealTimer = window.setTimeout(() => setVisible(false), PULSE_HOLD_MS + REVEAL_MS);

    return () => {
      window.clearTimeout(pulseTimer);
      window.clearTimeout(revealTimer);
    };
  }, [tick]);

  return <PreloaderOverlay visible={visible} phase={phase} revealMs={REVEAL_MS} />;
}
