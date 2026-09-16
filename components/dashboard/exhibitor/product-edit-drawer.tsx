"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlideOverDrawer } from "@/components/dashboard/kit";
import { getOwnedProductForEdit, updateProduct } from "@/lib/services/products";

const inputCls = "w-full rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white";
const labelCls = "mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]";
const fieldCls = "mb-3";
const btnPrimary = "rounded-lg bg-[#ffd716] px-4 py-2 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-50";
const btnGhost = "rounded-lg border border-[#e3e3e3] px-4 py-2 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5";

export function ProductEditDrawer({ open, onClose, productId }: { open: boolean; onClose: () => void; productId: string | null }) {
  const router = useRouter();
  const [, start] = useTransition();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [availability, setAvailability] = useState("");
  const [retailMin, setRetailMin] = useState("");
  const [retailMax, setRetailMax] = useState("");
  const [wholesaleMin, setWholesaleMin] = useState("");
  const [wholesaleMax, setWholesaleMax] = useState("");
  const [costPerItem, setCostPerItem] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [gallery, setGallery] = useState("");
  const [tags, setTags] = useState("");
  const [specs, setSpecs] = useState("");

  useEffect(() => {
    if (!open || !productId) return;
    setLoaded(false);
    const close = () => onCloseRef.current();
    getOwnedProductForEdit(productId)
      .then((d) => {
        if (!d) { toast.error("Product not found"); close(); return; }
        setName(d.name ?? ""); setCategory(d.category ?? ""); setType(d.type ?? ""); setVendorName(d.vendorName ?? "");
        setDescription(d.description ?? ""); setAvailability(d.availability ?? "");
        setRetailMin(d.retailMin?.toString() ?? ""); setRetailMax(d.retailMax?.toString() ?? "");
        setWholesaleMin(d.wholesaleMin?.toString() ?? ""); setWholesaleMax(d.wholesaleMax?.toString() ?? "");
        setCostPerItem(d.costPerItem?.toString() ?? ""); setStock(d.stock?.toString() ?? ""); setUnit(d.unit ?? "");
        setCoverUrl(d.coverUrl ?? ""); setGallery((d.gallery ?? []).join(", ")); setTags((d.tags ?? []).join(", "));
        setSpecs((d.specs ?? []).map((s) => (s.value ? `${s.label}: ${s.value}` : s.label)).join("\n"));
        setLoaded(true);
      })
      .catch(() => { toast.error("Couldn't load product"); close(); });
  }, [open, productId]);

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  const specsParsed = useMemo(() => {
    return specs.split("\n").map((line) => {
      const i = line.indexOf(":");
      if (i < 0) return { label: line.trim(), value: "" };
      return { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
    }).filter((s) => s.label);
  }, [specs]);

  function submit() {
    if (!productId) return;
    if (!name.trim()) { toast.error("Product name is required"); return; }
    start(async () => {
      try {
        await updateProduct(productId, {
          name,
          category: category || undefined, type: type || undefined, vendorName: vendorName || undefined,
          description: description || undefined, availability: availability || undefined,
          retailMin: retailMin || undefined, retailMax: retailMax || undefined,
          wholesaleMin: wholesaleMin || undefined, wholesaleMax: wholesaleMax || undefined,
          costPerItem: costPerItem || undefined, stock: stock || undefined, unit: unit || undefined,
          coverUrl: coverUrl || undefined, gallery: gallery.split(",").map((s) => s.trim()).filter(Boolean),
          tags: tags.split(",").map((s) => s.trim()).filter(Boolean), specs: specsParsed,
        });
        toast.success("Product updated");
        router.refresh();
        onCloseRef.current();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save product");
      }
    });
  }

  return (
    <SlideOverDrawer open={open} onClose={onClose} title="Edit Product" subtitle="Update your catalog entry" widthClassName="w-full sm:max-w-[560px]">
      <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className={fieldCls}>
          <label className={labelCls}>Product Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. 12mm High-Tensile Reinforcement Bar" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="Steel, Cement, Finishes" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Type</label>
            <input value={type} onChange={(e) => setType(e.target.value)} className={inputCls} placeholder="Material, Equipment, Service" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Vendor (display)</label>
            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={inputCls} placeholder="Supplier name" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Availability</label>
            <select value={availability} onChange={(e) => setAvailability(e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              <option value="in_stock">In Stock</option>
              <option value="made_to_order">Made to Order</option>
              <option value="rentable">Rentable</option>
            </select>
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls + " resize-y"} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Retail Min (₦)</label>
            <input value={retailMin} onChange={(e) => setRetailMin(e.target.value)} className={inputCls} inputMode="numeric" placeholder="0" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Retail Max (₦)</label>
            <input value={retailMax} onChange={(e) => setRetailMax(e.target.value)} className={inputCls} inputMode="numeric" placeholder="0" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Stock</label>
            <input value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} inputMode="numeric" placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Wholesale Min (₦)</label>
            <input value={wholesaleMin} onChange={(e) => setWholesaleMin(e.target.value)} className={inputCls} inputMode="numeric" placeholder="0" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Wholesale Max (₦)</label>
            <input value={wholesaleMax} onChange={(e) => setWholesaleMax(e.target.value)} className={inputCls} inputMode="numeric" placeholder="0" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Cost / Item (₦)</label>
            <input value={costPerItem} onChange={(e) => setCostPerItem(e.target.value)} className={inputCls} inputMode="numeric" placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Unit</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} placeholder="per tonne, per unit" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Cover Image URL</label>
            <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className={inputCls} placeholder="https://…" />
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Gallery URLs (comma-separated)</label>
          <input value={gallery} onChange={(e) => setGallery(e.target.value)} className={inputCls} placeholder="https://…, https://…" />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="reinforcement, steel, structural" />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Technical Specs (one per line: Label: value)</label>
          <textarea value={specs} onChange={(e) => setSpecs(e.target.value)} rows={3} className={inputCls + " resize-y"} placeholder={"Tensile strength: 550 MPa\nDiameter: 12mm"} />
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-4 mt-5 flex items-center justify-end gap-2 border-t border-[#ececec] bg-white px-5 py-3 dark:border-white/10 dark:bg-[#1e1e1e]">
          <button type="button" onClick={() => onClose()} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={!canSave || !loaded} className={btnPrimary}>Save Changes</button>
        </div>
      </form>
    </SlideOverDrawer>
  );
}
