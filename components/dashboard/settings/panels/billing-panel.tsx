"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, ExternalLink, Loader2, Receipt } from "lucide-react";
import { getMyTransactions, type TxRow } from "@/lib/services/billing";
import { getTrialState } from "@/lib/services/exhibitor-trial";
import type { TrialState } from "@/lib/services/exhibitor-trial-rules";
import { useViewer } from "@/lib/use-viewer";
import { PLAN_LABEL, REPORT_PRICING, CYCLE_MONTHS, type BillingCycle, type Plan } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

const naira = (n: number) => `₦${n.toLocaleString()}`;

const REPORT_TIERS: { cycle: BillingCycle; label: string; per: string; blurb: string; popular?: boolean }[] = [
  { cycle: "monthly", label: "Monthly", per: "month", blurb: "Billed monthly, cancel anytime." },
  { cycle: "biannual", label: "Bi-Annual", per: "6 months", blurb: "Uninterrupted access for 6 months.", popular: true },
  { cycle: "annual", label: "Annual", per: "year", blurb: "Billed yearly." },
];

const STATUS_STYLE: Record<string, string> = {
  success: "bg-[#e8f6ed] text-[#1a7f43] dark:bg-[#1a7f43]/15 dark:text-[#4ade80]",
  pending: "bg-[#fff7cc] text-[#8a7400] dark:bg-[#ffd716]/15 dark:text-[#ffd716]",
  failed: "bg-[#fdecec] text-[#e5484d] dark:bg-[#e5484d]/15 dark:text-[#ff8a8d]",
  refunded: "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60",
};

/**
 * Billing & Subscriptions — the section present in the settings design that the
 * tab set was missing. Deliberately a summary plus real payment history: plan
 * changes and checkout already live at /dashboard/plans and /dashboard/billing,
 * so this links there rather than duplicating a second checkout flow.
 */
export function BillingPanel({ paymentPlansEnabled = true }: { paymentPlansEnabled?: boolean }) {
  const { plan } = useViewer();
  const [rows, setRows] = useState<TxRow[] | null>(null);
  const [trial, setTrial] = useState<TrialState | null>(null);

  useEffect(() => {
    getMyTransactions().then(setRows).catch(() => setRows([]));
    // Resolves to isExhibitor:false for everyone else, so the trial card simply
    // doesn't render for professionals.
    getTrialState().then(setTrial).catch(() => {});
  }, []);

  const planLabel = PLAN_LABEL[(plan ?? "free") as Plan] ?? "Free";
  const isFree = (plan ?? "free") === "free";

  return (
    <div className="space-y-7">
      {/* Exhibitors are sent here by the upload gate, so their standing has to be
          the first thing on the page — not buried under professional plan copy. */}
      {trial?.isExhibitor && !trial.subscribed && (
        <section className="rounded-xl border border-[#ffd716]/40 bg-[#fffdf2] p-4 dark:border-[#ffd716]/20 dark:bg-[#ffd716]/[0.06]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">
                {trial.inTrial ? "Free exhibitor trial" : "Free trial ended"}
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#8a7400] dark:text-[#ffd716]">
                {trial.inTrial
                  ? `${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left · ${trial.publishedCount} of ${trial.listingCap} free listing${trial.listingCap === 1 ? "" : "s"} published`
                  : "Published listings have moved back to drafts. Activate a subscription to publish again — nothing was deleted."}
              </p>
            </div>
            {paymentPlansEnabled && (
              <Link
                href="/dashboard/plans"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#ffd716] px-4 py-2 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
              >
                Activate Subscription
              </Link>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Current plan</h2>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Your subscription tier and what it unlocks across your active profiles.</p>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#ececec] bg-[#fafafa] px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffd716]/20 text-[#caa400]">
              <CreditCard size={18} />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-[#1e1e1e] dark:text-white">{planLabel}</p>
              <p className="text-[12px] text-[#9a9a9a]">{isFree ? "No active subscription" : "Active subscription"}</p>
            </div>
          </div>
          {paymentPlansEnabled && (
            <Link
              href="/dashboard/plans"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-4 py-2 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
            >
              {isFree ? "View plans" : "Change plan"}
            </Link>
          )}
        </div>
      </section>

      <div className="h-px bg-[#ececec] dark:bg-white/10" />

      <section>
        <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Industry Reports Plans</h2>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Unlock premium market data, insights, and trends to stay ahead in the industry.</p>

        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {REPORT_TIERS.map((t) => {
            const saving = REPORT_PRICING.monthly * CYCLE_MONTHS[t.cycle] - REPORT_PRICING[t.cycle];
            return (
              <div
                key={t.cycle}
                className={cn(
                  "flex flex-col rounded-xl border p-4",
                  t.popular ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]" : "border-[#ececec] dark:border-white/10",
                )}
              >
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{t.label}</p>
                  {t.popular && <span className="rounded-full bg-[#ffd716]/25 px-2 py-0.5 text-[10.5px] font-bold text-[#8a7400]">Most Popular</span>}
                </div>
                <p className="mt-2 text-xl font-extrabold text-[#1e1e1e] dark:text-white">
                  {naira(REPORT_PRICING[t.cycle])}
                  <span className="text-[12px] font-medium text-[#9a9a9a]"> / {t.per}</span>
                </p>
                {/* Only shown when there genuinely is one — the bi-annual tier saves nothing. */}
                {saving > 0 && <p className="mt-1 text-[11.5px] font-semibold text-[#16803c]">Saves you {naira(saving)}</p>}
                <p className="mt-2 flex-1 text-[12px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{t.blurb}</p>
                <button
                  disabled
                  title="The Industry Report is still in production."
                  className="mt-3 w-full cursor-not-allowed rounded-lg bg-[#f0f0f0] py-2 text-[12.5px] font-semibold text-[#9a9a9a] dark:bg-white/10"
                >
                  Coming soon
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-[#ececec] dark:bg-white/10" />

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Payment history</h2>
            <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Every charge on this account, newest first.</p>
          </div>
          <Link href="/dashboard/billing" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#1e1e1e] hover:underline dark:text-white">
            Full billing page <ExternalLink size={12} />
          </Link>
        </div>

        {rows === null ? (
          <div className="mt-4 flex items-center gap-2 text-[13px] text-[#9a9a9a]">
            <Loader2 size={14} className="animate-spin" /> Loading your payments…
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#e3e3e3] px-4 py-8 text-center dark:border-white/15">
            <Receipt size={22} className="mx-auto mb-2 text-[#d4d4d4]" />
            <p className="text-[13.5px] font-medium text-[#1e1e1e] dark:text-white">No payments yet</p>
            <p className="mt-0.5 text-[12.5px] text-[#9a9a9a]">Charges appear here once you subscribe to a paid plan.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#ececec] dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-[#ececec] dark:border-white/10">
                    {["Plan", "Amount", "Date", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className="border-b border-[#f2f2f2] last:border-0 dark:border-white/5">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">{t.planLabel}</p>
                        <p className="text-[11.5px] text-[#9a9a9a] capitalize">{t.cycle.replace(/_/g, " ")}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#1e1e1e] dark:text-white">{naira(t.amount)}</td>
                      <td className="px-4 py-3 text-[12.5px] text-[#6b6b6b] dark:text-white/60">{t.date}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold capitalize", STATUS_STYLE[t.status] ?? STATUS_STYLE.pending)}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
