import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** "auto" swaps black/white by theme; "yellow"/"light"/"dark" force a variant */
  tone?: "auto" | "yellow" | "light" | "dark";
  /** kept for backwards-compat; the official wordmark already includes it */
  subtitle?: string;
}

// Official Nomarc Projects wordmark (trimmed from brand assets). Aspect ≈ 2.08.
const H: Record<NonNullable<LogoProps["size"]>, number> = { sm: 34, md: 46, lg: 64 };

export function Logo({ size = "md", className, tone = "auto" }: LogoProps) {
  const h = H[size];
  const w = Math.round(h * 2.08);
  const common = { alt: "Nomarc Projects", width: w, height: h, style: { height: h, width: "auto" } as const };

  if (tone !== "auto") {
    const src = tone === "yellow" ? "/logos/wordmark-yellow.png" : tone === "light" ? "/logos/wordmark-on-dark.png" : "/logos/wordmark-on-light.png";
    return (
      <span className={cn("inline-flex items-center select-none shrink-0", className)} aria-label="Nomarc Projects">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} {...common} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center select-none shrink-0", className)} aria-label="Nomarc Projects">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/wordmark-on-light.png" {...common} className="block dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/wordmark-on-dark.png" {...common} className="hidden dark:block" />
    </span>
  );
}
