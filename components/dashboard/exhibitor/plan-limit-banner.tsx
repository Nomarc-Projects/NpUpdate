import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import type { ExhibitorLimitSummary } from "@/lib/services/exhibitor-trial-rules";
import { cn } from "@/lib/utils";

/**
 * Compact read of the exhibitor's plan and remaining allowance, shown above the
 * upload surfaces. Turns into a warning with an upgrade CTA the moment a cap is
 * reached — the visible half of the "block + tell them" rule the server actions
 * enforce.
 */
export function PlanLimitBanner({ limits }: { limits: ExhibitorLimitSummary | null }) {
  if (!limits) return null;

  if (limits.plan === "free") {
    return (
      <Frame warning>
        <Reason title="No active plan" body="Choose an exhibitor plan to publish products to your showroom." />
        <Upgrade label="View plans" />
      </Frame>
    );
  }

  const { atCategoryLimit, atUploadLimit, categoryCap, categoryUsed, perCategoryCap, totalActive, totalCap, nextPlanLabel } = limits;
  const usage = `${categoryUsed}/${categoryCap} categor${categoryCap === 1 ? "y" : "ies"} · ${totalActive}/${totalCap} products (max ${perCategoryCap} per category)`;

  // The upload allowance is the blocking one: a category slot being taken just
  // means another shop can't be opened, not that this upload fails. Warn only
  // when a listing can no longer be published.
  if (atUploadLimit) {
    const reason =
      totalActive >= totalCap
        ? `You've used all ${totalCap} listings on your plan.`
        : `A shop has reached its ${perCategoryCap}-product limit.`;
    return (
      <Frame warning>
        <Reason warning title="You've reached your upload limit" body={`${reason}${nextPlanLabel ? ` Upgrade to ${nextPlanLabel} to add more.` : ""}`} />
        {nextPlanLabel && <Upgrade label={`Upgrade to ${nextPlanLabel}`} />}
      </Frame>
    );
  }

  return (
    <Frame>
      <Reason title={`${limits.planLabel} plan`} body={usage} />
      {atCategoryLimit && nextPlanLabel && <Upgrade label={`Need more shops? Upgrade to ${nextPlanLabel}`} />}
    </Frame>
  );
}

function Frame({ warning = false, children }: { warning?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
        warning
          ? "border-[#ffd716] bg-[#fffdf2] dark:border-[#ffd716]/40 dark:bg-[#ffd716]/[0.06]"
          : "border-[#ececec] bg-[#fafafa] dark:border-white/10 dark:bg-white/[0.02]",
      )}
    >
      {children}
    </div>
  );
}

function Reason({ title, body, warning = false }: { title: string; body: string; warning?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      {warning && <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[#caa400]" />}
      <div>
        <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{title}</p>
        <p className="mt-0.5 text-[12px] text-[#6b6b6b] dark:text-white/60">{body}</p>
      </div>
    </div>
  );
}

function Upgrade({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard/plans"
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#1e1e1e] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#333] dark:bg-[#ffd716] dark:text-[#1e1e1e] dark:hover:bg-[#e6c114]"
    >
      {label} <ArrowUpRight size={14} />
    </Link>
  );
}
