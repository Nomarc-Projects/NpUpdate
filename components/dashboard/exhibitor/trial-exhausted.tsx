import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * Full-screen counterpart to ExhibitorTrialModal, shown when someone reaches
 * /dashboard/add-product directly with their free listing already spent. Mirrors
 * VerificationRequired, which gates the same route one step earlier.
 */
export function TrialExhausted({ expired, daysLeft }: { expired: boolean; daysLeft: number }) {
  return (
    <div className="mx-auto max-w-[720px] px-5 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#ececec] bg-white p-6 dark:border-white/10 dark:bg-[#1e1e1e] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10">
            <Lock size={24} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[19px] font-bold text-[#1e1e1e] dark:text-white">
              {expired ? "Your free trial has ended" : "You've used your free listing"}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
              {expired
                ? "Your 30-day trial covered one published product. Activate an exhibitor subscription to publish again — your existing listings are safe as drafts."
                : `Your free trial covers one published product${daysLeft > 0 ? `, and you have ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}. Activate a subscription to list your full inventory.`}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                href="/dashboard/settings/account?tab=billing"
                className="inline-flex items-center justify-center rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13.5px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
              >
                Activate Subscription
              </Link>
              <Link
                href="/dashboard?tab=catalog"
                className="inline-flex items-center justify-center rounded-xl border border-[#e3e3e3] px-5 py-2.5 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
              >
                Back to catalog
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
