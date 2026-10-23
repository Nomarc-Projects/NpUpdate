import Link from "next/link";
import { Inbox } from "lucide-react";
import { getOwnerPropertyInquiries } from "@/lib/services/property-inquiries";

export const metadata = { title: "Property inquiries" };
export const dynamic = "force-dynamic";

export default async function PropertyInquiriesPage() {
  const rows = await getOwnerPropertyInquiries().catch(() => []);
  return (
    <div className="px-5 py-6 md:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Inquiries</h1>
      <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">Buyer messages about your properties.</p>

      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{r.buyerName}</p>
                <Link href={`/properties/${r.propertySlug}`} className="text-[11.5px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">{r.propertyTitle}</Link>
                {r.message && <p className="mt-1.5 line-clamp-2 text-[12px] text-[#6b6b6b] dark:text-white/60">{r.message}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">{r.status}</span>
                {r.conversationId && <Link href={`/dashboard/messages?to=${r.buyerUserId}`} className="rounded-lg bg-[#1e1e1e] px-3 py-1.5 text-[11.5px] font-semibold text-white dark:bg-white dark:text-[#1e1e1e]">Reply</Link>}
              </div>
            </div>
          </div>
        ))}
        {!rows.length && (
          <div className="rounded-2xl border border-dashed border-[#dcdcdc] bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-[#1a1a1a]">
            <Inbox className="mx-auto text-[#9a9a9a]" size={24} />
            <p className="mt-3 text-[14px] font-bold text-[#1e1e1e] dark:text-white">No inquiries yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-[#9a9a9a]">Once a buyer messages you from a live listing, the conversation will show up here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
