import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PayListingFee } from "@/components/dashboard/properties/pay-listing-fee";
import { PropertyOutcomeActions } from "@/components/dashboard/properties/property-outcome-actions";
import { getOwnedProperties } from "@/lib/services/properties";
import { propertyStatusLabel } from "@/lib/constants/property";
import { formatMoney } from "@/lib/properties/pricing";

export const metadata = { title: "My properties" };
export const dynamic = "force-dynamic";

export default async function PropertyListingsPage() {
  const items = await getOwnedProperties().catch(() => []);
  return (
    <div className="px-5 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">My properties</h1>
          <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">Every listing you’ve created, including drafts and items in review.</p>
        </div>
        <Link href="/dashboard/properties/new" className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e1e1e] px-4 py-2.5 text-[12.5px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]"><PlusCircle size={14} /> Add property</Link>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e] sm:flex-row sm:items-center">
            <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-[#f4f4f4] dark:bg-white/5">
              {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">{item.title}</p>
              <p className="mt-0.5 text-[12px] text-[#9a9a9a]">{[item.city, item.state].filter(Boolean).join(", ")} · {item.kind.replaceAll("_", " ")}</p>
              <p className="mt-1 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{formatMoney(item.priceMinor, item.currency)}</p>
              {item.status === "changes_requested" && item.rejectionReason && (
                <p className="mt-1 max-w-xl rounded-lg bg-[#fff8e6] px-2.5 py-1.5 text-[11.5px] text-[#8a5a00] dark:bg-[#f59e0b]/10 dark:text-[#fbbf24]">Admin note: {item.rejectionReason}</p>
              )}
              {item.status === "rejected" && item.rejectionReason && (
                <p className="mt-1 max-w-xl rounded-lg bg-[#fff1f1] px-2.5 py-1.5 text-[11.5px] text-[#b4232a] dark:bg-[#e5484d]/10 dark:text-[#f87171]">Rejected: {item.rejectionReason}</p>
              )}
              {item.feeStatus === "paid" && <p className="mt-1 text-[11px] font-semibold text-[#1f7a3d] dark:text-[#4ade80]">Listing fee paid</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10.5px] font-semibold text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">{propertyStatusLabel(item.status)}</span>
              {item.status === "published" && <Link href={`/properties/${item.slug}`} className="rounded-lg border border-[#e3e3e3] px-2.5 py-1.5 text-[11.5px] font-semibold dark:border-white/15">View live</Link>}
              {["draft", "changes_requested", "rejected"].includes(item.status) && <Link href={`/dashboard/properties/listings/${item.id}/edit`} className="rounded-lg border border-[#e3e3e3] px-2.5 py-1.5 text-[11.5px] font-semibold dark:border-white/15">{item.status === "draft" ? "Continue draft" : "Edit & resubmit"}</Link>}
              {item.status === "approved_awaiting_payment" && <PayListingFee propertyId={item.id} feeMinor={item.feeAmountMinor} />}
              {item.status === "published" && <PropertyOutcomeActions id={item.id} kind={item.kind} />}
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="rounded-2xl border border-dashed border-[#dcdcdc] bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-[#1a1a1a]">
            <p className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">No properties yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-[#9a9a9a]">Drafts, listings in review and live properties all appear here.</p>
            <Link href="/dashboard/properties/new" className="mt-4 inline-flex rounded-lg bg-[#1e1e1e] px-4 py-2 text-[12px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]">Add your first property</Link>
          </div>
        )}
      </div>
    </div>
  );
}
