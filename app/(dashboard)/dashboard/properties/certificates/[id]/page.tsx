import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyCertificate } from "@/lib/services/property-transactions";
import { PrintCertificateButton } from "@/components/properties/print-certificate-button";
import { formatMoney } from "@/lib/properties/pricing";

export const metadata = { title: "Nomarc property certificate" };
export const dynamic = "force-dynamic";

export default async function PropertyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cert = await getMyCertificate(id).catch(() => null);
  if (!cert) notFound();

  return (
    <div className="min-h-screen bg-[#fafafa] px-5 py-8 print:bg-white print:p-0 dark:bg-[#111]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/properties/transactions" className="text-[12px] font-semibold text-[#6b6b6b] hover:underline dark:text-white/60">← Transactions</Link>
            <Link href={`/properties/certificates/${cert.certificateNo}`} className="text-[12px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">Public verification</Link>
          </div>
          <PrintCertificateButton />
        </div>

        <article className="overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white print:rounded-none print:border-0 dark:border-white/10 dark:bg-[#1e1e1e]">
          <div className="border-b-4 border-[#22c55e] p-8 md:p-12">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1f7a3d]">Nomarc Projects</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Certificate of Property Transaction</h1>
              </div>
              <div className="rounded-xl border border-[#ececec] px-3 py-2 text-right dark:border-white/10">
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Certificate no.</p>
                <p className="mt-0.5 font-mono text-[11.5px] font-bold text-[#1e1e1e] dark:text-white">{cert.certificateNo}</p>
              </div>
            </div>

            <p className="mt-8 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/65">This certifies that the property transaction described below was recorded and completed through Nomarc Projects.</p>

            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Property</dt>
                <dd className="mt-1 text-[14px] font-bold text-[#1e1e1e] dark:text-white">{cert.propertyTitle}</dd>
                {cert.propertyLocation && <dd className="mt-0.5 text-[11.5px] text-[#6b6b6b] dark:text-white/60">{cert.propertyLocation}</dd>}
              </div>
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Consideration</dt>
                <dd className="mt-1 text-[14px] font-bold text-[#1e1e1e] dark:text-white">{formatMoney(cert.amountMinor, cert.currency)}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Buyer</dt>
                <dd className="mt-1 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{cert.buyerName}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Seller / lister</dt>
                <dd className="mt-1 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{cert.sellerName}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Issued</dt>
                <dd className="mt-1 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Status</dt>
                <dd className="mt-1 text-[13px] font-semibold text-[#1f7a3d] dark:text-[#4ade80]">Completed</dd>
              </div>
            </dl>

            <div className="mt-10 border-t border-[#ececec] pt-5 text-[10.5px] leading-relaxed text-[#9a9a9a] dark:border-white/10">
              This certificate records a transaction completed on Nomarc Projects. It is not a certificate of title and does not replace a deed, Governor&apos;s consent, survey or independent legal verification. Buyers should complete all statutory registration steps.
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
