import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PropertyReviewActions } from "@/components/admin/property-review-actions";
import { getAdminProperties, getAdminPropertyStats } from "@/lib/services/property-admin";
import { formatMoney } from "@/lib/properties/pricing";
import { propertyStatusLabel } from "@/lib/constants/property";
import { cn } from "@/lib/utils";

export const metadata = { title: "Nomarc Projects" };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "pending_approval", label: "Review queue", key: "pending" as const },
  { value: "changes_requested", label: "Changes requested", key: "changes" as const },
  { value: "approved_awaiting_payment", label: "Awaiting payment", key: "approved" as const },
  { value: "published", label: "Live", key: "live" as const },
  { value: "all", label: "All listings", key: "total" as const },
];

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status && TABS.some((t) => t.value === params.status) ? params.status : "pending_approval";
  const [items, stats] = await Promise.all([getAdminProperties(status), getAdminPropertyStats()]);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title="Nomarc Projects" subtitle="Review property listings, inspect uploaded documents and approve what goes live." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/properties" className="rounded-lg bg-[#1e1e1e] px-3 py-1.5 text-[12px] font-semibold text-white dark:bg-white dark:text-[#1e1e1e]">Listings</Link>
        <Link href="/admin/properties/listers" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Lister verification</Link>
        <Link href="/admin/properties/transactions" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Transactions</Link>
        <Link href="/admin/properties/fees" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Fee payments</Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {TABS.map((t) => (
          <Link key={t.value} href={`/admin/properties?status=${t.value}`} className={cn("rounded-xl border p-3 transition-colors", status === t.value ? "border-[#1e1e1e] bg-[#1e1e1e] text-white dark:border-white dark:bg-white dark:text-[#1e1e1e]" : "border-[#ececec] bg-white text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white")}>
            <p className="text-[11px] font-semibold opacity-60">{t.label}</p>
            <p className="mt-1 text-xl font-extrabold">{stats[t.key]}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/admin/properties/${item.id}`} className="text-[14px] font-bold text-[#1e1e1e] hover:underline dark:text-white">{item.title}</Link>
                <p className="mt-0.5 text-[12px] text-[#9a9a9a]">
                  {[item.city, item.state].filter(Boolean).join(", ")} · {item.kind.replaceAll("_", " ")} · {formatMoney(item.priceMinor, item.currency)}
                </p>
                <p className="mt-1 text-[11px] text-[#9a9a9a]">Owner {item.ownerUserId} · Documents {item.documentStatus} · Fee {item.feeAmountMinor != null ? formatMoney(item.feeAmountMinor, "NGN") : "—"}</p>
              </div>
              <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10.5px] font-semibold text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">{propertyStatusLabel(item.status)}</span>
            </div>
            {(item.status === "pending_approval" || item.status === "changes_requested") && <PropertyReviewActions id={item.id} />}
          </div>
        ))}
        {!items.length && (
          <div className="rounded-2xl border border-dashed border-[#dcdcdc] bg-white px-6 py-14 text-center text-[13px] text-[#9a9a9a] dark:border-white/15 dark:bg-[#1a1a1a]">
            Nothing in this queue.
          </div>
        )}
      </div>
    </div>
  );
}
