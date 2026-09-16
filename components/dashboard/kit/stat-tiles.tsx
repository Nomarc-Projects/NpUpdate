import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * KPI stat tiles — the 4-up row on every dashboard home (image 88/69).
 * Big number + label + a small context line (green delta, or neutral hint).
 */
export type Stat = {
  label: string;
  value: string | number;
  /** Small line under the value, e.g. "+1.5% vs last month" or "12 in review". */
  hint?: string;
  /** Colours the hint green (positive). Neutral grey otherwise. */
  positive?: boolean;
  /** When set, renders the whole tile as a link to this route. */
  href?: string;
};

export function StatTile({ stat, className }: { stat: Stat; className?: string }) {
  const body = (
    <>
      <p className="text-[12.5px] font-medium text-[#9a9a9a]">{stat.label}</p>
      <p className="mt-1.5 text-[26px] font-bold leading-none text-[#1e1e1e] dark:text-white">{stat.value}</p>
      {stat.hint && (
        <p className={cn("mt-1.5 text-[11.5px] font-medium", stat.positive ? "text-[#1a7f43] dark:text-[#4ade80]" : "text-[#9a9a9a]")}>
          {stat.hint}
        </p>
      )}
    </>
  );
  const classes = "rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]";
  if (stat.href) {
    return (
      <Link href={stat.href} className={cn(classes, className, "block transition-shadow hover:shadow-md hover:border-[#ffd716]")}>
        {body}
      </Link>
    );
  }
  return <div className={cn(classes, className)}>{body}</div>;
}

/**
 * Two per row at every width.
 *
 * Was `lg:grid-cols-4`, which squeezed four tiles into the dashboard's right-hand
 * column: labels like "Pending Verifications" and "Unread Messages" wrapped onto
 * three lines while the number sat alone underneath. Two per row gives each tile
 * room for its label on one line, and the pairs still read as a set.
 *
 * `cn` is twMerge, so a caller passing e.g. `lg:grid-cols-4` still overrides this.
 */
export function KpiTileRow({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {stats.map((s) => (
        <StatTile key={s.label} stat={s} />
      ))}
    </div>
  );
}
