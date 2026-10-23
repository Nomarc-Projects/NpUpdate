import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { getMyListerProfile } from "@/lib/services/property-listers";
import { PropertyListerForm } from "@/components/dashboard/properties/property-lister-form";

export const metadata = { title: "Lister verification" };
export const dynamic = "force-dynamic";

export default async function ListerVerificationPage() {
  const profile = await getMyListerProfile().catch(() => null);
  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22c55e]">Nomarc Projects</p>
        <h1 className="mt-1 inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">
          <BadgeCheck size={22} className="text-[#1f7a3d] dark:text-[#4ade80]" /> Lister verification
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
          Homeowners, space owners and realtors can verify their identity. Realtors also provide their CAC details. Verified listers carry a trust badge that helps buyers feel confident.
        </p>
        <div className="mt-5">
          <PropertyListerForm initial={profile ? {
            listerType: profile.listerType,
            displayName: profile.displayName,
            companyName: profile.companyName,
            cacNumber: profile.cacNumber,
            phone: profile.phone,
            email: profile.email,
            cacDocumentKey: profile.cacDocumentKey,
            idDocumentKey: profile.idDocumentKey,
            verificationStatus: profile.verificationStatus,
            verificationNote: profile.verificationNote,
          } : null} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/properties" className="text-[12px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">← Property workspace</Link>
          <Link href="/dashboard/properties/new" className="text-[12px] font-semibold text-[#6b6b6b] hover:underline dark:text-white/60">Add a property</Link>
        </div>
      </div>
    </div>
  );
}
