import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PropertyTransactionActions } from "@/components/admin/property-transaction-actions";
import { getAdminPropertyTransactions, getAdminTransactionStats } from "@/lib/services/property-transactions";
import { formatMoney } from "@/lib/properties/pricing";
import { cn } from "@/lib/utils";

export const metadata = { title: "Property transactions" };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "pending", label: "Pending", key: "pending" as const },
  { value: "completed", label: "Completed", key: "completed" as const },
  { value: "cancelled", label: "Cancelled", key: "cancelled" as const },
  { value: "all", label: "All transactions", key: "total" as const },
];

export default async function AdminPropertyTransactionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = params.status && TABS.some((t) => t.value === params.status) ? params.status : "pending";
  const [rows, stats] = await Promise.all([getAdminPropertyTransactions(status), getAdminTransactionStats()]);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title="Property transactions" subtitle="Confirm offline property transactions and issue buyer certificates." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/properties" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Listings</Link>
        <Link href="/admin/properties/listers" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Lister verification</Link>
        <Link href="/admin/properties/transactions" className="rounded-lg bg-[#1e1e1e] px-3 py-1.5 text-[12px] font-semibold text-white dark:bg-white dark:text-[#1e1e1e]">Transactions</Link>
        <Link href="/admin/properties/fees" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Fee payments</Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TABS.map((t) => (
          <Link key={t.value} href={`/admin/properties/transactions?status=${t.value}`} className={cn("rounded-xl border p-3 transition-colors", status === t.value ? "border-[#1e1e1e] bg-[#1e1e1e] text-white dark:border-white dark:bg-white dark:text-[#1e1e1e]" : "border-[#ececec] bg-white text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white")}>
            <p className="text-[11px] font-semibold opacity-60">{t.label}</p>
            <p className="mt-1 text-xl font-extrabold">{stats[t.key]}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">{r.propertyTitle || "Property removed"}</p>
                <p className="mt-0.5 text-[11.5px] text-[#9a9a9a]">Buyer {r.buyerName || r.buyerUserId} · Seller {r.sellerName || r.sellerUserId} · {new Date(r.createdAt).toLocaleDateString("en-NG")}</p>
                <p className="mt-1 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{formatMoney(r.amountMinor, r.currency)}</p>
                {r.certificateNo && <p className="mt-1 font-mono text-[11px] text-[#1f7a3d] dark:text-[#4ade80]">Certificate {r.certificateNo}</p>}
              </div>
              <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10.5px] font-semibold text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">{r.status}</span>
            </div>
            <PropertyTransactionActions id={r.id} status={r.status} />
          </div>
        ))}
      </div>
      {!rows.length && <div className="rounded-2xl border border-dashed border-[#dcdcdc] bg-white px-6 py-14 text-center text-[13px] text-[#9a9a9a] dark:border-white/15 dark:bg-[#1a1a1a]">No transactions in this queue.</div>}
    </div>
  );
}
