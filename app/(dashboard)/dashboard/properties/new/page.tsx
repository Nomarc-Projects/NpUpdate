import { getProperties } from "@/lib/services/platform-settings-read";
import { PROPERTIES_DEFAULT } from "@/lib/services/platform-settings-shared";
import { PropertyForm } from "./property-form";

export const metadata = { title: "Add property" };
export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const settings = await getProperties().catch(() => PROPERTIES_DEFAULT);
  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22c55e]">Nomarc Projects</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">List a property</h1>
        <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">
          Add the property details, photos and ownership documents. {settings.approvalRequired ? "An admin reviews the listing before you pay and publish." : "You can pay and publish as soon as the listing is saved."}
        </p>
        <PropertyForm
          flatFeeMinor={settings.flatListingFeeMinor}
          fxRates={{ ...settings.fxRates, NGN: 1 }}
          approvalRequired={settings.approvalRequired}
        />
      </div>
    </div>
  );
}
