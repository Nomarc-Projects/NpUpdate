import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { NomarcAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Sticky left identity card shared by the professional and exhibitor dashboards
 * and by public profile views (image 88/69). The header (avatar, name, verified
 * tick, status pill, subtitle, Edit button) is fixed; the body is composed by
 * the caller from `IdentitySection` + `ChipList` so each role fills in its own
 * sections (About, Work Experience / Company Details, Skills / Categories, …).
 */
export function ProfileIdentityCard({
  name,
  avatar,
  verified = false,
  statusPill,
  subtitle,
  editHref,
  editLabel = "Edit Profile Info",
  secondaryAction,
  children,
  className,
}: {
  name: string;
  avatar?: string;
  verified?: boolean;
  statusPill?: React.ReactNode;
  subtitle?: React.ReactNode;
  editHref?: string;
  editLabel?: string;
  /** Optional button rendered directly below the primary edit button. Used on
   *  the professional dashboard to surface the company/member setup flows. */
  secondaryAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]", className)}>
      <NomarcAvatar src={avatar} name={name} size="lg" />
      <div className="mt-3 flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-[#1e1e1e] dark:text-white">{name}</h2>
        {verified && <BadgeCheck size={17} className="flex-shrink-0 text-[#ffd716]" />}
        {statusPill}
      </div>
      {subtitle && <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">{subtitle}</p>}

      {editHref && (
        <Link
          href={editHref}
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#ffd716] px-4 py-2.5 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
        >
          {editLabel}
        </Link>
      )}

      {secondaryAction}

      {children && <div className="mt-5 space-y-5">{children}</div>}
    </div>
  );
}

/** A titled section inside the identity card (About, Work Experience, …). */
export function IdentitySection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">{title}</h3>
      <div className="mt-2 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/65">{children}</div>
    </section>
  );
}

/** Rounded pill chips for Skills / Specializations / Categories. */
export function ChipList({ items, className, tone = "neutral" }: { items: string[]; className?: string; tone?: "neutral" | "yellow" }) {
  if (!items.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((it) => (
        <span
          key={it}
          className={cn(
            "rounded-full border px-3 py-1 text-[12px] font-medium",
            tone === "yellow"
              ? "border-[#ffd716]/60 bg-[#fffdf2] text-[#3d3d3d] dark:bg-[#ffd716]/10 dark:text-white/80"
              : "border-[#e5e5e5] text-[#3d3d3d] dark:border-white/15 dark:text-white/75",
          )}
        >
          {it}
        </span>
      ))}
    </div>
  );
}
