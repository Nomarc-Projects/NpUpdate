"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { saveProperty, type PropertyDocumentInput } from "@/lib/services/property-listings";
import { uploadFile, uploadPrivateFile } from "@/lib/upload-client";
import {
  PROPERTY_CATEGORIES,
  PROPERTY_CURRENCIES,
  PROPERTY_KINDS,
  PROPERTY_PRICE_PERIODS,
  PROPERTY_TYPES,
  PROPERTY_DOCUMENT_LABEL,
  REQUIRED_PROPERTY_DOCUMENTS,
  type PropertyDocumentType,
  type PropertyKind,
} from "@/lib/constants/property";
import { computeListingFee, formatMoney, formatRate, minorToMajor, parseMoneyToMinor } from "@/lib/properties/pricing";
import { cn } from "@/lib/utils";

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#f0f0f0] py-6 first:border-t-0 first:pt-0 dark:border-white/10">
      <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-[#9a9a9a]">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export type PropertyFormInitial = {
  id: string;
  status: string;
  title: string;
  kind: PropertyKind;
  category: string;
  propertyType: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  sizeSqm: number | null;
  sizeAcres: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  priceMinor: number;
  currency: string;
  pricePeriod: string;
  minimumAcreage: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  media: { id: string; url: string }[];
  documents: { id: string; docType: string; fileName: string | null; status: string; downloadUrl?: string | null }[];
};

