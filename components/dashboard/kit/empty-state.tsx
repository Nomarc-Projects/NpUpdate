import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The redesign's empty-state template: soft yellow-tinted icon tile, heading,
 * muted body, and one or two CTAs. Used across every "no X yet" screen.
 */
export type EmptyCta = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
};

function Cta({ cta, variant }: { cta: EmptyCta; variant: "primary" | "ghost" }) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-colors",
    variant === "primary"
      ? "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]"
      : "border border-[#e5e5e5] text-[#1e1e1e] hover:bg-[#f5f5f5] dark:border-white/15 dark:text-white dark:hover:bg-white/5",
  );
  const Icon = cta.icon;
  const inner = (
    <>
      {Icon && <Icon size={16} />}
      {cta.label}
    </>
  );
  if (cta.href) return <Link href={cta.href} className={cls}>{inner}</Link>;
  return <button type="button" onClick={cta.onClick} className={cls}>{inner}</button>;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primary,
  secondary,
  className,
  tone = "yellow",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  primary?: EmptyCta;
  secondary?: EmptyCta;
  className?: string;
  /** Icon-tile tone: yellow (default empty) or grey (neutral). */
  tone?: "yellow" | "grey";
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <div
        className={cn(
          "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl",
          tone === "yellow" ? "bg-[#fff7cc] dark:bg-[#ffd716]/10" : "bg-[#f4f4f4] dark:bg-white/5",
        )}
      >
        <Icon size={28} className={tone === "yellow" ? "text-[#8a6d00] dark:text-[#ffd716]" : "text-[#9a9a9a]"} />
      </div>
      <h3 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{description}</p>}
      {(primary || secondary) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primary && <Cta cta={primary} variant="primary" />}
          {secondary && <Cta cta={secondary} variant="ghost" />}
        </div>
      )}
    </div>
  );
}
