import Link from "next/link";
import { ArrowUpRight, Building2, Eye, FileClock, PlusCircle } from "lucide-react";
import { getOwnedProperties, getOwnerPropertyStats } from "@/lib/services/properties";
import { propertyStatusLabel } from "@/lib/constants/property";
import { formatMoney } from "@/lib/properties/pricing";

export const metadata = { title: "Nomarc Projects" };
export const dynamic = "force-dynamic";

export default async function PropertiesDashboardPage() {
  const [stats, items] = await Promise.all([
    getOwnerPropertyStats().catch(() => ({ total: 0, live: 0, pending: 0, drafts: 0, views: 0 })),
    getOwnedProperties().catch(() => []),
  ]);
  const recent = items.slice(0, 4);

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22c55e]">Nomarc Projects</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Your property workspace</h1>
          <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">List properties, follow review status and see how buyers find them.</p>
        </div>
        <Link href="/dashboard/properties/new" className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e1e1e] px-4 py-2.5 text-[12.5px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]"><PlusCircle size={14} /> Add property</Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total listings", value: stats.total, icon: Building2 },
          { label: "Live", value: stats.live, icon: ArrowUpRight },
          { label: "In review", value: stats.pending, icon: FileClock },
          { label: "Total views", value: stats.views, icon: Eye },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex items-center justify-between">
              <p className="text-[11.5px] font-semibold text-[#9a9a9a]">{s.label}</p>
              <s.icon size={14} className="text-[#9a9a9a]" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#1e1e1e] dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-[#ececec] bg-white dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3 dark:border-white/10">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Recent listings</p>
          <Link href="/dashboard/properties/listings" className="text-[11.5px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">View all</Link>
        </div>
        {recent.length ? (
          <div className="divide-y divide-[#f4f4f4] dark:divide-white/5">
            {recent.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#f4f4f4] dark:bg-white/5">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{item.title}</p>
                  <p className="text-[11px] text-[#9a9a9a]">{formatMoney(item.priceMinor, item.currency)} · {propertyStatusLabel(item.status)}</p>
                </div>
                <span className="text-[11px] font-medium text-[#9a9a9a]">{item.status.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">No listings yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-[#9a9a9a]">Add your first property to start receiving inquiries.</p>
            <Link href="/dashboard/properties/new" className="mt-3 inline-flex rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold dark:border-white/15">Add property</Link>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/properties/inquiries" className="rounded-2xl border border-[#ececec] bg-white p-4 transition-colors hover:border-[#22c55e] dark:border-white/10 dark:bg-[#1e1e1e]">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Inquiries</p>
          <p className="mt-1 text-[12px] text-[#9a9a9a]">Buyer messages about your properties.</p>
        </Link>
        <Link href="/dashboard/properties/saved" className="rounded-2xl border border-[#ececec] bg-white p-4 transition-colors hover:border-[#22c55e] dark:border-white/10 dark:bg-[#1e1e1e]">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Saved properties</p>
          <p className="mt-1 text-[12px] text-[#9a9a9a]">Properties you bookmarked while browsing.</p>
        </Link>
        <Link href="/dashboard/properties/transactions" className="rounded-2xl border border-[#ececec] bg-white p-4 transition-colors hover:border-[#22c55e] dark:border-white/10 dark:bg-[#1e1e1e]">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Transactions</p>
          <p className="mt-1 text-[12px] text-[#9a9a9a]">Purchase requests, completed sales and certificates.</p>
        </Link>
        <Link href="/properties/sowr" className="rounded-2xl border border-[#ececec] bg-white p-4 transition-colors hover:border-[#22c55e] dark:border-white/10 dark:bg-[#1e1e1e]">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">SOWR program</p>
          <p className="mt-1 text-[12px] text-[#9a9a9a]">Join the real estate ownership program.</p>
        </Link>
      </div>
    </div>
  );
}
