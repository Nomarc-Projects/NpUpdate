"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, FileText, ImagePlus, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { PlanLimitBanner } from "@/components/dashboard/exhibitor/plan-limit-banner";
import { addVariant, createProduct, removeVariant, updateProduct, updateVariant, type ProductForEdit, type ProductInput, type ProductStatus, type VariantRow } from "@/lib/services/products";
import { saveCompany } from "@/lib/services/company";
import { PRODUCT_UNITS, UNIT_CUSTOM } from "@/lib/constants/product-units";
import { uploadFile } from "@/lib/upload-client";
import { naira } from "@/lib/sample-catalog";
import type { ExhibitorLimitSummary } from "@/lib/services/exhibitor-trial-rules";
import { DELIVERY_OPTIONS, NIGERIAN_STATES, type DeliveryMode } from "@/lib/product-delivery";
import { cn } from "@/lib/utils";

const DESC_MAX = 500;
const GALLERY_MAX_ITEMS = 10;
const IMAGE_MAX_MB = 5;
const VIDEO_MAX_MB = 10;
const LEAD_TIME_UNITS = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
];
const AVAILABILITY = [
  { value: "in_stock", label: "In stock" },
  { value: "made_to_order", label: "Made to order" },
  { value: "rentable", label: "Rentable" },
];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const DOC_TYPES = ["application/pdf", ...IMAGE_TYPES];

