import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { getPublicCertificateByNo } from "@/lib/services/property-certificates";
import { pageMetadata } from "@/lib/og";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Verify a property certificate",
    description: "Verify a Nomarc Projects property transaction certificate number.",
    path: "/properties/certificates",
  });
}

export default async function CertificateLookupPage({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const params = await searchParams;
  const no = params.no?.trim();
  const cert = no ? await getPublicCertificateByNo(no).catch(() => null) : null;
  if (cert) redirect(`/properties/certificates/${cert.certificateNo}`);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#111]">
      <div className="mx-auto max-w-xl px-5 py-12 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7f0] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]">
          <ShieldCheck size={12} /> Certificate verification
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Verify a property certificate</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">Enter the certificate number shown on a Nomarc Projects certificate to confirm it was issued by us.</p>

        <form action="/properties/certificates" className="mt-6 flex flex-col gap-2 rounded-2xl border border-[#ececec] bg-white p-3 sm:flex-row dark:border-white/10 dark:bg-[#1e1e1e]">
          <label className="flex flex-1 items-center gap-2 rounded-xl px-2">
            <Search size={15} className="text-[#9a9a9a]" />
            <input name="no" defaultValue={no} placeholder="NMP-2026-XXXXXXXX" className="h-10 w-full bg-transparent font-mono text-[12.5px] uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-[#9a9a9a]" />
          </label>
          <button className="h-10 rounded-xl bg-[#1e1e1e] px-5 text-[12.5px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]">Verify</button>
        </form>
        {no && !cert && <p className="mt-3 rounded-xl bg-[#fdecec] px-4 py-3 text-[12px] font-semibold text-[#b4232a] dark:bg-red-500/10 dark:text-red-300">No certificate matches that number. Check the number and try again.</p>}

        <div className="mt-5 flex flex-wrap gap-4">
          <Link href="/properties" className="text-[12px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">Browse properties</Link>
          <Link href="/properties/sowr" className="text-[12px] font-semibold text-[#6b6b6b] hover:underline dark:text-white/60">About SOWR</Link>
        </div>
      </div>
    </div>
  );
}
