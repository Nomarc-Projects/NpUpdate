import { getProperties } from "@/lib/services/platform-settings-read";
import { PROPERTIES_DEFAULT } from "@/lib/services/platform-settings-shared";
import { PropertyForm } from "./property-form";
import { getMyListerProfile } from "@/lib/services/property-listers";
import { PropertyListerForm, type ListerInitial } from "@/components/dashboard/properties/property-lister-form";
import { BadgeCheck, Clock3 } from "lucide-react";

export const metadata = { title: "Add property" };
export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const [settings, profile] = await Promise.all([
    getProperties().catch(() => PROPERTIES_DEFAULT),
    getMyListerProfile().catch(() => null),
  ]);
  const initial: ListerInitial = profile ? {
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
  } : null;

  if (profile?.verificationStatus === "pending") {
    return (
      <div className="px-5 py-6 md:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22c55e]">Nomarc Projects</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Add Property</h1>
          <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            <Clock3 size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-[15px] font-bold">Your verification is being reviewed</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-amber-900/80 dark:text-amber-100/75">We’ll notify you when your lister profile is approved. You can add a property as soon as verification is complete.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.verificationStatus !== "verified") {
    return (
      <div className="px-5 py-6 md:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22c55e]">Nomarc Projects</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Verify to add a property</h1>
          <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">Only verified listers can create property listings. Complete verification to continue.</p>
          <div className="mt-5">
            <PropertyListerForm initial={initial} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22c55e]">Nomarc Projects</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">List a property</h1>
        <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">
          Add the property details, photos and ownership documents. {settings.approvalRequired ? "An admin reviews the listing before you pay and publish." : "You can pay and publish as soon as the listing is saved."}
        </p>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#dcefe0] bg-[#f4fbf5] px-3.5 py-2.5 text-[12px] font-semibold text-[#1f7a3d] dark:border-[#22c55e]/20 dark:bg-[#22c55e]/[0.06] dark:text-[#4ade80]">
          <BadgeCheck size={15} /> Verified lister
        </div>
        <PropertyForm
          flatFeeMinor={settings.flatListingFeeMinor}
          fxRates={{ ...settings.fxRates, NGN: 1 }}
          approvalRequired={settings.approvalRequired}
        />
      </div>
    </div>
  );
}
