"use client";

import { toast } from "sonner";
import { Sparkles } from "lucide-react";

/**
 * A clearly-labeled "coming soon" affordance — never a dead control. Clicking
 * shows a friendly toast. Used for AI assist / Import CV features that will be
 * powered by a future self-hosted model.
 */
export function ComingSoonButton({ label, feature, className = "", icon = true }: { label: string; feature?: string; className?: string; icon?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => toast(`${feature ?? label} is coming soon ✨`, { description: "AI assistance lands in an upcoming release." })}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#e3d27a] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] px-3 py-1.5 text-[12px] font-medium text-[#caa400] hover:bg-[#fff8d6] transition-colors ${className}`}
    >
      {icon && <Sparkles size={13} />} {label}
      <span className="ml-1 rounded-full bg-[#ffd716]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#8a7400] dark:text-[#ffd716]">Soon</span>
    </button>
  );
}

export function ComingSoonBadge({ className = "" }: { className?: string }) {
  return <span className={`inline-flex items-center rounded-full bg-[#ffd716]/20 px-2 py-0.5 text-[10px] font-bold text-[#8a7400] dark:text-[#ffd716] ${className}`}>Coming soon</span>;
}
