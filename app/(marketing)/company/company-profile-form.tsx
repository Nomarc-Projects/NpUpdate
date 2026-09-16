"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { MultiSelect } from "@/components/ui/multi-select";
import { saveCompany, type CompanyData } from "@/lib/services/company";
import { uploadFile } from "@/lib/upload-client";

const INDUSTRIES = [
  "Core Building Materials", "Heavy Machinery & Plant", "Interior Finishes & Fit-outs",
  "Electrical & Lighting", "Plumbing & Water Systems", "HVAC Systems",
  "Roofing & Waterproofing", "Doors, Windows & Glazing", "Tools & Hardware",
  "Safety & PPE", "Landscaping & Exterior", "Sustainable & Green Tech", "Software & Tech", "Other",
];

/** Same vocabularies the exhibitor onboarding wizard collects. They were
 *  write-only until now — stored at signup, shown by no editor. */
const COMPANY_TYPES = [
  "Manufacturer", "Distributor", "Wholesaler", "Retailer", "Rental Company", "Equipment Dealer",
  "Importer", "Exporter", "Fabricator", "Service Provider", "OEM (Original Equipment Manufacturers)", "Consultant",
];
const PRODUCT_CATEGORIES = [
  "Building Materials",
  "Construction Equipment & Machinery",
  "Tools & Hardware",
  "Interior, Exterior & Landscaping",
  "Building Services (Electrical, Plumbing, HVAC, Fire Protection)",
  "Safety (PPE)",
];

export function CompanyProfileForm({ initial }: { initial?: CompanyData }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [headquarters, setHeadquarters] = useState(initial?.headquarters ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [companyType, setCompanyType] = useState(initial?.companyType ?? "");
  const [categories, setCategories] = useState<string[]>(initial?.categories ?? []);
  const [regNumber, setRegNumber] = useState(initial?.registrationNumber ?? "");
  const [avatar, setAvatar] = useState(initial?.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8MB)."); return; }
    const local = URL.createObjectURL(file);
    setAvatar(local); setUploading(true);
    try {
      const url = await uploadFile(file, "logo");
      setAvatar(url);
      await saveCompany({ avatarUrl: url });
      toast.success("Logo updated");
      router.refresh();
    } catch (e) {
      setAvatar(initial?.avatarUrl ?? "");
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); URL.revokeObjectURL(local); }
  }

  function save() {
    start(async () => {
      try {
        await saveCompany({ name, industry, headquarters, about, companyType, categories, registrationNumber: regNumber, avatarUrl: avatar || "" });
        toast.success("Changes saved");
        router.refresh();
      } catch { toast.error("Could not save changes"); }
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6">
      {/* logo row */}
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="Company logo" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <span className="w-20 h-20 rounded-full bg-gradient-to-br from-[#d4d4d4] to-[#9a9a9a] dark:from-white/20 dark:to-white/5 block" aria-hidden />
          )}
          {uploading && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex items-center gap-3">
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:border-[#1e1e1e] dark:hover:border-white transition-colors disabled:opacity-50">{uploading ? "Uploading…" : "Upload new picture"}</button>
          <button type="button" onClick={() => { setAvatar(""); saveCompany({ avatarUrl: "" }).then(() => { toast("Logo removed"); router.refresh(); }).catch(() => toast.error("Failed")); }} className="px-4 py-2 rounded-lg bg-[#f3f3f3] dark:bg-white/10 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#e9e9e9] dark:hover:bg-white/15 transition-colors">Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Company Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Titan SteelCo" /></Field>
        <Field label="Primary Industry"><SelectMenu placeholder="Core Building Materials" value={industry} onChange={setIndustry} options={INDUSTRIES} /></Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Company Address">
          <input className={inputClass} value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="Ikeja, Lagos State, Nigeria" />
        </Field>
        <Field label="Company Registration number">
          <input className={inputClass} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="01 01 01 01" />
        </Field>
        <Field label="Company Type">
          <SelectMenu placeholder="Select company type" value={companyType} onChange={setCompanyType} options={COMPANY_TYPES} />
        </Field>
      </div>

      <Field label="Product Category" hint="Choose the categories that best represent your inventory. This ensures your showroom appears in the right buyer searches.">
        <MultiSelect placeholder="Select product category" value={categories} onChange={setCategories} options={PRODUCT_CATEGORIES} />
      </Field>

      <Field label="About the Company" hint={`${about.length}/2,000`}>
        <textarea value={about} onChange={(e) => setAbout(e.target.value.slice(0, 2000))} rows={5} className={inputClass + " resize-none"}
          placeholder="We are West Africa's leading supplier of structural steel and reinforcement bars..." />
      </Field>

      <div className="flex items-center justify-end gap-3 pt-2">
        <GhostButton type="button" onClick={() => router.refresh()}>Cancel</GhostButton>
        <PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</PrimaryButton>
      </div>
    </form>
  );
}