type EditorVariant = {
  key: string;
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

const toVariantPayload = (v: EditorVariant) => ({
  name: v.name.trim(), spec: v.spec || undefined,
  price: v.price || undefined, stock: v.stock || undefined,
  sku: v.sku || undefined, active: v.active,
});

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
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

function specIsDocument(spec: { label: string }) { return spec.label.trim().toLowerCase() === "document"; }
function specIsDimension(spec: { label: string }) { return spec.label.trim().toLowerCase() === "sizes / variations"; }
function isVideoUrl(url: string) { return /\.(mp4|webm|mov)(?:[?#]|$)/i.test(url); }

export type ProductFormProps = {
  mode: "create" | "edit";
  product?: ProductForEdit;
  allowedCategories?: string[];
  limits?: ExhibitorLimitSummary | null;
};

/** One catalog editor for new listings and existing products. */
export function ProductForm({ mode, product, allowedCategories = [], limits = null }: ProductFormProps) {
  const editing = mode === "edit";
  const router = useRouter();
  const initialUnit = product?.unit ?? (editing ? "" : PRODUCT_UNITS[0]);
  const isListedUnit = PRODUCT_UNITS.some((u) => u === initialUnit);
  const sourceSpecs = product?.specs ?? [];
  const documentUrls = sourceSpecs.filter(specIsDocument).map((s) => s.value).filter(Boolean);
  const technicalSpecs = sourceSpecs.filter((s) => !specIsDocument(s) && !specIsDimension(s));
  const savedCover = product?.coverUrl ?? "";

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [vendorName, setVendorName] = useState(product?.vendorName ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [categories, setCategories] = useState(allowedCategories);
  const [type, setType] = useState(product?.type ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [availability, setAvailability] = useState(product?.availability ?? (editing ? "" : "in_stock"));
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | null>(product?.deliveryMode ?? null);
  const [deliveryStates, setDeliveryStates] = useState<string[]>(product?.deliveryStates ?? []);
  const [deliverySearch, setDeliverySearch] = useState("");
  const [leadTimeValue, setLeadTimeValue] = useState(product?.leadTimeValue != null ? String(product.leadTimeValue) : "");
  const [leadTimeUnit, setLeadTimeUnit] = useState(product?.leadTimeUnit ?? "days");
  const [retailMin, setRetailMin] = useState(product?.retailMin != null ? String(product.retailMin) : "");
  const [retailMax, setRetailMax] = useState(product?.retailMax != null ? String(product.retailMax) : "");
  const [wholesaleMin, setWholesaleMin] = useState(product?.wholesaleMin != null ? String(product.wholesaleMin) : "");
  const [wholesaleMax, setWholesaleMax] = useState(product?.wholesaleMax != null ? String(product.wholesaleMax) : "");
  const [cost, setCost] = useState(product?.costPerItem != null ? String(product.costPerItem) : "");
  const [stock, setStock] = useState(product ? String(product.stock ?? 0) : "100");
  const [unit, setUnit] = useState<string>(isListedUnit ? initialUnit : initialUnit ? UNIT_CUSTOM : "");
  const [customUnit, setCustomUnit] = useState(isListedUnit ? "" : initialUnit);
  const [dimensions, setDimensions] = useState(sourceSpecs.find(specIsDimension)?.value ?? "");
  const [cover, setCover] = useState(savedCover);
  const [gallery, setGallery] = useState<string[]>((product?.gallery ?? []).filter((url) => url !== savedCover));
  const [documents, setDocuments] = useState<string[]>(documentUrls);
  const [tags, setTags] = useState<string[]>(product?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(
    technicalSpecs.length ? technicalSpecs : [{ label: "", value: "" }],
  );
  const [variants, setVariants] = useState<EditorVariant[]>(product?.variants.map(toEditorVariant) ?? []);
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "active");
  const [confirmed, setConfirmed] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const persistedIds = useRef<Set<string>>(new Set(product?.variants.map((v) => v.id) ?? []));

  const categoryOptions = useMemo(() => {
    const result = [...categories];
    if (category && !result.some((c) => c.toLowerCase() === category.toLowerCase())) result.push(category);
    return result;
  }, [categories, category]);
  const categoryCap = limits?.categoryCap ?? 0;
  const nextPlanLabel = limits?.nextPlanLabel ?? null;
  const resolvedUnit = unit === UNIT_CUSTOM ? customUnit.trim() : unit;
  const retailN = Number(retailMin);
  const costN = Number(cost);
  const hasRetail = retailMin.trim() !== "" && Number.isFinite(retailN) && retailN > 0;
  const hasCost = cost.trim() !== "" && Number.isFinite(costN) && costN > 0;
  const profit = retailN - costN;
  const visibleDeliveryStates = useMemo(() => {
    const query = deliverySearch.trim().toLowerCase();
    return query ? NIGERIAN_STATES.filter((state) => state.toLowerCase().includes(query)) : NIGERIAN_STATES;
  }, [deliverySearch]);

  async function uploadProductFile(file: File, target: "cover" | "gallery" | "document") {
    const typeAllowed = target === "document"
      ? DOC_TYPES.includes(file.type)
      : IMAGE_TYPES.includes(file.type) || (target === "gallery" && VIDEO_TYPES.includes(file.type));
    if (!typeAllowed) {
      toast.error(`${file.name}: unsupported file type`);
      return null;
    }
    const limit = target === "gallery" && VIDEO_TYPES.includes(file.type) ? VIDEO_MAX_MB : target === "document" ? 10 : IMAGE_MAX_MB;
    if (file.size > limit * 1024 * 1024) {
      toast.error(`${file.name} is larger than ${limit}MB`);
      return null;
    }

    try {
      return await uploadFile(file, target === "document" ? "doc" : "product");
    } catch (error) {
      toast.error(error instanceof Error ? `${file.name}: ${error.message}` : `${file.name}: upload failed`);
      return null;
    }
  }

  async function chooseCover(file: File | undefined) {
    if (!file) return;
    setUploading((count) => count + 1);
    try {
      const url = await uploadProductFile(file, "cover");
      if (url) { setCover(url); setMediaError(false); }
    } finally {
      setUploading((count) => Math.max(0, count - 1));
    }
  }

  async function chooseGallery(files: FileList | null) {
    if (!files?.length) return;
    const room = GALLERY_MAX_ITEMS - gallery.length;
    if (room <= 0) { toast.error(`Gallery limit reached (${GALLERY_MAX_ITEMS} items)`); return; }
    const selected = Array.from(files).slice(0, room);
    if (files.length > room) toast.error(`Only ${room} more gallery item${room === 1 ? "" : "s"} can be added`);
    setUploading((count) => count + 1);
    try {
      for (const file of selected) {
        const url = await uploadProductFile(file, "gallery");
        if (url) setGallery((items) => items.includes(url) ? items : [...items, url]);
      }
    } finally {
      setUploading((count) => Math.max(0, count - 1));
    }
  }

  async function chooseDocuments(files: FileList | null) {
    if (!files?.length) return;
    setUploading((count) => count + 1);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadProductFile(file, "document");
        if (url) setDocuments((items) => items.includes(url) ? items : [...items, url]);
      }
    } finally {
      setUploading((count) => Math.max(0, count - 1));
    }
  }

  async function addCategory() {
    const next = newCategory.trim();
    if (!next) return;
    if (categories.some((c) => c.trim().toLowerCase() === next.toLowerCase())) {
      toast.error("That category is already on your showroom.");
      return;
    }
    if (limits && categories.length >= categoryCap) {
      toast.error(
        `Your ${limits.planLabel ?? "current"} plan allows up to ${categoryCap} categor${categoryCap === 1 ? "y" : "ies"}.${nextPlanLabel ? ` Upgrade to ${nextPlanLabel} to add more.` : ""}`,
        { action: { label: "Upgrade", onClick: () => router.push("/dashboard/plans/exhibitor") } },
      );
      return;
    }
    setAddingCategory(true);
    try {
      const updated = [...categories, next];
      await saveCompany({ categories: updated });
      setCategories(updated);
      setCategory(next);
      setNewCategory("");
      setAddCategoryOpen(false);
      toast.success(`“${next}” added to your showroom`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add category");
    } finally {
      setAddingCategory(false);
    }
  }

  function changeAvailability(next: string) {
    setAvailability(next);
    if (next !== "made_to_order") {
      setLeadTimeValue("");
      setLeadTimeUnit("days");
    }
    if (!editing && next === "made_to_order") setStock("0");
    if (!editing && next === "in_stock") setStock((current) => current === "0" ? "100" : current);
  }

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    setTags((current) => current.some((item) => item.toLowerCase() === tag.toLowerCase()) ? current : [...current, tag]);
    setTagInput("");
  }

  function addVariantRow() {
    setVariants((current) => [...current, {
      key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      id: null, name: "", spec: "", price: "", stock: "0", sku: "", active: true,
    }]);
  }

  async function saveVariants(productId: string) {
    const currentIds = new Set(variants.filter((variant) => variant.id).map((variant) => variant.id as string));
    await Promise.all([...persistedIds.current].filter((id) => !currentIds.has(id)).map((id) => removeVariant(id)));
    const next = [...variants];
    for (let i = 0; i < next.length; i++) {
      const variant = next[i];
      if (!variant.name.trim()) continue;
      if (variant.id) await updateVariant(variant.id, toVariantPayload(variant));
      else next[i] = { ...variant, id: await addVariant(productId, toVariantPayload(variant)) };
    }
    persistedIds.current = new Set(next.filter((variant) => variant.id).map((variant) => variant.id as string));
    setVariants(next);
  }

  async function save() {
    if (!name.trim()) { toast.error("Product name is required"); return; }
    if (uploading > 0) { toast.error("Wait for image and document uploads to finish"); return; }
    if (!deliveryMode) { toast.error("Choose a delivery option for this product."); return; }
    if (deliveryMode === "selected_states" && deliveryStates.length === 0) {
      toast.error("Select at least one state for delivery.");
      return;
    }
    if (!editing && status === "active") {
      if (!resolvedUnit) { toast.error("Tell buyers what the price is per, or pick a unit."); return; }
      if (!category.trim()) { toast.error("Product category is required"); return; }
      if (categories.length > 0 && !categories.some((c) => c.toLowerCase() === category.trim().toLowerCase())) {
        toast.error(`Category must be one of your registered shops: ${categories.join(", ")}`);
        return;
      }
      if (!confirmed) { toast.error("Please confirm your product details comply with platform guidelines."); return; }
    }

    const leadN = Number(leadTimeValue);
    if (status === "active" && availability === "made_to_order" && (!leadTimeValue.trim() || !Number.isInteger(leadN) || leadN <= 0)) {
      toast.error("Add a lead time so buyers know how long a made-to-order product will take.");
      return;
    }

    const coverForSave = cover || gallery.find((url) => !isVideoUrl(url)) || "";
    if (!editing && status === "active" && !coverForSave) {
      setMediaError(true);
      toast.error("Please add at least one product image to publish");
      mediaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setMediaError(false);
    setSaving(true);

    const savedSpecs = specs.filter((row) => row.label.trim());
    if (dimensions.trim()) savedSpecs.unshift({ label: "Sizes / Variations", value: dimensions.trim() });
    for (const url of documents) savedSpecs.push({ label: "Document", value: url });
    const productGallery = [...new Set([...(coverForSave ? [coverForSave] : []), ...gallery])];
    const input: ProductInput = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      vendorName: vendorName.trim() || undefined,
      category: category.trim() || undefined,
      type: type.trim() || undefined,
      description: description.trim() || undefined,
      availability: availability || undefined,
      deliveryMode,
      deliveryStates: deliveryMode === "selected_states" ? deliveryStates : undefined,
      leadTimeValue: availability === "made_to_order" ? leadTimeValue : undefined,
      leadTimeUnit: availability === "made_to_order" ? leadTimeUnit : undefined,
      retailMin: retailMin.trim() ? Number(retailMin) : undefined,
      retailMax: retailMax.trim() ? Number(retailMax) : undefined,
      wholesaleMin: wholesaleMin.trim() ? Number(wholesaleMin) : undefined,
      wholesaleMax: wholesaleMax.trim() ? Number(wholesaleMax) : undefined,
      costPerItem: cost.trim() ? Number(cost) : undefined,
      stock: stock.trim() ? Number(stock) : 0,
      unit: resolvedUnit || undefined,
      coverUrl: coverForSave || undefined,
      gallery: productGallery.length ? productGallery : undefined,
      tags,
      specs: savedSpecs,
      status,
    };

    try {
      if (editing && product) {
        await updateProduct(product.id, input);
        await saveVariants(product.id);
        toast.success("Changes saved");
        router.refresh();
      } else {
        const productId = await createProduct(input, status === "draft");
        try {
          await saveVariants(productId);
        } catch (error) {
          toast.error(error instanceof Error ? `Product saved, but variants could not be saved: ${error.message}` : "Product saved, but variants could not be saved");
          router.push(`/dashboard/my-products/${productId}`);
          return;
        }
        toast.success(status === "draft" ? "Saved as draft" : "Product published!");
        router.push(status === "draft" ? "/dashboard?tab=drafts" : "/dashboard?tab=catalog");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't save product";
      if (/upgrade/i.test(message)) {
        toast.error(message, { action: { label: "Upgrade", onClick: () => router.push("/dashboard/plans/exhibitor") } });
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-6 sm:px-6 lg:px-8">
      {limits && <div className="mb-5"><PlanLimitBanner limits={limits} /></div>}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">{editing ? "Edit product" : "Add new product"}</h1>
          <p className="mt-0.5 text-[13px] text-[#9a9a9a]">{editing ? name || "Update your catalog listing." : "Add a product to your catalog."}</p>
        </div>
        {editing && <Link href="/dashboard/my-products" className="text-[13px] font-medium text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white">Back to products</Link>}
      </div>

      <div className="space-y-5">
        <Section title="Product details" subtitle="Names, categorization, material details and availability.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Product name" required>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-Yield TMT Rebar" />
            </Field>
            <Field label="SKU"><input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. RBR-16-500" /></Field>
            <Field label="Vendor (display)"><input className={inputClass} value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Supplier name" /></Field>
            <Field label="Product category" hint={categories.length ? `Your shops: ${categories.join(", ")}` : "Add a category below"}>
              {categoryOptions.length ? (
                <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select a shop…</option>
                  {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              ) : <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Steel, Cement, Finishes" />}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!addCategoryOpen ? (
                  <button type="button" onClick={() => setAddCategoryOpen(true)} className="text-[12.5px] font-medium text-[#caa400] hover:underline"><Plus size={13} className="mr-1 inline" />Add a new category</button>
                ) : (
                  <div className="flex w-full items-center gap-2">
                    <input autoFocus className={inputClass} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addCategory(); } }} placeholder="e.g. Roofing & Waterproofing" />
                    <button type="button" disabled={addingCategory || !newCategory.trim()} onClick={() => void addCategory()} className="rounded-lg bg-[#ffd716] px-3 py-2 text-[12px] font-semibold disabled:opacity-50">{addingCategory ? "Adding…" : "Add"}</button>
                    <button type="button" onClick={() => { setAddCategoryOpen(false); setNewCategory(""); }} className="px-2 text-[12px] text-[#777]">Cancel</button>
                  </div>
                )}
                {limits && <span className="text-[11px] text-[#9a9a9a]">{categories.length}/{categoryCap} categories</span>}
              </div>
            </Field>
            <Field label="Material / grade / type"><input className={inputClass} value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Grade 500 / Structural" /></Field>
            <Field label="Availability">
              <select className={inputClass} value={availability} onChange={(e) => changeAvailability(e.target.value)}>
                <option value="">Select…</option>
                {AVAILABILITY.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Delivery" required hint="Tell buyers where you deliver">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DELIVERY_OPTIONS.map((option) => (
                  <label key={option.value} className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] transition-colors",
                    deliveryMode === option.value
                      ? "border-[#caa400] bg-[#fff9dc] text-[#1e1e1e] dark:border-[#ffd716] dark:bg-[#ffd716]/10 dark:text-white"
                      : "border-[#e3e3e3] text-[#6b6b6b] hover:border-[#ffd716] dark:border-white/15 dark:text-white/70",
                  )}>
                    <input type="radio" name="delivery-mode" value={option.value} checked={deliveryMode === option.value} onChange={() => setDeliveryMode(option.value)} className="h-4 w-4 accent-[#ffd716]" />
                    <span className="font-semibold">{option.label}</span>
                  </label>
                ))}
              </div>
              {deliveryMode === "selected_states" && (
                <div className="mt-3 rounded-xl border border-[#ececec] p-3 dark:border-white/10">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white">Choose delivery states</p>
                    <span className="text-[11px] text-[#9a9a9a]">{deliveryStates.length} selected</span>
                  </div>
                  <input className={inputClass} value={deliverySearch} onChange={(e) => setDeliverySearch(e.target.value)} placeholder="Search states…" aria-label="Search delivery states" />
                  <div className="mt-2 grid max-h-48 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
                    {visibleDeliveryStates.map((state) => {
                      const checked = deliveryStates.includes(state);
                      return (
                        <label key={state} className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]", checked ? "bg-[#fff9dc] text-[#1e1e1e] dark:bg-[#ffd716]/10 dark:text-white" : "text-[#666] hover:bg-[#f7f7f7] dark:text-white/70 dark:hover:bg-white/5")}>
                          <input type="checkbox" checked={checked} onChange={() => setDeliveryStates((current) => checked ? current.filter((item) => item !== state) : [...current, state])} className="h-3.5 w-3.5 accent-[#ffd716]" />
                          {state}
                        </label>
                      );
                    })}
                    {visibleDeliveryStates.length === 0 && <p className="col-span-full py-3 text-center text-[12px] text-[#9a9a9a]">No states match your search.</p>}
                  </div>
                </div>
              )}
            </Field>
            <Field label="Listing status">
              <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                {editing && <option value="archived">Archived</option>}
              </select>
            </Field>
            {availability === "made_to_order" && (
              <Field label="Lead time" hint="Required for made-to-order listings">
                <div className="flex gap-2">
                  <input className={inputClass} type="number" min="1" step="1" inputMode="numeric" value={leadTimeValue} onChange={(e) => setLeadTimeValue(e.target.value)} placeholder="14" />
                  <select className={cn(inputClass, "w-36 flex-shrink-0")} value={leadTimeUnit} onChange={(e) => setLeadTimeUnit(e.target.value)} aria-label="Lead time unit">
                    {LEAD_TIME_UNITS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
              </Field>
            )}
            <Field label="Description" hint={`${description.length}/${DESC_MAX}`}>
              <textarea rows={4} maxLength={DESC_MAX} className={inputClass + " resize-y"} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the applications and key benefits of this product…" />
            </Field>
          </div>
        </Section>

        <Section title="Pricing & stock" subtitle="Retail and wholesale pricing, unit, cost and stock on hand.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Retail price min (₦)"><input className={inputClass} type="number" min="0" inputMode="decimal" value={retailMin} onChange={(e) => setRetailMin(e.target.value)} placeholder="e.g. 8000" /></Field>
            <Field label="Retail price max (₦)"><input className={inputClass} type="number" min="0" inputMode="decimal" value={retailMax} onChange={(e) => setRetailMax(e.target.value)} placeholder="Optional" /></Field>
            <Field label="Priced per" hint="How buyers purchase this product">
              <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="">Select a unit…</option>
                {PRODUCT_UNITS.map((item) => <option key={item} value={item}>{item}</option>)}
                <option value={UNIT_CUSTOM}>Something else…</option>
              </select>
              {unit === UNIT_CUSTOM && <input className={inputClass + " mt-2"} value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="e.g. per pallet of 24" aria-label="Custom pricing unit" />}
            </Field>
            <Field label="Wholesale price min (₦)"><input className={inputClass} type="number" min="0" inputMode="decimal" value={wholesaleMin} onChange={(e) => setWholesaleMin(e.target.value)} placeholder="Optional" /></Field>
            <Field label="Wholesale price max (₦)"><input className={inputClass} type="number" min="0" inputMode="decimal" value={wholesaleMax} onChange={(e) => setWholesaleMax(e.target.value)} placeholder="Optional" /></Field>
            <Field label="Cost per item (₦)" hint="Only you can see this">
              <input className={inputClass} type="number" min="0" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Stock on hand"><input className={inputClass} type="number" min="0" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" /></Field>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-[#fafafa] p-4 dark:bg-white/[0.03] sm:grid-cols-3">
            <div><p className="text-[11px] text-[#9a9a9a]">Sales price</p><p className="text-sm font-bold text-[#1e1e1e] dark:text-white">{hasRetail ? naira(retailN) : "—"}</p></div>
            {hasCost ? <>
              <div><p className="text-[11px] text-[#9a9a9a]">Profit</p><p className={cn("text-sm font-bold", hasRetail && profit < 0 ? "text-[#e5484d]" : "text-[#16a34a]")}>{hasRetail ? naira(profit) : "—"}</p></div>
              <div><p className="text-[11px] text-[#9a9a9a]">Margin</p><p className="text-sm font-bold text-[#1e1e1e] dark:text-white">{hasRetail ? `${Math.round((profit / retailN) * 100)}%` : "—"}</p></div>
            </> : <div className="flex items-center sm:col-span-2"><p className="text-[12.5px] text-[#9a9a9a]">Add cost to see profit</p></div>}
          </div>
        </Section>

        <Section title="Dimensions & technical specs" subtitle="Add product sizes, variations, compliance and technical details.">
          <Field label="Dimensions / variations" hint="Optional; e.g. 10mm, 12mm, 16mm">
            <input className={inputClass} value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 10mm, 12mm, 16mm…" />
          </Field>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Technical specs & features</p>
                <p className="text-[11.5px] text-[#9a9a9a]">Use one label and value per row.</p>
              </div>
              <button type="button" onClick={() => setSpecs((current) => [...current, { label: "", value: "" }])} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#caa400] hover:underline"><Plus size={14} /> Add spec</button>
            </div>
            <div className="space-y-2">
              {specs.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input className={cn(inputClass, "sm:max-w-[280px]")} value={spec.label} onChange={(e) => setSpecs((current) => current.map((row, i) => i === index ? { ...row, label: e.target.value } : row))} onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) { e.preventDefault(); setSpecs((current) => [...current.slice(0, index + 1), { label: "", value: "" }, ...current.slice(index + 1)]); } }} placeholder="Feature / spec" />
                  <input className={inputClass} value={spec.value} onChange={(e) => setSpecs((current) => current.map((row, i) => i === index ? { ...row, value: e.target.value } : row))} placeholder="Value (optional)" />
                  <button type="button" onClick={() => setSpecs((current) => current.length === 1 ? [{ label: "", value: "" }] : current.filter((_, i) => i !== index))} className="flex-shrink-0 text-[#b3b3b3] hover:text-[#e5484d]" aria-label="Remove spec"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Images & documents" subtitle="Upload a cover, gallery images or clips, and supporting files.">
          <div ref={mediaRef} className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
            <div>
              <p className="mb-2 text-[12px] font-semibold text-[#1e1e1e] dark:text-white">Cover image {status === "active" && !editing && <span className="text-[#e5484d]">*</span>}</p>
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#fafafa] dark:border-white/15 dark:bg-white/[0.03]">
                {cover ? <>
                  {isVideoUrl(cover)
                    ? <video src={cover} className="h-full w-full object-cover" muted playsInline controls />
                    : <img src={cover} alt="Product cover" className="h-full w-full object-cover" />}
                  <button type="button" onClick={() => setCover("")} title="Remove cover" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#e5484d] shadow-sm dark:bg-black/60"><Trash2 size={14} /></button>
                </> : <div className="px-4 text-center text-[#9a9a9a]"><ImagePlus size={26} className="mx-auto" /><p className="mt-2 text-[12px]">No cover image</p></div>}
              </div>
              <button type="button" onClick={() => coverInput.current?.click()} disabled={saving || uploading > 0} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] disabled:opacity-50 dark:border-white/15 dark:text-white">
                {uploading > 0 ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{cover ? "Replace cover" : "Upload cover"}
              </button>
              <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void chooseCover(e.target.files?.[0]); e.target.value = ""; }} />
              {mediaError && <p className="mt-1 text-[11.5px] text-[#e5484d]">Add a cover image to publish.</p>}
            </div>

            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div><p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white">Product gallery</p><p className="text-[11px] text-[#9a9a9a]">Up to {GALLERY_MAX_ITEMS} images or clips · images 5MB, videos 10MB.</p></div>
                <button type="button" onClick={() => galleryInput.current?.click()} disabled={saving || uploading > 0 || gallery.length >= GALLERY_MAX_ITEMS} className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12px] font-medium text-[#1e1e1e] hover:border-[#ffd716] disabled:opacity-50 dark:border-white/15 dark:text-white"><ImagePlus size={14} /> Add images</button>
                <input ref={galleryInput} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { void chooseGallery(e.target.files); e.target.value = ""; }} />
              </div>
              {gallery.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-[#e3e3e3] dark:border-white/15">
                  {isVideoUrl(url)
                      ? <video src={url} className="h-full w-full object-cover" muted playsInline controls />
                      : <img src={url} alt={`Product gallery ${index + 1}`} className="h-full w-full object-cover" />}
                    <div className="absolute right-1 top-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      {!isVideoUrl(url) && <button type="button" title="Use as cover" onClick={() => { setCover(url); setGallery((items) => items.filter((item) => item !== url)); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#1e1e1e] shadow dark:bg-black/60 dark:text-white"><Star size={13} /></button>}
                      <button type="button" title="Remove" onClick={() => setGallery((items) => items.filter((item) => item !== url))} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#e5484d] shadow dark:bg-black/60"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div> : <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#e3e3e3] text-center text-[#9a9a9a] dark:border-white/15"><ImagePlus size={22} /><p className="mt-2 text-[12px]">No gallery images yet</p></div>}
            </div>
          </div>

          <div className="mt-6 border-t border-[#f0f0f0] pt-5 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Supporting documents</p><p className="text-[11.5px] text-[#9a9a9a]">Attach brochures or technical spec sheets (PDF or image).</p></div>
              <button type="button" onClick={() => documentInput.current?.click()} disabled={saving || uploading > 0} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12px] font-medium text-[#1e1e1e] hover:border-[#ffd716] disabled:opacity-50 dark:border-white/15 dark:text-white"><FileText size={14} /> Browse files</button>
              <input ref={documentInput} type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={(e) => { void chooseDocuments(e.target.files); e.target.value = ""; }} />
            </div>
            {documents.length > 0 && <ul className="space-y-2">
              {documents.map((url, index) => <li key={`${url}-${index}`} className="flex items-center gap-2 rounded-lg border border-[#ececec] px-3 py-2 text-[12px] dark:border-white/10">
                <FileText size={14} className="flex-shrink-0 text-[#9a9a9a]" />
                <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[#6b6b6b] underline-offset-2 hover:underline dark:text-white/70">Supporting document {index + 1}</a>
                <button type="button" onClick={() => setDocuments((items) => items.filter((item) => item !== url))} className="text-[#9a9a9a] hover:text-[#e5484d]" aria-label="Remove document"><X size={15} /></button>
              </li>)}
            </ul>}
          </div>
        </Section>

        <Section title="Tags" subtitle="Keywords buyers can search on. Press Enter or comma to add.">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-[#1e1e1e] px-2 py-1 text-[12px] text-white dark:bg-white/10">{tag}<button type="button" onClick={() => setTags((items) => items.filter((item) => item !== tag))} aria-label={`Remove ${tag}`} className="opacity-60 hover:opacity-100"><X size={11} /></button></span>)}
            {tags.length === 0 && <span className="text-[12.5px] text-[#9a9a9a]">No tags added.</span>}
          </div>
          <div className="flex items-center gap-2">
            <input className={inputClass} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }} onBlur={() => addTag(tagInput)} placeholder="e.g. reinforcement" />
            <button type="button" onClick={() => addTag(tagInput)} className="flex-shrink-0 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium dark:border-white/15">Add</button>
          </div>
        </Section>

        <Section title="Variants" subtitle="Sizes, grades or colours with their own price and stock." action={<button type="button" onClick={addVariantRow} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12.5px] font-medium dark:border-white/15"><Plus size={14} /> Add variant</button>}>
          {variants.length === 0 ? <p className="py-4 text-[12.5px] text-[#9a9a9a]">No variants yet. Add sizes, grades or colours with separate pricing and stock.</p> : (
            <div className="overflow-x-auto rounded-xl border border-[#ececec] dark:border-white/10">
              <table className="w-full min-w-[650px] text-left text-[13px]">
                <thead><tr className="bg-[#fafafa] text-[11px] uppercase tracking-wide text-[#9a9a9a] dark:bg-white/[0.02]">{["Value", "Spec", "Price", "Stock", "SKU", "Active", ""].map((heading) => <th key={heading} className="px-3 py-2.5 font-semibold">{heading}</th>)}</tr></thead>
                <tbody>{variants.map((variant, index) => (
                  <tr key={variant.key} className="border-t border-[#f0f0f0] dark:border-white/10">
                    <td className="px-2 py-2"><input className={inputClass} value={variant.name} onChange={(e) => setVariants((items) => items.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} placeholder="e.g. 12mm" /></td>
                    <td className="px-2 py-2"><input className={cn(inputClass, "w-28")} value={variant.spec} onChange={(e) => setVariants((items) => items.map((item, i) => i === index ? { ...item, spec: e.target.value } : item))} placeholder="Optional" /></td>
                    <td className="px-2 py-2"><input className={cn(inputClass, "w-24")} value={variant.price} onChange={(e) => setVariants((items) => items.map((item, i) => i === index ? { ...item, price: e.target.value } : item))} inputMode="numeric" placeholder="₦" /></td>
                    <td className="px-2 py-2"><input className={cn(inputClass, "w-20")} value={variant.stock} onChange={(e) => setVariants((items) => items.map((item, i) => i === index ? { ...item, stock: e.target.value } : item))} inputMode="numeric" placeholder="0" /></td>
                    <td className="px-2 py-2"><input className={cn(inputClass, "w-28")} value={variant.sku} onChange={(e) => setVariants((items) => items.map((item, i) => i === index ? { ...item, sku: e.target.value } : item))} placeholder="SKU" /></td>
                    <td className="px-3 py-2 text-center"><input type="checkbox" checked={variant.active} onChange={(e) => setVariants((items) => items.map((item, i) => i === index ? { ...item, active: e.target.checked } : item))} className="h-4 w-4 accent-[#ffd716]" /></td>
                    <td className="px-2 py-2 text-right"><button type="button" onClick={() => setVariants((items) => items.filter((_, i) => i !== index))} className="text-[#b3b3b3] hover:text-[#e5484d]" aria-label="Remove variant"><Trash2 size={14} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Section>

        <div className="flex flex-col gap-4 rounded-2xl border border-[#ececec] bg-white px-5 py-4 dark:border-white/10 dark:bg-[#1e1e1e] sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-[13px] text-[#3d3d3d] dark:text-white/70">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-[#ffd716]" />
            I confirm these product details are accurate and comply with platform guidelines.
          </label>
          <div className="flex items-center justify-end gap-2.5">
            <Link href={editing ? "/dashboard/my-products" : "/dashboard?tab=catalog"} className="px-4 py-2.5 text-[13.5px] font-medium text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/70 dark:hover:text-white">Cancel</Link>
            {uploading > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-[#9a9a9a]"><Loader2 size={13} className="animate-spin" />Uploading</span>}
            <button type="button" disabled={saving || uploading > 0} onClick={() => void save()} className="group inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-5 py-2.5 text-[13.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-60">
              {saving && <Loader2 size={15} className="animate-spin" />}{saving ? "Saving…" : editing ? "Save changes" : status === "draft" ? "Save as draft" : "Publish product"}{!saving && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
