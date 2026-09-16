import { cn } from "@/lib/utils";

/**
 * Status pill — the redesign's semantic badge. One tone vocabulary reused across
 * every table, card, and detail view (statuses, availability, verification).
 */
export type BadgeTone = "green" | "blue" | "amber" | "red" | "grey" | "yellow";

const TONES: Record<BadgeTone, string> = {
  green: "bg-[#e7f6ec] text-[#1a7f43] dark:bg-[#1a7f43]/15 dark:text-[#4ade80]",
  blue: "bg-[#e8f0fe] text-[#2563eb] dark:bg-[#2563eb]/15 dark:text-[#7ab0ff]",
  amber: "bg-[#fef4e2] text-[#b7791f] dark:bg-[#b7791f]/15 dark:text-[#f5c451]",
  red: "bg-[#fdecec] text-[#c53434] dark:bg-[#c53434]/15 dark:text-[#f98a8a]",
  grey: "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60",
  yellow: "bg-[#fff7cc] text-[#8a6d00] dark:bg-[#ffd716]/15 dark:text-[#ffd716]",
};

export function StatusBadge({
  tone = "grey",
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-5",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