export function PropertyForm({
  flatFeeMinor,
  fxRates,
  approvalRequired,
  initial,
}: {
  flatFeeMinor: number;
  fxRates: Record<string, number>;
  approvalRequired: boolean;
  initial?: PropertyFormInitial;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState<PropertyKind>(initial?.kind ?? "sale");
  const [category, setCategory] = useState(initial?.category ?? "residential");
  const [propertyType, setPropertyType] = useState(initial?.propertyType ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [sizeSqm, setSizeSqm] = useState(initial?.sizeSqm != null ? String(initial.sizeSqm) : "");
  const [sizeAcres, setSizeAcres] = useState(initial?.sizeAcres != null ? String(initial.sizeAcres) : "");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms != null ? String(initial.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms != null ? String(initial.bathrooms) : "");
  const [price, setPrice] = useState(initial ? String(minorToMajor(initial.priceMinor)) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "NGN");
  const [pricePeriod, setPricePeriod] = useState(initial?.pricePeriod ?? "one_off");
  const [minimumAcreage, setMinimumAcreage] = useState(initial?.minimumAcreage != null ? String(initial.minimumAcreage) : "1");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [mediaUrls, setMediaUrls] = useState<string[]>(initial?.media.map((m) => m.url) ?? []);
  const [documents, setDocuments] = useState<Partial<Record<PropertyDocumentType, PropertyDocumentInput>>>({});
  const [saving, setSaving] = useState(false);

  const requiredDocs = useMemo(() => REQUIRED_PROPERTY_DOCUMENTS[kind], [kind]);
  const optionalDocs = (["cac_certificate", "other"] as PropertyDocumentType[]).filter((d) => !requiredDocs.includes(d));
  const priceMinor = parseMoneyToMinor(price) ?? 0;
  const fee = computeListingFee({ valueMinor: priceMinor, currency, flatFeeMinor, fxRates });

  async function submit(asDraft: boolean) {
    if (!title.trim()) return toast.error("Add a property title");
    if (!asDraft && !priceMinor) return toast.error("Add the asking price");
    if (!asDraft && !mediaUrls.length) return toast.error("Add at least one property photo");
    setSaving(true);
    try {
      const result = await saveProperty({
        id: initial?.id,
        title,
        description,
        kind,
        category,
        propertyType: propertyType || undefined,
        address,
        city,
        state,
        sizeSqm,
        sizeAcres,
        bedrooms,
        bathrooms,
        price,
        currency,
        pricePeriod,
        minimumAcreage,
        contactName,
        contactPhone,
        contactEmail,
        media: mediaUrls.map((url) => ({ url, kind: "image" })),
        documents: Object.values(documents).filter((d): d is PropertyDocumentInput => !!d),
        submit: !asDraft,
      });
      toast.success(asDraft ? "Changes saved" : approvalRequired ? "Submitted for review" : "Listing approved — pay to publish");
      router.push("/dashboard/properties/listings");
      router.refresh();
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the listing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e] md:p-6">
      <Section title="The basics" subtitle="What are you listing, and where is it?">
        <div className="space-y-4">
          <Field label="Property title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 4-bedroom detached duplex in Lekki Phase 1" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Listing kind">
              <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as PropertyKind)}>
                {PROPERTY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {PROPERTY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Property type" hint="Optional">
              <select className={inputClass} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                <option value="">Select a type</option>
                {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            {kind === "bulk_land" && (
              <Field label="Minimum acreage"><input className={inputClass} inputMode="decimal" value={minimumAcreage} onChange={(e) => setMinimumAcreage(e.target.value)} /></Field>
            )}
          </div>
          <Field label="Description" hint="At least 40 characters when submitting for review.">
            <textarea className={cn(inputClass, "min-h-28")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the property, access, title, utilities and anything a buyer should know." />
          </Field>
          <Field label="Street address"><input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City"><input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            <Field label="State"><input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      <Section title="Size and layout" subtitle="Numbers buyers use to compare properties.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Size (m²)"><input className={inputClass} inputMode="numeric" value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value)} /></Field>
          <Field label="Size (acres)"><input className={inputClass} inputMode="decimal" value={sizeAcres} onChange={(e) => setSizeAcres(e.target.value)} /></Field>
          <Field label="Bedrooms"><input className={inputClass} inputMode="numeric" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></Field>
          <Field label="Bathrooms"><input className={inputClass} inputMode="numeric" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Price and listing fee" subtitle="The fee is calculated from the full property value and shown before you submit.">
        <div className="grid gap-4 sm:grid-cols-[1fr_110px_150px]">
          <Field label="Asking price"><input className={inputClass} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25,000,000" /></Field>
          <Field label="Currency">
            <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {PROPERTY_CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>
          </Field>
          <Field label="Period">
            <select className={inputClass} value={pricePeriod} onChange={(e) => setPricePeriod(e.target.value)}>
              {PROPERTY_PRICE_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-4 rounded-xl border border-[#e8f3eb] bg-[#f4fbf5] p-4 dark:border-[#22c55e]/20 dark:bg-[#22c55e]/[0.06]">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#1e1e1e] dark:text-white"><Info size={13} /> Listing fee estimate</p>
          <div className="mt-2 grid gap-1 text-[12px] text-[#4f6b57] dark:text-white/70">
            <span>Flat fee: {formatMoney(fee.flatFeeMinor, "NGN")}</span>
            <span>{fee.bracketLabel} × {formatRate(fee.rateBps)}: {formatMoney(fee.percentageFeeMinor, "NGN")}</span>
            <span className="text-[14px] font-extrabold text-[#1e1e1e] dark:text-white">Total: {formatMoney(fee.totalFeeMinor, "NGN")}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#7d8f83] dark:text-white/45">Fee is charged in NGN after admin approval. Currency conversion uses the platform FX setting.</p>
        </div>
      </Section>

      <Section title="Photos" subtitle="The first image becomes the cover. Up to 8 images, max 10MB each.">
        <div className="rounded-2xl border border-dashed border-[#e0e0e0] bg-[#fafafa] p-5 dark:border-white/15 dark:bg-white/[0.02]">
          <FileUpload
            accept="image/*"
            maxSizeMB={10}
            maxItems={8}
            multiple
            label="Add photos"
            hint="Drag & drop, or browse"
            upload={(f) => uploadFile(f, "property")}
            onChange={(items) => setMediaUrls(items.filter((i) => !i.error && i.url?.startsWith("http")).map((i) => i.url!))}
          />
        </div>
        <p className="mt-2 text-[11.5px] text-[#9a9a9a]">{mediaUrls.length} of 8 uploaded</p>
      </Section>

      <Section title="Ownership documents" subtitle="Stored privately. The public listing only shows each document's review status.">
        <div className="space-y-4">
          {[...requiredDocs, ...optionalDocs].map((docType) => {
            const required = requiredDocs.includes(docType);
            const current = documents[docType];
            const existing = initial?.documents.find((d) => d.docType === docType);
            return (
              <div key={docType} className={cn("rounded-xl border p-4", required ? "border-[#e8f3eb] bg-[#fbfefc] dark:border-[#22c55e]/20 dark:bg-[#22c55e]/[0.04]" : "border-[#ececec] dark:border-white/10")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{PROPERTY_DOCUMENT_LABEL[docType]}{required && <span className="text-[#e5484d]"> *</span>}</p>
                  {(current || existing) && <span className="text-[11px] font-semibold text-[#1f7a3d] dark:text-[#4ade80]">{current ? "Uploaded" : `On file · ${existing?.status}`}</span>}
                  {!current && existing?.downloadUrl && <a href={existing.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">Open file</a>}
                </div>
                <div className="mt-2">
                  <FileUpload
                    accept="image/*,application/pdf,.doc,.docx"
                    maxSizeMB={25}
                    maxItems={1}
                    label="Upload document"
                    hint="PDF or image"
                    upload={(f) => uploadPrivateFile(f, "property_doc")}
                    onChange={(items) => {
                      const uploaded = items.find((i) => !i.error && i.url && !i.url.startsWith("blob:"));
                      setDocuments((prev) => {
                        const next = { ...prev };
                        if (uploaded?.url) next[docType] = { docType, storageKey: uploaded.url, fileName: uploaded.name, mimeType: uploaded.type, sizeBytes: uploaded.size };
                        else delete next[docType];
                        return next;
                      });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Contact details" subtitle="Shown to buyers after they sign in and inquire.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact name"><input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
          <Field label="Phone"><input className={inputClass} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Field>
          <Field label="Email"><input className={inputClass} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#f0f0f0] pt-5 dark:border-white/10">
        <button type="button" disabled={saving} onClick={() => submit(true)} className="rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[12.5px] font-semibold text-[#1e1e1e] disabled:opacity-60 dark:border-white/15 dark:text-white">{initial ? "Save changes" : "Save as draft"}</button>
        <button type="button" disabled={saving} onClick={() => submit(false)} className="rounded-xl bg-[#1e1e1e] px-5 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60 dark:bg-white dark:text-[#1e1e1e]">
          {saving ? "Saving…" : initial ? "Resubmit for review" : approvalRequired ? "Submit for review" : "Submit listing"}
        </button>
      </div>
    </div>
  );
}
