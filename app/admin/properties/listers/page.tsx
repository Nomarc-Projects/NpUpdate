import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ListerReviewActions } from "@/components/admin/lister-review-actions";
import { getAdminListers, getAdminListerStats } from "@/lib/services/property-listers";
import { privateDownloadUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lister verification" };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "pending", label: "Pending", key: "pending" as const },
  { value: "verified", label: "Verified", key: "verified" as const },
  { value: "rejected", label: "Rejected", key: "rejected" as const },
  { value: "all", label: "All listers", key: "total" as const },
];

export default async function AdminListersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = params.status && TABS.some((t) => t.value === params.status) ? params.status : "pending";
  const [rows, stats] = await Promise.all([getAdminListers(status), getAdminListerStats()]);
  const withDocs = await Promise.all(rows.map(async (r) => ({
    ...r,
    cacUrl: r.cacDocumentKey ? await privateDownloadUrl(r.cacDocumentKey, 600).catch(() => null) : null,
    idUrl: r.idDocumentKey ? await privateDownloadUrl(r.idDocumentKey, 600).catch(() => null) : null,
  })));

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title="Lister verification" subtitle="Review lister identity and CAC documents before granting a verified badge." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/properties" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Listings</Link>
        <Link href="/admin/properties/listers" className="rounded-lg bg-[#1e1e1e] px-3 py-1.5 text-[12px] font-semibold text-white dark:bg-white dark:text-[#1e1e1e]">Lister verification</Link>
        <Link href="/admin/properties/transactions" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Transactions</Link>
        <Link href="/admin/properties/fees" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">Fee payments</Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TABS.map((t) => (
          <Link key={t.value} href={`/admin/properties/listers?status=${t.value}`} className={cn("rounded-xl border p-3 transition-colors", status === t.value ? "border-[#1e1e1e] bg-[#1e1e1e] text-white dark:border-white dark:bg-white dark:text-[#1e1e1e]" : "border-[#ececec] bg-white text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white")}>
            <p className="text-[11px] font-semibold opacity-60">{t.label}</p>
            <p className="mt-1 text-xl font-extrabold">{stats[t.key]}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {withDocs.map((r) => (
          <div key={r.id} className="rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-[#1e1e1e] dark:text-white">{r.displayName || "Unnamed lister"}</p>
                <p className="mt-0.5 text-[12px] text-[#9a9a9a]">{r.listerType.replaceAll("_", " ")}{r.companyName ? ` · ${r.companyName}` : ""}{r.cacNumber ? ` · ${r.cacNumber}` : ""}</p>
                <p className="mt-1 text-[11px] text-[#9a9a9a]">{r.phone || "No phone"} · {r.email || "No email"} · {r.listings} listings</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[10.5px] font-semibold", r.verificationStatus === "verified" ? "bg-[#eef7f0] text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]" : r.verificationStatus === "pending" ? "bg-[#fff8e6] text-[#8a6100] dark:bg-amber-500/10 dark:text-amber-300" : r.verificationStatus === "rejected" ? "bg-[#fdecec] text-[#b4232a] dark:bg-red-500/10 dark:text-red-300" : "bg-[#f4f4f4] text-[#6b6b6b] dark:bg-white/5 dark:text-white/60")}>{r.verificationStatus}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11.5px]">
              {r.cacUrl ? <a href={r.cacUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">Open CAC certificate</a> : <span className="text-[#9a9a9a]">No CAC file</span>}
              {r.idUrl ? <a href={r.idUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">Open ID</a> : <span className="text-[#9a9a9a]">No ID file</span>}
            </div>
            {r.verificationNote && <p className="mt-2 rounded-lg bg-[#fafafa] px-3 py-2 text-[11.5px] text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">{r.verificationNote}</p>}
            {r.verificationStatus === "pending" && <ListerReviewActions id={r.id} />}
          </div>
        ))}
      </div>
      {!withDocs.length && (
        <div className="rounded-2xl border border-dashed border-[#dcdcdc] bg-white px-6 py-14 text-center text-[13px] text-[#9a9a9a] dark:border-white/15 dark:bg-[#1a1a1a]">No lister profiles in this queue.</div>
      )}
    </div>
  );
}
