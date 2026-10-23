import Link from "next/link";
import { Handshake } from "lucide-react";
import { getMyPropertyTransactions } from "@/lib/services/property-transactions";
import { CancelPurchaseButton } from "@/components/properties/cancel-purchase-button";
import { formatMoney } from "@/lib/properties/pricing";
import { cn } from "@/lib/utils";

export const metadata = { title: "Property transactions" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending: "bg-[#fff8e6] text-[#8a6100] dark:bg-amber-500/10 dark:text-amber-300",
  paid: "bg-[#eef7f0] text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]",
  completed: "bg-[#eef7f0] text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]",
  cancelled: "bg-[#fdecec] text-[#b4232a] dark:bg-red-500/10 dark:text-red-300",
};

export default async function PropertyTransactionsPage() {
  const rows = await getMyPropertyTransactions().catch(() => []);
  return (
    <div className="px-5 py-6 md:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22c55e]">Nomarc Projects</p>
      <h1 className="mt-1 inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">
        <Handshake size={22} className="text-[#1f7a3d] dark:text-[#4ade80]" /> Transactions
      </h1>
      <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">Purchase requests you started and offers on your listings.</p>

      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">{r.propertyTitle || "Property"}</p>
                <p className="mt-0.5 text-[11.5px] text-[#9a9a9a]">
                  {r.role === "buyer" ? "You are buying" : "Buyer request"} · {r.counterpartyName || "Nomarc user"} · {new Date(r.createdAt).toLocaleDateString("en-NG")}
                </p>
                <p className="mt-1 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{formatMoney(r.amountMinor, r.currency)}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[10.5px] font-semibold", STATUS[r.status] ?? "bg-[#f4f4f4] text-[#6b6b6b] dark:bg-white/5 dark:text-white/60")}>{r.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#f4f4f4] pt-2 dark:border-white/5">
              {r.propertySlug && <Link href={`/properties/${r.propertySlug}`} className="text-[11.5px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">View listing</Link>}
              {r.certificateId && <Link href={`/dashboard/properties/certificates/${r.certificateId}`} className="text-[11.5px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">View certificate</Link>}
              {r.role === "buyer" && ["pending", "paid"].includes(r.status) && <CancelPurchaseButton id={r.id} />}
            </div>
          </div>
        ))}
        {!rows.length && (
          <div className="rounded-2xl border border-dashed border-[#dcdcdc] bg-white px-6 py-14 text-center dark:border-white/15 dark:bg-[#1a1a1a]">
            <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">No transactions yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-[#9a9a9a]">Request a purchase from a sale or bulk-land listing, or wait for a buyer to reach out.</p>
            <Link href="/properties?kind=sale" className="mt-3 inline-flex rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold dark:border-white/15">Browse for sale</Link>
          </div>
        )}
      </div>
      <p className="mt-4 text-[11.5px] leading-relaxed text-[#9a9a9a]">Transactions are completed offline and confirmed by Nomarc. A completed sale issues a printable Nomarc certificate.</p>
    </div>
  );
}
