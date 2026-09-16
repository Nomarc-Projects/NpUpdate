import { cn } from "@/lib/utils";

/* ─── base ───────────────────────────────────────────────────────────────── */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("skeleton rounded-md", className)} style={style} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/* ─── mid-level ──────────────────────────────────────────────────────────── */

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
      <Skeleton className="aspect-[16/10] w-full rounded-xl" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] divide-y divide-[#f3f3f3] dark:divide-white/5 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-40 max-w-[60%]" />
            <Skeleton className="h-3 w-28 max-w-[40%]" />
          </div>
          <Skeleton className="hidden sm:block h-3 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ─── full-page skeletons ────────────────────────────────────────────────── */

/** Root /dashboard — stat cards + quick-action grid */
export function DashboardSkeleton({ variant = "grid" }: { variant?: "grid" | "rows" }) {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-64 max-w-[70vw]" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl flex-shrink-0" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      {variant === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <SkeletonRows rows={8} />
      )}
    </div>
  );
}

/**
 * Jobs browse — full-height with toolbar + collapsible filter sidebar + job card grid.
 * Matches jobs-browse.tsx layout exactly.
 */
export function SkeletonJobsBrowse() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-screen min-h-0 overflow-hidden">
      {/* header */}
      <div className="px-5 sm:px-6 pt-6 pb-3 flex-shrink-0 space-y-1.5">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3.5 w-64 max-w-[80vw]" />
      </div>
      {/* toolbar */}
      <div className="px-5 sm:px-6 pb-3 flex items-center gap-2.5 flex-shrink-0">
        <Skeleton className="h-8 w-20 rounded-full flex-shrink-0" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      {/* body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* filter sidebar — desktop only */}
        <div className="hidden lg:flex flex-col w-[232px] flex-shrink-0 border-r border-[#f0f0f0] dark:border-white/10 px-5 py-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-3 w-12" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-7 w-full rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
        {/* job card grid */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#f5f5f5] dark:border-white/5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Messages — full-height: page header + sidebar conversation list + chat thread pane.
 * Matches messages-view.tsx layout.
 */
export function SkeletonMessages() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-screen min-h-0 overflow-hidden">
      {/* page header */}
      <div className="px-6 md:px-8 py-5 border-b border-[#ececec] dark:border-white/10 flex-shrink-0 space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3.5 w-64 max-w-[80vw]" />
      </div>
      {/* body */}
      <div className="flex-1 flex min-h-0">
        {/* conversation sidebar — hidden on mobile */}
        <div className="hidden sm:flex flex-col w-[320px] flex-shrink-0 border-r border-[#ececec] dark:border-white/10">
          <div className="p-3 space-y-3 flex-shrink-0">
            <Skeleton className="h-9 w-full rounded-full" />
            <div className="flex gap-1.5">
              {[64, 72, 80].map((w, i) => <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />)}
            </div>
          </div>
          <Skeleton className="mx-3 mb-1 h-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 overflow-hidden divide-y divide-[#f5f5f5] dark:divide-white/5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-40 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* thread area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#ececec] dark:border-white/10 flex-shrink-0">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex-1 p-5 space-y-4">
            {[false, true, false, false, true, true].map((right, i) => (
              <div key={i} className={cn("flex", right ? "justify-end" : "justify-start")}>
                <Skeleton className={cn("h-9 rounded-2xl", right ? "w-48 rounded-br-sm" : "w-56 rounded-bl-sm")} />
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-[#f0f0f0] dark:border-white/10 flex gap-3 flex-shrink-0">
            <Skeleton className="flex-1 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Billing — h1 + plan card + 2-col invoice/payment grid + billing history table.
 * Matches billing-view.tsx layout exactly.
 */
export function SkeletonBilling() {
  return (
    <div className="px-5 sm:px-8 py-6 max-w-[980px] mx-auto space-y-5">
      {/* h1 */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      {/* current plan card */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
      {/* next invoice + payment method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* next invoice */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-24" />
          <div className="space-y-1.5">
            <div className="flex justify-between"><Skeleton className="h-3 w-10" /><Skeleton className="h-3 w-28" /></div>
            <div className="flex justify-between"><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-36" /></div>
          </div>
        </div>
        {/* payment method */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-36" />
        </div>
      </div>
      {/* billing history */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 sm:px-6 py-3.5 border-b border-[#f3f3f3] dark:border-white/5 last:border-0">
            <Skeleton className="h-3.5 w-20 flex-shrink-0" />
            <Skeleton className="h-3.5 flex-1 max-w-[200px]" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-3.5 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Profile — avatar header + tabs + form sections */
export function SkeletonProfile() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      {/* avatar + name */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-6">
        <div className="flex items-start gap-5">
          <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-9 w-24 rounded-xl flex-shrink-0" />
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-8" /></div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
      <div className="flex gap-2">
        {[80, 100, 90].map((w, i) => <Skeleton key={i} className="h-9 rounded-full" style={{ width: w }} />)}
      </div>
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-full rounded-xl" /></div>
            ))}
          </div>
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/**
 * Wallet — 2 balance cards + bank account card + earnings ledger.
 * Matches wallet-view.tsx (NOT a dark hero card).
 */
export function SkeletonWallet() {
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[920px] mx-auto space-y-4">
      {/* h1 + subtitle */}
      <div className="mb-5 space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
      {/* 2 balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[true, false].map((hasBtn, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              {hasBtn && <Skeleton className="h-8 w-24 rounded-lg" />}
            </div>
            <Skeleton className="mt-2 h-8 w-32" />
          </div>
        ))}
      </div>
      {/* settlement account */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      {/* earnings activity */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Plans — h1 + cycle toggle + 3 plan tier cards.
 * Matches plans-view.tsx.
 */
export function SkeletonPlans() {
  return (
    <div className="px-6 md:px-8 py-8 max-w-[1100px]">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
      {/* cycle toggle */}
      <div className="mt-6 inline-flex items-center rounded-full bg-[#f0f0f0] dark:bg-white/5 p-1 gap-1">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      {/* plan cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cn(
            "rounded-2xl border p-5 sm:p-6 flex flex-col",
            i === 0
              ? "border-[#ffd716] ring-2 ring-[#ffd716]/30 bg-white dark:bg-[#1e1e1e]"
              : "border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e]"
          )}>
            <div className="flex items-center justify-between">
              <Skeleton className="w-9 h-9 rounded-lg" />
              {i === 0 && <Skeleton className="h-5 w-16 rounded-full" />}
            </div>
            <Skeleton className="mt-3 h-5 w-28" />
            <Skeleton className="mt-1.5 h-3 w-36" />
            <div className="mt-3 flex items-baseline gap-1">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
            <ul className="mt-4 space-y-2.5 flex-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <li key={j} className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
                  <Skeleton className="h-3 flex-1 max-w-[160px]" />
                </li>
              ))}
            </ul>
            <Skeleton className="mt-5 h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Notifications — framed max-w-[760px] card with header bar + tab pills + notification rows.
 * Matches notifications-view.tsx exactly.
 */
export function SkeletonNotifications() {
  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[760px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-lg flex-shrink-0" />
        </div>
        {/* tabs + rows */}
        <div className="p-6">
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {[64, 72, 72, 80].map((w, i) => <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />)}
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-[#ececec] dark:border-white/10 p-3.5">
                <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="w-3 h-3 rounded-full flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Project Management — framed card with header + project rows with progress bars */
export function SkeletonPM() {
  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[1100px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div className="space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#f0f0f0] dark:border-white/10 p-4 flex items-center gap-4">
              <Skeleton className="w-1.5 h-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="w-6 h-6 rounded-full -ml-1 first:ml-0" />)}
              </div>
              <Skeleton className="h-3 w-20 hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Products browse/my-products — search + filter chips + product card grid */
export function SkeletonProductsGrid() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-6 w-44" /><Skeleton className="h-3.5 w-64 max-w-[70vw]" /></div>
        <Skeleton className="h-9 w-28 rounded-xl flex-shrink-0" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px] rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {[80, 72, 88, 64, 96].map((w, i) => <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3 space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Orders (exhibitor) — Kanban board with 4 status columns.
 * Matches orders-view.tsx layout.
 */
export function SkeletonOrders() {
  const cols = ["Pending", "Confirmed", "Shipped", "Completed"];
  const counts = [3, 2, 2, 1];
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6">
      <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3.5 w-56 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cols.map((col, ci) => (
          <div key={col} className="rounded-2xl bg-[#fafafa] dark:bg-white/[0.02] p-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-4" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: counts[ci] }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <div className="flex items-center justify-between pt-0.5">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * My-Orders (buyer) — max-w-[1000px] list of orders with product image + name + date + amount + status.
 * Matches buyer/my-orders.tsx layout.
 */
export function SkeletonMyOrders() {
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1000px] mx-auto">
      <div className="mb-5 space-y-1.5">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] divide-y divide-[#f5f5f5] dark:divide-white/5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 sm:px-5 py-3.5">
            <Skeleton className="w-11 h-11 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-3.5 w-40 max-w-[70%]" />
              <Skeleton className="h-3 w-32 max-w-[50%]" />
            </div>
            <Skeleton className="hidden sm:block h-3.5 w-16" />
            <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
            <Skeleton className="hidden sm:block h-3.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Applications — framed max-w-[940px] card with header bar + tabs + desktop table.
 * Matches applications.tsx layout exactly.
 */
export function SkeletonApplications() {
  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[940px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10">
          <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-14 rounded-lg" />
            <Skeleton className="hidden sm:block h-8 w-16 rounded-lg" />
          </div>
        </div>
        {/* tabs + table */}
        <div className="p-6">
          <div className="flex gap-2 mb-4">
            {[64, 88, 72].map((w, i) => <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />)}
          </div>
          {/* desktop table */}
          <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_1fr_100px_110px_60px] gap-4 px-5 py-3 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#ececec] dark:border-white/10">
              {[72, 72, 56, 52, 0].map((w, i) => w > 0 ? <Skeleton key={i} className="h-3" style={{ width: w }} /> : <span key={i} />)}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="hidden md:grid grid-cols-[1fr_1fr_100px_110px_60px] gap-4 items-center px-5 py-3.5 border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-3.5 w-8" />
              </div>
            ))}
            {/* mobile cards */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="md:hidden border-b border-[#f5f5f5] dark:border-white/5 last:border-0 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-40 max-w-full" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Find Professionals / People / Verified Pros — full-height with toolbar + filter sidebar + person cards.
 * Matches find-professionals.tsx layout.
 */
export function SkeletonPeopleGrid() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-screen min-h-0 overflow-hidden">
      {/* header */}
      <div className="px-5 sm:px-6 pt-6 pb-3 flex-shrink-0 space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3.5 w-72 max-w-[80vw]" />
      </div>
      {/* toolbar */}
      <div className="px-5 sm:px-6 pb-3 flex items-center gap-2.5 flex-shrink-0">
        <Skeleton className="h-8 w-20 rounded-full flex-shrink-0" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="hidden sm:block h-8 w-20 rounded-full" />
      </div>
      {/* body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* filter sidebar */}
        <div className="hidden lg:flex flex-col w-[232px] flex-shrink-0 border-r border-[#f0f0f0] dark:border-white/10 px-5 py-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-3 w-12" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-7 w-full rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
        {/* person cards — 2-col grid matching default `g2` view */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
                    <div className="min-w-0 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
                </div>
                {/* skills tags */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[60, 72, 56, 80].map((w, j) => <Skeleton key={j} className="h-6 rounded-full" style={{ width: w }} />)}
                </div>
                {/* action buttons */}
                <div className="mt-3 pt-3 border-t border-[#f5f5f5] dark:border-white/5 flex items-center gap-2">
                  <Skeleton className="flex-1 h-9 rounded-lg" />
                  <Skeleton className="flex-1 h-9 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings hub — max-w-[760px]: profile card + availability toggle + completion banner
 * + grouped navigable link rows + appearance switcher.
 * Matches settings-hub.tsx layout exactly.
 */
export function SkeletonSettings() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[760px] mx-auto space-y-4">
      <Skeleton className="h-7 w-28 mb-1" />
      {/* profile card */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
          <Skeleton className="h-9 w-16 rounded-lg flex-shrink-0" />
        </div>
        {/* availability toggle */}
        <div className="mt-4 pt-4 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
      {/* completion banner (dark) */}
      <div className="rounded-2xl bg-[#1e1e1e] dark:bg-[#262626] p-4 sm:p-5 flex items-center gap-4">
        <Skeleton className="w-11 h-11 rounded-full bg-white/10 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40 bg-white/10" />
          <Skeleton className="h-3 w-56 max-w-full bg-white/10" />
        </div>
        <Skeleton className="w-5 h-5 rounded bg-white/10 flex-shrink-0" />
      </div>
      {/* groups of navigable link rows */}
      {[["Account", 4], ["Membership", 3], ["Preferences", 3]].map(([label, count]) => (
        <div key={label as string}>
          <Skeleton className="h-3 w-20 mb-2 mx-1" />
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] divide-y divide-[#f3f3f3] dark:divide-white/5 overflow-hidden">
            {Array.from({ length: count as number }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="w-4 h-4 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* appearance */}
      <div>
        <Skeleton className="h-3 w-24 mb-2 mx-1" />
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Practice Templates — category pills + template cards */
export function SkeletonTemplates() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-6 w-52" /><Skeleton className="h-3.5 w-64 max-w-[70vw]" /></div>
        <Skeleton className="h-9 w-28 rounded-xl flex-shrink-0" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {[80, 96, 72, 88, 64].map((w, i) => <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 flex gap-4 items-start">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-lg ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Industry Report — stat cards + chart placeholder + data rows */
export function SkeletonReport() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="space-y-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-3.5 w-64 max-w-[70vw]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-52 w-full rounded-2xl" />
      <SkeletonRows rows={5} />
    </div>
  );
}

/** Company profile form — logo + form sections */
export function SkeletonCompanyForm() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-6 flex items-center gap-5">
        <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-44" /><Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl flex-shrink-0" />
      </div>
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-4">
          <Skeleton className="h-4 w-28" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-full rounded-xl" /></div>
            ))}
          </div>
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Companies directory — search + company card grid */
export function SkeletonCompaniesGrid() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-6 w-44" /><Skeleton className="h-3.5 w-64 max-w-[70vw]" /></div>
        <Skeleton className="h-9 w-28 rounded-xl flex-shrink-0" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px] rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
              <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
            </div>
            <SkeletonText lines={2} />
            <div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /></div>
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Saved lists */
export function SkeletonLists() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-3.5 w-48 max-w-[70vw]" /></div>
        <Skeleton className="h-9 w-28 rounded-xl flex-shrink-0" />
      </div>
      <SkeletonRows rows={6} />
    </div>
  );
}

/** Quotes */
export function SkeletonQuotes() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-3.5 w-48 max-w-[70vw]" /></div>
        <Skeleton className="h-9 w-28 rounded-xl flex-shrink-0" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <SkeletonRows rows={6} />
    </div>
  );
}

/** Services listing */
export function SkeletonServices() {
  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-6 w-28" /><Skeleton className="h-3.5 w-52 max-w-[70vw]" /></div>
        <Skeleton className="h-9 w-28 rounded-xl flex-shrink-0" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 flex gap-4 items-start">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-8 w-24 rounded-xl mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
