import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ShieldCheck, XCircle } from "lucide-react";
import { getPublicCertificateByNo } from "@/lib/services/property-certificates";
import { pageMetadata } from "@/lib/og";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ no: string }> }): Promise<Metadata> {
  const { no } = await params;
  return pageMetadata({
    title: `Certificate ${no}`,
    description: "Verify a Nomarc Projects property transaction certificate.",
    path: `/properties/certificates/${no}`,
  });
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  const cert = await getPublicCertificateByNo(no).catch(() => null);
  if (!cert) notFound();
  const valid = cert.transactionStatus === "completed";

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#111]">
      <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7f0] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]">
          <ShieldCheck size={12} /> Certificate verification
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Nomarc Projects certificate</h1>
        <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">Check that a property transaction certificate was issued by Nomarc Projects.</p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#ececec] bg-white dark:border-white/10 dark:bg-[#1e1e1e]">
          <div className={valid ? "border-b-4 border-[#22c55e] p-6" : "border-b-4 border-[#b4232a] p-6"}>
            <div className="flex items-start gap-3">
              {valid ? <BadgeCheck size={28} className="text-[#1f7a3d] dark:text-[#4ade80]" /> : <XCircle size={28} className="text-[#b4232a] dark:text-red-300" />}
              <div>
                <p className={valid ? "text-[15px] font-extrabold text-[#1f7a3d] dark:text-[#4ade80]" : "text-[15px] font-extrabold text-[#b4232a] dark:text-red-300"}>
                  {valid ? "Valid certificate" : "Certificate not valid"}
                </p>
                <p className="mt-0.5 text-[12px] text-[#6b6b6b] dark:text-white/60">This record exists in the Nomarc Projects registry.</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Certificate no.</dt>
                <dd className="mt-1 font-mono text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">{cert.certificateNo}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Issued</dt>
                <dd className="mt-1 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Property</dt>
                <dd className="mt-1 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{cert.propertyTitle}</dd>
                {cert.propertyLocation && <dd className="mt-0.5 text-[11.5px] text-[#6b6b6b] dark:text-white/60">{cert.propertyLocation}</dd>}
              </div>
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Transaction</dt>
                <dd className="mt-1 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{cert.transactionStatus}</dd>
              </div>
            </dl>
          </div>
          <p className="p-6 text-[11px] leading-relaxed text-[#9a9a9a]">
            This registry confirms only that Nomarc issued the certificate. It is not a certificate of title and does not replace a deed, Governor&apos;s consent, survey or independent legal verification. Buyer details are withheld for privacy.
          </p>
        </div>

        <Link href="/properties" className="mt-5 inline-flex text-[12px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">← Browse properties</Link>
      </div>
    </div>
  );
}
