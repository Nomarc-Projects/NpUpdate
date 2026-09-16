"use client";

import { HelpCircle } from "lucide-react";
import { useTour } from "./tour-provider";
import { cn } from "@/lib/utils";

/**
 * Prominent in-content doorway to the audience's cross-page walkthrough —
 * mounted on the dashboard home beside the primary CTA for first-timers who
 * won't hunt for the top-bar "?" launcher. Complements (does not replace) the
 * launcher. Ported from litchconsulting, reskinned to Nomarc brand. Renders
 * nothing until a walkthrough is registered for the current audience.
 */
export function TourWizardButton({ className }: { className?: string }) {
  const { startWalkthrough, hasWalkthrough } = useTour();
  if (!hasWalkthrough()) return null;
  return (
    <button
      type="button"
      onClick={startWalkthrough}
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-full bg-[#ffd716] px-4 py-2 text-sm font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]",
        className,
      )}
    >
      <HelpCircle className="size-4" />
      Take a guided tour
    </button>
  );
}
