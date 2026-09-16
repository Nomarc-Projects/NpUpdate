"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, ArrowRight } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { MultiSelect } from "@/components/ui/multi-select";
import { createProduct } from "@/lib/services/products";
import { uploadFile } from "@/lib/upload-client";
import { PRODUCT_UNITS, UNIT_CUSTOM } from "@/lib/constants/product-units";
import { cn } from "@/lib/utils";

const PRODUCT_CATEGORIES = ["Structural Steel", "Rebar", "Heavy Machinery", "Cement & Concrete", "Flooring", "Ceramic & Porcelain", "HVAC", "Cooling Systems", "Electrical", "Plumbing", "Roofing", "Doors & Windows", "Tools & Hardware", "Safety & PPE", "Industrial Metals", "Heavy Framework"];
const DESC_MAX = 500;

function FormSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#f0f0f0] py-7 first:border-t-0 first:pt-0 dark:border-white/10">
      <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-[#9a9a9a]">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* dropzone card matching the mockup's cover/gallery tiles */
function UploadTile({
  title, hint, multiple, onUrls, accept = "image/*", maxSizeMB = 5, videoMaxSizeMB, maxItems,
}: {
  title: string; hint: string; multiple?: boolean;
  /** Receives the R2 URLs of everything that finished uploading. */
  onUrls: (urls: string[]) => void;
  accept?: string; maxSizeMB?: number; videoMaxSizeMB?: number; maxItems?: number;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#e0e0e0] bg-[#fafafa] p-5 text-center dark:border-white/15 dark:bg-white/[0.02]">
      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{title}</p>
      <p className="mt-0.5 text-[11.5px] text-[#9a9a9a]">{hint}</p>
      <div className="mt-3">
        <FileUpload
          accept={accept}
          maxSizeMB={maxSizeMB}
          videoMaxSizeMB={videoMaxSizeMB}
          maxItems={maxItems}
          multiple={multiple}
          label="Browse files"
          hint="Drag & drop, or"
          upload={(f) => uploadFile(f, "product")}
          // Only completed uploads carry a remote URL; blob: previews and failed
          // rows are filtered out so a half-finished upload can't be published.
          onChange={(items) => onUrls(items.filter((i) => !i.error && i.url?.startsWith("http")).map((i) => i.url as string))}
        />
      </div>
    </div>
  );
}

/** Gallery accepts stills and clips: images ≤5MB, video ≤10MB, 10 items total. */
const GALLERY_MAX_ITEMS = 10;
const GALLERY_IMAGE_MB = 5;
const GALLERY_VIDEO_MB = 10;

/**
 * Single-page "Add new product" form (image 76), wired to `createProduct`.
 *
 * Media genuinely persists: each tile uploads to R2 through `uploadFile` and the
 * resulting URLs are saved as `coverUrl` / `gallery`. It previously rendered
 * dropzones that validated and previewed files and then discarded them on
 * submit, so a seller could attach ten photos and publish a product with none.
 */
export function AddProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [material, setMaterial] = useState("");
  const [price, setPrice] = useState("");
  // `unit` holds either a listed unit or the UNIT_CUSTOM sentinel; when it's the
  // sentinel the typed value in `customUnit` is what actually gets saved.
  const [unit, setUnit] = useState<string>(PRODUCT_UNITS[0]);
  const [customUnit, setCustomUnit] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [docUrls, setDocUrls] = useState<string[]>([]);
  const [inStock, setInStock] = useState(true);
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([""]);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const setFeature = (i: number, v: string) => setFeatures((f) => f.map((x, j) => (j === i ? v : x)));
  const removeFeature = (i: number) => setFeatures((f) => (f.length === 1 ? [""] : f.filter((_, j) => j !== i)));

  /** The unit actually saved: the typed one when "Something else" is chosen. */
  const resolvedUnit = unit === UNIT_CUSTOM ? customUnit.trim() : unit;

  function submit(draft: boolean) {
    if (!name.trim()) { toast.error("Product name is required"); return; }
    // Only enforced on publish — a draft is allowed to be half-finished.
    if (!draft && unit === UNIT_CUSTOM && !resolvedUnit) {
      toast.error("Tell buyers what the price is per, or pick one from the list.");
      return;
    }
    if (!draft && !confirmed) { toast.error("Please confirm your product details comply with platform guidelines."); return; }
    setSaving(true);

    const specs = features.map((f) => f.trim()).filter(Boolean).map((f) => ({ label: f, value: "" }));
    if (dimensions.trim()) specs.unshift({ label: "Sizes / Variations", value: dimensions.trim() });

    // Cover falls back to the first gallery item, so a seller who only filled one
    // of the two tiles still ends up with a thumbnail instead of a blank card.
    const cover = coverUrls[0] ?? galleryUrls[0];
    const gallery = [...new Set([...(cover ? [cover] : []), ...galleryUrls])];
    // Brochures and spec sheets have no column of their own; they ride along as
    // specs so the upload isn't silently thrown away.
    for (const url of docUrls) specs.push({ label: "Document", value: url });

    createProduct({
      name,
      category: tags[0],
      tags,
      type: material || undefined,
      description,
      specs,
      // A price without its unit is meaningless (₦8,000 per tile vs per pallet),
      // so the two are only sent together.
      retailMin: price.trim() ? Number(price) : undefined,
      unit: resolvedUnit || undefined,
      coverUrl: cover,
      gallery: gallery.length ? gallery : undefined,
      availability: inStock ? "in_stock" : "made_to_order",
      stock: inStock ? 100 : 0,
      status: draft ? "draft" : "active",
    }, draft)
      .then(() => {
        toast.success(draft ? "Saved as draft" : "Product published!");
        router.push(draft ? "/dashboard?tab=drafts" : "/dashboard?tab=catalog");
      })
      .catch((e) => { setSaving(false); toast.error(e instanceof Error ? e.message : "Couldn't save product"); });
  }

  return (
    <div className="mx-auto max-w-[960px] px-5 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">Add new product</h1>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Fill in the details below to add a new product to your catalog.</p>
      </div>

      <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e] sm:p-7">
        {/* Product details */}
        <FormSection title="Product Details" subtitle="Basic identifiers, categorization, and material specifics.">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field label="Product Name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-Yield TMT Rebar" />
            </Field>
            <Field label="Product Categories/Tags">
              <MultiSelect options={PRODUCT_CATEGORIES} value={tags} onChange={setTags} allowCreate placeholder="Search or add categories…" />
            </Field>
            <Field label="Material / Grade (Optional)">
              <input className={inputClass} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. Grade 500 / BS 4449" />
            </Field>
            <Field label="Price (₦)" hint="Buyers see this alongside the unit">
              <input
                className={inputClass}
                type="number"
                min="0"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 8000"
              />
            </Field>
            <Field label="Priced per" hint="How this product is sold">
              {/* Materials are quoted every which way — per m², per bag, per
                  tonne — so the list is a shortcut, not a constraint: "Something
                  else" takes whatever the seller actually uses. */}
              <select
                className={inputClass}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                aria-label="Pricing unit"
              >
                {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                <option value={UNIT_CUSTOM}>Something else…</option>
              </select>
              {unit === UNIT_CUSTOM && (
                <input
                  className={`${inputClass} mt-2`}
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="e.g. per pallet of 24"
                  aria-label="Custom pricing unit"
                />
              )}
            </Field>
            <Field label="Dimensions / Variations (Optional)">
              <input className={inputClass} value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 10mm, 12mm, 16mm…" />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[13px] text-[#3d3d3d] dark:text-white/70">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-4 w-4 accent-[#ffd716]" />
            Currently in stock and available for order
          </label>
        </FormSection>

        {/* Description & specs */}
        <FormSection title="Description & Specifications" subtitle="Provide a detailed overview and list specific technical features or compliances.">
          <Field label="Product Description" hint={`${description.length}/${DESC_MAX}`}>
            <textarea rows={4} maxLength={DESC_MAX} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the applications and key benefits of this product…" />
          </Field>
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Technical Specs &amp; Features</p>
            <div className="space-y-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={inputClass} value={f} onChange={(e) => setFeature(i, e.target.value)} placeholder="e.g. Tensile strength of 500 MPa" />
                  <button type="button" onClick={() => removeFeature(i)} className="flex-shrink-0 text-[#b3b3b3] transition-colors hover:text-[#e5484d]" aria-label="Remove feature"><X size={16} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setFeatures((f) => [...f, ""])} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#caa400] hover:underline"><Plus size={14} /> Add</button>
          </div>
        </FormSection>

        {/* Media & documentation */}
        <FormSection title="Media & Documentation" subtitle="Select a primary cover image, add gallery photos and clips, and attach any optional files.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UploadTile title="Cover Image" hint={`Main thumbnail for your product · up to ${GALLERY_IMAGE_MB}MB`} maxSizeMB={GALLERY_IMAGE_MB} onUrls={setCoverUrls} />
            <UploadTile
              title="Product Gallery"
              hint={`Photos and video · up to ${GALLERY_MAX_ITEMS} items, select several at once`}
              accept="image/*,video/*"
              maxSizeMB={GALLERY_IMAGE_MB}
              videoMaxSizeMB={GALLERY_VIDEO_MB}
              maxItems={GALLERY_MAX_ITEMS}
              multiple
              onUrls={setGalleryUrls}
            />
          </div>
          <div className="mt-4">
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Supporting Documents (Optional)</p>
            <p className="mb-2 text-[11.5px] text-[#9a9a9a]">Attach brochures, technical spec sheets, or other files as applicable.</p>
            <FileUpload
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              maxSizeMB={10}
              multiple
              label="Browse files"
              hint="or Drag & drop file here"
              upload={(f) => uploadFile(f, "doc")}
              onChange={(items) => setDocUrls(items.filter((i) => !i.error && i.url?.startsWith("http")).map((i) => i.url as string))}
            />
          </div>
        </FormSection>

        {/* footer */}
        <div className="flex flex-col gap-4 border-t border-[#f0f0f0] pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-[13px] text-[#3d3d3d] dark:text-white/70">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-[#ffd716]" />
            I confirm these product details are accurate and comply with platform guidelines.
          </label>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => router.push("/dashboard?tab=catalog")} className="px-4 py-2.5 text-[13.5px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/70 dark:hover:text-white">Cancel</button>
            <button type="button" disabled={saving} onClick={() => submit(true)} className="rounded-lg border border-[#e3e3e3] px-4 py-2.5 text-[13.5px] font-medium text-[#1e1e1e] transition-colors hover:bg-[#f7f7f7] disabled:opacity-60 dark:border-white/15 dark:text-white dark:hover:bg-white/5">Save as draft</button>
            <button type="button" disabled={saving} onClick={() => submit(false)} className={cn("group inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-5 py-2.5 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-60")}>
              {saving ? "Publishing…" : "Publish product"} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
