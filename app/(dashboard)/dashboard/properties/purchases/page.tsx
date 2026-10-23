import Link from "next/link";
import { getMyPropertyFeePayments } from "@/lib/services/property-payments";
import { formatMoney } from "@/lib/properties/pricing";

export const metadata = { title: "Property fee payments" };
export const dynamic = "force-dynamic";

export default async function PropertyPurchasesPage() {
  const rows = await getMyPropertyFeePayments().catch(() => []);
  return (
    <div className="px-5 py-6 md:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Fee payments</h1>
      <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">Listing fees paid to publish properties on Nomarc Projects.</p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#ececec] bg-white dark:border-white/10 dark:bg-[#1e1e1e]">
        {rows.length ? (
          <div className="divide-y divide-[#f4f4f4] dark:divide-white/5">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{r.propertyTitle || "Property"}</p>
                  <p className="text-[11px] text-[#9a9a9a]">{r.reference} · {r.provider} · {new Date(r.createdAt).toLocaleDateString("en-NG")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">{formatMoney(r.amountMinor, "NGN")}</span>
                  <span className={r.status === "success" ? "rounded-full bg-[#eef7f0] px-2 py-1 text-[10.5px] font-semibold text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]" : "rounded-full bg-[#f4f4f4] px-2 py-1 text-[10.5px] font-semibold text-[#6b6b6b] dark:bg-white/5 dark:text-white/60"}>{r.status}</span>
                  {r.status === "pending" && <Link href={`/dashboard/properties/purchases/verify?reference=${r.reference}`} className="text-[11.5px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">Verify</Link>}
                  {r.status === "success" && r.propertySlug && <Link href={`/properties/${r.propertySlug}`} className="text-[11.5px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">View listing</Link>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-[13px] text-[#9a9a9a]">No listing fee payments yet.</p>
        )}
      </div>
    </div>
  );
}
