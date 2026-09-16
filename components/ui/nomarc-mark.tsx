import { cn } from "@/lib/utils";

/**
 * Nomarc icon mark (official brand emblem). `tone="auto"` swaps black/white by
 * theme (both keep the yellow hard hat); `tone="yellow"` forces the all-yellow
 * emblem (used on the preloader / dark photo panels).
 */
export function NomarcMark({ className, size = 48, tone = "auto" }: { className?: string; size?: number; tone?: "auto" | "yellow" }) {
  if (tone === "yellow") {
    return (
      <span className={cn("inline-flex items-center justify-center select-none shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/mark-yellow.png" alt="" width={size} height={size} className="w-full h-full object-contain" />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center justify-center select-none shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/mark-on-light.png" alt="" width={size} height={size} className="block dark:hidden w-full h-full object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/mark-on-dark.png" alt="" width={size} height={size} className="hidden dark:block w-full h-full object-contain" />
    </span>
  );
}
