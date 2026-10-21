"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, ImagePlus, Trash2, X, Package, Star, Loader2 } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-client";
import {
  updateProduct, addVariant, updateVariant, removeVariant,
  type ProductForEdit, type VariantRow,
} from "@/lib/services/products";

const fieldClass = "w-full px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#161616] text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]";
const labelClass = "block text-[12px] font-medium text-[#6b6b6b] dark:text-white/60";

const AVAILABILITY = [
  { value: "in_stock", label: "In stock" },
  { value: "made_to_order", label: "Made to order" },
  { value: "rentable", label: "Rentable" },
];

type EditorVariant = {
  /** Stable React key; new variants use a temp key until saved. */
  key: string;
  /** Real DB id, or null for a variant that hasn't been saved yet. */
  id: string | null;
  name: string;
  spec: string;
  price: string;
  stock: string;
  sku: string;
  active: boolean;
};

const toEditorVariant = (v: VariantRow): EditorVariant => ({
  key: v.id, id: v.id, name: v.name, spec: v.spec ?? "",
  price: v.price != null ? String(v.price) : "", stock: String(v.stock ?? 0),
  sku: v.sku ?? "", active: v.active,
});

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-[#9a9a9a]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProductEditScreen({ product }: { product: ProductForEdit }) {
  const router = useRouter();

  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku ?? "");
  const [category, setCategory] = useState(product.category ?? "");
  const [type, setType] = useState(product.type ?? "");
  const [vendorName, setVendorName] = useState(product.vendorName ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [availability, setAvailability] = useState(product.availability ?? "");

  const [retailMin, setRetailMin] = useState(product.retailMin != null ? String(product.retailMin) : "");
  const [retailMax, setRetailMax] = useState(product.retailMax != null ? String(product.retailMax) : "");
  const [wholesaleMin, setWholesaleMin] = useState(product.wholesaleMin != null ? String(product.wholesaleMin) : "");
  const [wholesaleMax, setWholesaleMax] = useState(product.wholesaleMax != null ? String(product.wholesaleMax) : "");
  const [cost, setCost] = useState(product.costPerItem != null ? String(product.costPerItem) : "");
  const [stock, setStock] = useState(String(product.stock ?? 0));
  const [unit, setUnit] = useState(product.unit ?? "");

  const [cover, setCover] = useState(product.coverUrl ?? "");
  const [gallery, setGallery] = useState<string[]>(product.gallery ?? []);
  const [tags, setTags] = useState<string[]>(product.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(
    product.specs.length ? product.specs : [{ label: "", value: "" }],
  );
  const [variants, setVariants] = useState<EditorVariant[]>(product.variants.map(toEditorVariant));

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  // Ids known to exist in the DB. Tracked locally (not read back off the stale
  // `product` prop) so a variant added by one save is still correctly deleted if
  // it's removed and saved again before the server refresh lands.
  const persistedIds = useRef<Set<string>>(new Set(product.variants.map((v) => v.id)));

  const retailN = Number(retailMin);
  const costN = Number(cost);
  const hasRetail = retailMin.trim() !== "" && Number.isFinite(retailN) && retailN > 0;
  const hasCost = cost.trim() !== "" && Number.isFinite(costN) && costN > 0;
  const profit = retailN - costN;

  const categoryOptions = useMemo(() => {
    const opts = [...product.categories];
    if (category && !opts.some((c) => c.toLowerCase() === category.toLowerCase())) opts.push(category);
    return opts;
  }, [product.categories, category]);

  async function handleUpload(files: FileList | null, target: "cover" | "gallery") {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) { toast.error(`${f.name}: unsupported file type`); continue; }
        if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} is larger than 10MB`); continue; }
        urls.push(await uploadFile(f, "product"));
      }
      if (target === "cover" && urls[0]) setCover(urls[0]);
      else if (urls.length) setGallery((g) => [...g, ...urls]);
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function addTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    setTags((prev) => (prev.some((x) => x.toLowerCase() === t.toLowerCase()) ? prev : [...prev, t]));
    setTagInput("");
  }

  function updateSpec(i: number, patch: Partial<{ label: string; value: string }>) {
    setSpecs((s) => s.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function updateVariantRow(i: number, patch: Partial<EditorVariant>) {
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }

  function addVariantRow() {
    setVariants((vs) => [...vs, { key: `new-${Date.now()}`, id: null, name: "", spec: "", price: "", stock: "0", sku: "", active: true }]);
  }

  function removeVariantRow(i: number) {
    setVariants((vs) => vs.filter((_, j) => j !== i));
  }

  async function save() {
    if (!name.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      await updateProduct(product.id, {
        name, sku: sku || undefined, category: category || undefined, type: type || undefined,
        vendorName: vendorName || undefined, description: description || undefined, availability: availability || undefined,
        retailMin: retailMin || undefined, retailMax: retailMax || undefined,
        wholesaleMin: wholesaleMin || undefined, wholesaleMax: wholesaleMax || undefined,
        costPerItem: cost || undefined, stock: stock || undefined, unit: unit || undefined,
        coverUrl: cover || undefined, gallery, tags,
        specs: specs.filter((s) => s.label.trim()),
      });

      // Sync variants: delete the ones removed from the form, then update the
      // survivors and insert the new ones. New rows get their assigned DB id
      // written back so a second save updates rather than duplicates them.
      const keptIds = new Set(variants.filter((v) => v.id).map((v) => v.id as string));
      await Promise.all([...persistedIds.current].filter((id) => !keptIds.has(id)).map((id) => removeVariant(id)));

      const next = [...variants];
      for (let i = 0; i < next.length; i++) {
        const v = next[i];
        if (!v.name.trim()) continue;
        const payload = {
          name: v.name, spec: v.spec || undefined,
          price: v.price || undefined, stock: v.stock || undefined,
          sku: v.sku || undefined, active: v.active,
        };
        if (v.id) await updateVariant(v.id, payload);
        else next[i] = { ...v, id: await addVariant(product.id, payload) };
      }
      setVariants(next);
      persistedIds.current = new Set(next.filter((v) => v.id).map((v) => v.id as string));
      setSpecs((s) => (s.some((r) => r.label.trim()) ? s : [{ label: "", value: "" }]));

      toast.success("Changes saved");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't save product";
      if (/upgrade/i.test(msg)) toast.error(msg, { action: { label: "Upgrade", onClick: () => router.push("/dashboard/plans/exhibitor") } });
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/my-products" className="w-9 h-9 rounded-full border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors flex-shrink-0"><ArrowLeft size={16} /></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[#1e1e1e] dark:text-white">Edit product</h1>
              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", product.status === "active" ? "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]" : "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60")}>{product.status}</span>
            </div>
            <p className="text-[12.5px] text-[#9a9a9a] mt-0.5">{name || "Untitled product"}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {/* media */}
        <Section title="Images" subtitle="Upload a cover image and gallery photos. Images upload directly — no links.">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
            {/* cover */}
            <div>
              <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-2">Cover image</p>
              <div className="relative aspect-square rounded-xl overflow-hidden border border-[#e3e3e3] dark:border-white/15 bg-[#fafafa] dark:bg-white/[0.03] flex items-center justify-center">
                {cover ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button type="button" onClick={() => setCover("")} title="Remove cover" className="w-7 h-7 rounded-full bg-white/90 dark:bg-black/60 flex items-center justify-center text-[#e5484d] hover:bg-white shadow-sm"><Trash2 size={14} /></button>
                    </div>
                  </>
                ) : (
                  <div className="text-center px-4 text-[#9a9a9a]"><ImagePlus size={26} className="mx-auto" /><p className="mt-2 text-[12px]">No cover image</p></div>
                )}
              </div>
              <button type="button" onClick={() => coverInput.current?.click()} disabled={uploading} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors disabled:opacity-50">{uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {cover ? "Replace cover" : "Upload cover"}</button>
              <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => { handleUpload(e.target.files, "cover"); e.target.value = ""; }} />
            </div>

            {/* gallery */}
            <div>
              <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-2">Gallery</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {gallery.map((src, i) => (
                  <div key={`${src}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#e3e3e3] dark:border-white/15 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {i !== 0 && <button type="button" onClick={() => setGallery((g) => g.filter((_, j) => j !== i))} title="Remove" className="w-6 h-6 rounded-full bg-white/90 dark:bg-black/60 flex items-center justify-center text-[#e5484d]"><Trash2 size={12} /></button>}
                      {i !== 0 && <button type="button" onClick={() => setGallery((g) => { const next = [...g]; const [picked] = next.splice(i, 1); next.unshift(picked); return next; })} title="Move to front" className="w-6 h-6 rounded-full bg-white/90 dark:bg-black/60 flex items-center justify-center text-[#1e1e1e]"><Star size={12} /></button>}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => galleryInput.current?.click()} disabled={uploading} className="aspect-square rounded-xl border-2 border-dashed border-[#e3e3e3] dark:border-white/15 flex flex-col items-center justify-center gap-1 text-[#9a9a9a] hover:border-[#ffd716] hover:text-[#caa400] transition-colors disabled:opacity-50">
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}<span className="text-[11px] font-medium">Add images</span>
                </button>
              </div>
              <input ref={galleryInput} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { handleUpload(e.target.files, "gallery"); e.target.value = ""; }} />
            </div>
          </div>
        </Section>

        {/* basics */}
        <Section title="Product details" subtitle="Name, identifiers and how it appears in the catalog.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={cn(labelClass, "sm:col-span-2")}>Product name *<input value={name} onChange={(e) => setName(e.target.value)} className={cn(fieldClass, "mt-1")} placeholder="e.g. High-Yield TMT Rebar" /></label>
            <label className={labelClass}>SKU<input value={sku} onChange={(e) => setSku(e.target.value)} className={cn(fieldClass, "mt-1")} placeholder="e.g. RBR-16-500" /></label>
            <label className={labelClass}>Vendor (display)<input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={cn(fieldClass, "mt-1")} placeholder="Supplier name" /></label>
            <label className={labelClass}>Category
              {categoryOptions.length ? (
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(fieldClass, "mt-1")}>
                  <option value="">Select a shop…</option>
                  {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={category} onChange={(e) => setCategory(e.target.value)} className={cn(fieldClass, "mt-1")} placeholder="Steel, Cement, Finishes" />
              )}
            </label>
            <label className={labelClass}>Type<input value={type} onChange={(e) => setType(e.target.value)} className={cn(fieldClass, "mt-1")} placeholder="Material, Equipment, Service" /></label>
            <label className={labelClass}>Availability
              <select value={availability} onChange={(e) => setAvailability(e.target.value)} className={cn(fieldClass, "mt-1")}>
                <option value="">Select…</option>
                {AVAILABILITY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className={cn(labelClass, "sm:col-span-2")}>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={cn(fieldClass, "mt-1 resize-y")} placeholder="Explain the applications and key benefits of this product…" /></label>
          </div>
        </Section>

        {/* pricing & stock */}
        <Section title="Pricing & stock" subtitle="Retail and wholesale pricing, your cost, and stock on hand.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className={labelClass}>Retail min (₦)<input value={retailMin} onChange={(e) => setRetailMin(e.target.value)} inputMode="numeric" className={cn(fieldClass, "mt-1")} placeholder="0" /></label>
            <label className={labelClass}>Retail max (₦)<input value={retailMax} onChange={(e) => setRetailMax(e.target.value)} inputMode="numeric" className={cn(fieldClass, "mt-1")} placeholder="optional" /></label>
            <label className={labelClass}>Unit<input value={unit} onChange={(e) => setUnit(e.target.value)} className={cn(fieldClass, "mt-1")} placeholder="per tonne, per unit" /></label>
            <label className={labelClass}>Wholesale min (₦)<input value={wholesaleMin} onChange={(e) => setWholesaleMin(e.target.value)} inputMode="numeric" className={cn(fieldClass, "mt-1")} placeholder="0" /></label>
            <label className={labelClass}>Wholesale max (₦)<input value={wholesaleMax} onChange={(e) => setWholesaleMax(e.target.value)} inputMode="numeric" className={cn(fieldClass, "mt-1")} placeholder="optional" /></label>
            <label className={labelClass}>Cost per item (₦)<input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" className={cn(fieldClass, "mt-1")} placeholder="0" /></label>
            <label className={labelClass}>Stock on hand<input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" className={cn(fieldClass, "mt-1")} placeholder="0" /></label>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-4">
            <div><p className="text-[11px] text-[#9a9a9a]">Sales price</p><p className="text-sm font-bold text-[#1e1e1e] dark:text-white">{hasRetail ? naira(retailN) : "—"}</p></div>
            {hasCost ? (
              <>
                <div><p className="text-[11px] text-[#9a9a9a]">Profit</p><p className={cn("text-sm font-bold", hasRetail && profit < 0 ? "text-[#e5484d]" : "text-[#16a34a]")}>{hasRetail ? naira(profit) : "—"}</p></div>
                <div><p className="text-[11px] text-[#9a9a9a]">Margin</p><p className="text-sm font-bold text-[#1e1e1e] dark:text-white">{hasRetail ? `${Math.round((profit / retailN) * 100)}%` : "—"}</p></div>
              </>
            ) : (
              <div className="col-span-2 flex items-center"><p className="text-[12.5px] text-[#9a9a9a]">Add cost to see profit</p></div>
            )}
          </div>
        </Section>

        {/* variants */}
        <Section title="Variants" subtitle="Sizes, grades or colours with their own price and stock." action={
          <button type="button" onClick={addVariantRow} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Plus size={14} /> Add variant</button>
        }>
          {variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-11 h-11 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"><Package size={20} /></div>
              <p className="mt-2 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">No variants yet</p>
              <p className="text-[12.5px] text-[#9a9a9a]">Add sizes, grades or colours for this product.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-x-auto">
              <table className="w-full text-left text-[13px] min-w-[620px]">
                <thead><tr className="bg-[#fafafa] dark:bg-white/[0.02] text-[11px] uppercase tracking-wide text-[#9a9a9a]">
                  {["Value", "Spec", "Price", "Stock", "SKU", "Active", ""].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}
                </tr></thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.key} className="border-t border-[#f0f0f0] dark:border-white/10">
                      <td className="px-3 py-2"><input value={v.name} onChange={(e) => updateVariantRow(i, { name: e.target.value })} className={fieldClass} placeholder="e.g. 12mm" /></td>
                      <td className="px-3 py-2"><input value={v.spec} onChange={(e) => updateVariantRow(i, { spec: e.target.value })} className={cn(fieldClass, "w-28")} placeholder="optional" /></td>
                      <td className="px-3 py-2"><input value={v.price} onChange={(e) => updateVariantRow(i, { price: e.target.value })} inputMode="numeric" className={cn(fieldClass, "w-24")} placeholder="₦" /></td>
                      <td className="px-3 py-2"><input value={v.stock} onChange={(e) => updateVariantRow(i, { stock: e.target.value })} inputMode="numeric" className={cn(fieldClass, "w-20")} placeholder="0" /></td>
                      <td className="px-3 py-2"><input value={v.sku} onChange={(e) => updateVariantRow(i, { sku: e.target.value })} className={cn(fieldClass, "w-28")} placeholder="SKU" /></td>
                      <td className="px-3 py-2"><input type="checkbox" checked={v.active} onChange={(e) => updateVariantRow(i, { active: e.target.checked })} className="h-4 w-4 accent-[#ffd716]" /></td>
                      <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeVariantRow(i)} className="text-[#b3b3b3] hover:text-[#e5484d]"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* tags */}
        <Section title="Tags" subtitle="Keywords buyers can search on. Press Enter to add.">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md bg-[#1e1e1e] text-white dark:bg-white/10">{t} <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="opacity-60 hover:opacity-100"><X size={11} /></button></span>
            ))}
            {tags.length === 0 && <span className="text-[12.5px] text-[#9a9a9a]">No tags yet.</span>}
          </div>
          <div className="flex items-center gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }} onBlur={() => addTag(tagInput)} className={fieldClass} placeholder="e.g. reinforcement" />
            <button type="button" onClick={() => addTag(tagInput)} className="flex-shrink-0 px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">Add</button>
          </div>
        </Section>

        {/* specs */}
        <Section title="Technical specs" subtitle="One label and value per row (e.g. Tensile strength — 550 MPa)." action={
          <button type="button" onClick={() => setSpecs((s) => [...s, { label: "", value: "" }])} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Plus size={14} /> Add spec</button>
        }>
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={s.label} onChange={(e) => updateSpec(i, { label: e.target.value })} className={cn(fieldClass, "sm:max-w-[240px]")} placeholder="Label (e.g. Tensile strength)" />
                <input value={s.value} onChange={(e) => updateSpec(i, { value: e.target.value })} className={fieldClass} placeholder="Value (e.g. 550 MPa)" />
                <button type="button" onClick={() => setSpecs((prev) => prev.filter((_, j) => j !== i))} className="flex-shrink-0 text-[#b3b3b3] hover:text-[#e5484d]" aria-label="Remove spec"><X size={16} /></button>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* save bar */}
      <div className="mt-5 flex items-center justify-end gap-2.5 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] px-5 py-3">
        <Link href="/dashboard/my-products" className="px-4 py-2.5 rounded-lg text-[13px] font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">Cancel</Link>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors disabled:opacity-60">
          {saving && <Loader2 size={15} className="animate-spin" />}{saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
