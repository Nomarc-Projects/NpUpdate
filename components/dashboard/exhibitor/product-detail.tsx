"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, ImagePlus, Trash2, X, TrendingUp, BarChart3, Copy, Share2, Package, ChevronRight,
} from "lucide-react";
import { naira, type CatalogProduct, type Variant } from "@/lib/sample-catalog";
import { cn } from "@/lib/utils";

const fieldClass = "w-full px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#161616] text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]";

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── tiny sparkline ──
function Sparkline({ up = true }: { up?: boolean }) {
  const pts = up ? "0,28 12,22 24,25 36,16 48,18 60,10 72,12 84,4" : "0,8 12,14 24,10 36,18 48,15 60,22 72,20 84,28";
  return (
    <svg viewBox="0 0 84 32" className="w-full h-12" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#ffd716" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Add Variants modal ──
function VariantsModal({ product, onClose }: { product: CatalogProduct; onClose: () => void }) {
  const [type, setType] = useState("Size");
  const [rows, setRows] = useState<Variant[]>(product.variants.length ? product.variants : [{ id: "n1", name: "", price: 0, stock: 0, sku: "", status: true }]);
  const addRow = () => setRows((r) => [...r, { id: `n${r.length + 1}`, name: "", price: 0, stock: 0, sku: "", status: true }]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative w-full sm:max-w-[640px] max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
          <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">Add Product Variants</h3>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 sm:px-6 py-5 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#9a9a9a] mb-1">Product</p>
            <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{product.name}</p>
            <p className="text-[12.5px] text-[#9a9a9a] line-clamp-2">{product.description}</p>
          </div>
          <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-4">
            <div className="flex items-center justify-between mb-3"><span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Variant 1</span><button className="text-[#b3b3b3] hover:text-[#e5484d]"><Trash2 size={15} /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block"><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">Variant type</span>
                <select value={type} onChange={(e) => setType(e.target.value)} className={cn(fieldClass, "mt-1")}>{["Size", "Colour", "Grade", "Dimension"].map((o) => <option key={o}>{o}</option>)}</select>
              </label>
              <label className="block"><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">Variant values</span>
                <input className={cn(fieldClass, "mt-1")} placeholder="e.g. 10mm, 12mm, 16mm" />
              </label>
            </div>
          </div>
          {/* variant table */}
          <div>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-2">Variant table</p>
            <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-x-auto">
              <table className="w-full text-left text-[13px] min-w-[440px]">
                <thead><tr className="bg-[#fafafa] dark:bg-white/[0.02] text-[11px] uppercase tracking-wide text-[#9a9a9a]">
                  {["Value", "Price", "Stock", "SKU", ""].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-t border-[#f0f0f0] dark:border-white/10">
                      <td className="px-3 py-2"><input defaultValue={r.name} className={fieldClass} placeholder="Value" /></td>
                      <td className="px-3 py-2"><input defaultValue={r.price || ""} className={cn(fieldClass, "w-24")} placeholder="₦" /></td>
                      <td className="px-3 py-2"><input defaultValue={r.stock || ""} className={cn(fieldClass, "w-20")} placeholder="0" /></td>
                      <td className="px-3 py-2"><input defaultValue={r.sku} className={cn(fieldClass, "w-28")} placeholder="SKU" /></td>
                      <td className="px-3 py-2 text-right"><button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="text-[#b3b3b3] hover:text-[#e5484d]"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#caa400] hover:underline"><Plus size={14} /> Add variant</button>
          </div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-[#f0f0f0] dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white">Cancel</button>
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">Save variants</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Performance slide-over ──
function PerformancePanel({ product, onClose }: { product: CatalogProduct; onClose: () => void }) {
  const stats = [
    { label: "Total sales", now: product.ordersCount, prev: Math.round(product.ordersCount * 0.88), pct: "+13.4%", up: true },
    { label: "Total revenue", now: product.totalSales, prev: Math.round(product.totalSales * 0.98), pct: "+1.5%", up: true, money: true },
  ];
  return (
    <div className="fixed inset-0 z-[120]">
      <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="absolute right-0 top-0 h-full w-full max-w-[560px] bg-white dark:bg-[#1a1a1a] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
          <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">Performance details</h3>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 sm:px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#f5f5f5] dark:bg-white/5 overflow-hidden">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={product.images[0]} alt="" className="w-full h-full object-cover" /></div>
            <div><p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{product.name}</p><p className="text-[12px] text-[#9a9a9a]">SKU {product.sku} · Updated {product.updatedAt}</p></div>
          </div>
          <div className="rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 px-4 py-3 flex items-start gap-3">
            <TrendingUp size={18} className="text-[#caa400] mt-0.5 flex-shrink-0" />
            <div><p className="text-[12px] font-bold text-[#1e1e1e] dark:text-white">Recommended by Nomarc AI</p><p className="text-[12.5px] text-[#6b6b6b] dark:text-white/70">Demand is strong this month — consider raising your wholesale tier or adding stock to avoid st-outs.</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            {["2wk", "1mo", "2mo", "3mo"].map((r, i) => <button key={r} className={cn("px-2.5 py-1 rounded-md text-[12px] font-medium", i === 0 ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>{r}</button>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-[#ececec] dark:border-white/10 p-4">
                <div className="flex items-center gap-2 text-[12px] text-[#6b6b6b] dark:text-white/60"><BarChart3 size={14} /> {s.label}</div>
                <div className="mt-1 flex items-end gap-2"><span className="text-xl font-bold text-[#1e1e1e] dark:text-white">{s.money ? naira(s.now) : s.now.toLocaleString()}</span><span className="text-[11px] font-semibold text-[#16a34a] mb-1">{s.pct}</span></div>
                <Sparkline up={s.up} />
                <p className="text-[11px] text-[#9a9a9a]">vs last month {s.money ? naira(s.prev) : s.prev.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-4">
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-3">Product sale comparison</p>
            <div className="space-y-2.5">
              {[["This product", 100], ["Cement 42.5R", 72], ["Sandcrete Block 9\"", 54], ["Porcelain Tile", 31]].map(([n, w]) => (
                <div key={n as string}>
                  <div className="flex items-center justify-between text-[12px] text-[#6b6b6b] dark:text-white/60 mb-1"><span className="truncate">{n}</span></div>
                  <div className="h-2 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#ffd716]" style={{ width: `${w}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

export function ProductDetail({ product }: { product: CatalogProduct }) {
  const [showVariants, setShowVariants] = useState(false);
  const [showPerf, setShowPerf] = useState(false);
  const [active, setActive] = useState(0);

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/my-products" className="w-9 h-9 rounded-full border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors flex-shrink-0"><ArrowLeft size={16} /></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[#1e1e1e] dark:text-white">{product.name}</h1>
              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", product.status === "active" ? "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]" : "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60")}>{product.status}</span>
            </div>
            <p className="text-[12.5px] text-[#9a9a9a] mt-0.5">SKU {product.sku} · Created {product.createdAt} · Last updated {product.updatedAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:border-[#ffd716] transition-colors"><Copy size={14} /> Duplicate</button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:border-[#ffd716] transition-colors"><Share2 size={14} /> Share</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* main column */}
        <div className="space-y-5 min-w-0">
          {/* gallery */}
          <Section title="Media">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {product.images.map((src, i) => (
                <button key={i} onClick={() => setActive(i)} className={cn("aspect-square rounded-xl overflow-hidden border-2 transition-colors", active === i ? "border-[#ffd716]" : "border-transparent hover:border-[#e3e3e3] dark:hover:border-white/15")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              <button className="aspect-square rounded-xl border-2 border-dashed border-[#e3e3e3] dark:border-white/15 flex flex-col items-center justify-center gap-1 text-[#9a9a9a] hover:border-[#ffd716] hover:text-[#caa400] transition-colors">
                <ImagePlus size={20} /><span className="text-[11px] font-medium">Add image</span>
              </button>
            </div>
          </Section>

          {/* description */}
          <Section title="Description">
            <textarea defaultValue={product.description} rows={5} className={fieldClass} />
          </Section>

          {/* pricing */}
          <Section title="Pricing">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block"><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">Retail price</span><input defaultValue={product.retailMin} className={cn(fieldClass, "mt-1")} /></label>
              <label className="block"><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">Wholesale price</span><input defaultValue={product.wholesaleMin} className={cn(fieldClass, "mt-1")} /></label>
              <label className="block"><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">Cost per item</span><input defaultValue={product.costPerItem} className={cn(fieldClass, "mt-1")} /></label>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-4">
              <div><p className="text-[11px] text-[#9a9a9a]">Sales price</p><p className="text-sm font-bold text-[#1e1e1e] dark:text-white">{naira(product.retailMin)}</p></div>
              <div><p className="text-[11px] text-[#9a9a9a]">Profit</p><p className="text-sm font-bold text-[#16a34a]">{naira(product.retailMin - product.costPerItem)}</p></div>
              <div><p className="text-[11px] text-[#9a9a9a]">Margin</p><p className="text-sm font-bold text-[#1e1e1e] dark:text-white">{Math.round(((product.retailMin - product.costPerItem) / product.retailMin) * 100)}%</p></div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60"><input type="checkbox" className="accent-[#ffd716]" /> Charge tax (VAT 7.5%) on this product</label>
          </Section>

          {/* stock */}
          <Section title="Stock & inventory">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block"><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">On-hand stock</span><input defaultValue={product.stock} className={cn(fieldClass, "mt-1")} /></label>
              <label className="block"><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">Unit</span><input defaultValue={product.unit} className={cn(fieldClass, "mt-1")} /></label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60"><input type="checkbox" defaultChecked className="accent-[#ffd716]" /> Continue accepting orders when out of stock</label>
          </Section>

          {/* variants */}
          <Section title="Variants" action={<button onClick={() => setShowVariants(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Plus size={14} /> {product.variants.length ? "Edit variants" : "Add variant"}</button>}>
            {product.variants.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-11 h-11 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"><Package size={20} /></div>
                <p className="mt-2 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">No variants yet</p>
                <p className="text-[12.5px] text-[#9a9a9a]">Add sizes, grades or colours for this product.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-x-auto">
                <table className="w-full text-left text-[13px] min-w-[420px]">
                  <thead><tr className="bg-[#fafafa] dark:bg-white/[0.02] text-[11px] uppercase tracking-wide text-[#9a9a9a]">
                    {["Variant", "Price", "Stock", "SKU", "Status"].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {product.variants.map((v) => (
                      <tr key={v.id} className="border-t border-[#f0f0f0] dark:border-white/10">
                        <td className="px-4 py-3 font-medium text-[#1e1e1e] dark:text-white">{v.name}{v.spec && <span className="text-[#9a9a9a] font-normal"> · {v.spec}</span>}</td>
                        <td className="px-4 py-3 text-[#1e1e1e] dark:text-white">{naira(v.price)}</td>
                        <td className="px-4 py-3 text-[#6b6b6b] dark:text-white/60">{v.stock.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[#9a9a9a]">{v.sku}</td>
                        <td className="px-4 py-3"><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", v.status ? "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]" : "bg-[#f0f0f0] text-[#9a9a9a] dark:bg-white/10")}>{v.status ? "Active" : "Hidden"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* sidebar */}
        <div className="space-y-5">
          {/* total sales */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1.5"><TrendingUp size={15} className="text-[#caa400]" /> Total sales</span>
              <button onClick={() => setShowPerf(true)} className="text-[12px] font-medium text-[#caa400] hover:underline">View detail</button>
            </div>
            <div className="mt-2 flex items-end gap-2"><span className="text-2xl font-bold text-[#1e1e1e] dark:text-white">{naira(product.totalSales)}</span><span className="text-[11px] font-semibold text-[#16a34a] mb-1.5">+1.34%</span></div>
            <Sparkline />
            <p className="text-[11px] text-[#9a9a9a]">{product.ordersCount} orders · vs last month</p>
          </div>

          {/* organization */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-3">
            <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Product organization</p>
            {[["SKU", product.sku], ["Category", product.category], ["Type", product.type], ["Vendor", product.vendor]].map(([l, v]) => (
              <label key={l} className="block"><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">{l}</span><input defaultValue={v} className={cn(fieldClass, "mt-1")} /></label>
            ))}
            <div><span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">Tags</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {product.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md bg-[#1e1e1e] text-white dark:bg-white/10">{t} <X size={11} className="cursor-pointer opacity-60 hover:opacity-100" /></span>)}
                <button className="text-[12px] px-2 py-1 rounded-md border border-dashed border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:border-[#ffd716] hover:text-[#caa400]"><Plus size={11} className="inline" /> Add</button>
              </div>
            </div>
          </div>

          <button className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">Save changes</button>
          <Link href="/dashboard/orders" className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">View orders <ChevronRight size={15} /></Link>
        </div>
      </div>

      <AnimatePresence>{showVariants && <VariantsModal product={product} onClose={() => setShowVariants(false)} />}</AnimatePresence>
      <AnimatePresence>{showPerf && <PerformancePanel product={product} onClose={() => setShowPerf(false)} />}</AnimatePresence>
    </div>
  );
}
