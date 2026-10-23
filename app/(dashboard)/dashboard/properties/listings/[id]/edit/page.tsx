import { notFound, redirect } from "next/navigation";
import { getOwnedProperty } from "@/lib/services/properties";
import { getProperties } from "@/lib/services/platform-settings-read";
import { PROPERTIES_DEFAULT } from "@/lib/services/platform-settings-shared";
import { isPropertyKind } from "@/lib/constants/property";
import { privateDownloadUrl } from "@/lib/storage";
import { PropertyForm, type PropertyFormInitial } from "../../../new/property-form";

export const metadata = { title: "Edit property" };
export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, settings] = await Promise.all([
    getOwnedProperty(id).catch(() => null),
    getProperties().catch(() => PROPERTIES_DEFAULT),
  ]);
  if (!item) notFound();
  if (!["draft", "changes_requested", "rejected"].includes(item.status)) redirect("/dashboard/properties/listings");
  if (!isPropertyKind(item.kind)) notFound();

  const initial: PropertyFormInitial = {
    id: item.id,
    status: item.status,
    title: item.title,
    kind: item.kind,
    category: item.category,
    propertyType: item.propertyType,
    description: item.description,
    address: item.address,
    city: item.city,
    state: item.state,
    sizeSqm: item.sizeSqm,
    sizeAcres: item.sizeAcres,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    priceMinor: item.priceMinor,
    currency: item.currency,
    pricePeriod: item.pricePeriod,
    minimumAcreage: item.minimumAcreage,
    contactName: item.contactName,
    contactPhone: item.contactPhone,
    contactEmail: item.contactEmail,
    media: item.media.map((m) => ({ id: m.id, url: m.url })),
    documents: await Promise.all(item.docs.map(async (d) => ({
      id: d.id,
      docType: d.docType,
      fileName: d.fileName,
      status: d.status,
      downloadUrl: await privateDownloadUrl(d.storageKey, 600).catch(() => null),
    }))),
  };

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22c55e]">Nomarc Projects</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Edit property</h1>
        <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">Fix what the admin flagged, then resubmit for review.</p>
        <PropertyForm
          flatFeeMinor={settings.flatListingFeeMinor}
          fxRates={{ ...settings.fxRates, NGN: 1 }}
          approvalRequired={settings.approvalRequired}
          initial={initial}
        />
      </div>
    </div>
  );
}
