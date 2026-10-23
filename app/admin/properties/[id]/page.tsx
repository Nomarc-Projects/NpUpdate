import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PropertyReviewActions } from "@/components/admin/property-review-actions";
import { PropertyDocumentReview } from "@/components/admin/property-document-review";
import { getAdminProperty } from "@/lib/services/property-admin";
import { privateDownloadUrl } from "@/lib/storage";
import { PROPERTY_DOCUMENT_LABEL, propertyStatusLabel, type PropertyDocumentType } from "@/lib/constants/property";
import { formatMoney } from "@/lib/properties/pricing";

export const metadata = { title: "Property review" };
export const dynamic = "force-dynamic";

export default async function AdminPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminProperty(id).catch(() => null);
  if (!item) notFound();

  const docs = await Promise.all(
    item.docs.map(async (d) => ({ ...d, downloadUrl: await privateDownloadUrl(d.storageKey, 600).catch(() => null) })),
  );

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title={item.title}
        subtitle={`${item.kind.replaceAll("_", " ")} · ${[item.city, item.state].filter(Boolean).join(", ")} · ${formatMoney(item.priceMinor, item.currency)}`}
      />
      <Link href="/admin/properties" className="mb-4 inline-block text-[12px] font-semibold text-[#6b6b6b] hover:underline dark:text-white/60">← Back to properties</Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10.5px] font-semibold text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">{propertyStatusLabel(item.status)}</span>
              <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10.5px] font-semibold text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">Documents {item.documentStatus}</span>
              <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10.5px] font-semibold text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">Fee {item.feeAmountMinor != null ? formatMoney(item.feeAmountMinor, "NGN") : "—"}</span>
            </div>
            <p className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/65">{item.description || "No description."}</p>
            <p className="mt-3 text-[11.5px] text-[#9a9a9a]">Owner {item.ownerUserId} · Created {new Date(item.createdAt).toLocaleString("en-NG")}</p>
            <div className="mt-3 rounded-xl bg-[#fafafa] p-3 text-[11.5px] dark:bg-white/5">
              <p className="font-semibold text-[#1e1e1e] dark:text-white">Lister profile</p>
              {item.lister ? (
                <p className="mt-1 text-[#6b6b6b] dark:text-white/60">
                  {item.lister.displayName || "Unnamed"} · {item.lister.listerType.replaceAll("_", " ")}
                  {item.lister.companyName ? ` · ${item.lister.companyName}` : ""} · <span className="font-semibold">{item.lister.verificationStatus}</span>
                  {" · "}<Link href="/admin/properties/listers" className="font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">Review profile</Link>
                </p>
              ) : (
                <p className="mt-1 text-[#9a9a9a]">No lister profile linked. The owner can verify from their dashboard.</p>
              )}
            </div>
            {(item.status === "pending_approval" || item.status === "changes_requested") && (
              <div className="mt-4 border-t border-[#f0f0f0] pt-3 dark:border-white/10">
                <PropertyReviewActions id={item.id} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Photos</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {item.media.map((m) => (
                <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f4f4f4] dark:bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.caption || ""} className="h-full w-full object-cover" />
                  <span className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"><ExternalLink size={12} /></span>
                </a>
              ))}
              {!item.media.length && <p className="text-[12px] text-[#9a9a9a]">No photos.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
          <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Ownership documents</h2>
          <p className="mt-1 text-[11.5px] text-[#9a9a9a]">Links expire in 10 minutes.</p>
          <div className="mt-3 space-y-3">
            {docs.map((d) => (
              <div key={d.id} className="rounded-xl border border-[#f0f0f0] p-3 dark:border-white/10">
                <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white">{PROPERTY_DOCUMENT_LABEL[d.docType as PropertyDocumentType] ?? d.docType.replaceAll("_", " ")}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-[#9a9a9a]">{d.fileName || d.storageKey}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {d.downloadUrl ? <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">Open file</a> : <span className="text-[11px] text-[#b4232a]">Link unavailable</span>}
                  <PropertyDocumentReview id={d.id} status={d.status} />
                </div>
              </div>
            ))}
            {!docs.length && <p className="text-[12px] text-[#9a9a9a]">No documents uploaded.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
