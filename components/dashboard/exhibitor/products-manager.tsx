"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, LayoutGrid, List, ChevronRight, ChevronLeft, Package, Download, Upload, Trash2, X, Pencil } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { setProductStatus, deleteProduct, createProduct, type MyProduct, type ProductStatus } from "@/lib/services/products";
import { SelectMenu } from "@/components/ui/select-menu";
import { ImportData, type ImportConfig } from "@/components/dashboard/import-data";
import { cn } from "@/lib/utils";
import { DashBanner, BannerContent, bannerBtn } from "@/components/dashboard/dash-banner";
import { Pagination } from "@/components/ui/pagination";
import { r2Url } from "@/lib/r2-public";
import { ProductEditDrawer } from "@/components/dashboard/exhibitor/product-edit-drawer";

const PRODUCT_IMPORT: ImportConfig = {
  title: "Import products",
  subtitle: "Bulk-add your catalog from a spreadsheet.",
  noun: "product",
  columns: ["Name", "SKU", "Category", "Type", "Vendor", "Retail", "Wholesale", "Cost", "Stock", "Unit", "Description", "Tags"],
  sample: ["High-Yield TMT Rebar 16mm", "RBR-16-500", "Rebar & Steel", "Structural", "Titan SteelCo", "18500", "15800", "14200", "4200", "length", "Grade 500B rebar", "Rebar;Structural Steel"],
  requiredKey: "name",
  templateName: "nomarc-products-template.csv",
  importRow: (r) => createProduct({
    name: r.name, sku: r.sku, category: r.category, type: r.type, vendorName: r.vendor,
    description: r.description, retailMin: r.retail, wholesaleMin: r.wholesale, costPerItem: r.cost,
    stock: r.stock, unit: r.unit, tags: r.tags ? r.tags.split(/[;|]/).map((t) => t.trim()).filter(Boolean) : undefined,
    status: "active",
  }),
};

const TABS: { key: ProductStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
];

const STATUS_PILL: Record<ProductStatus, string> = {
  active: "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]",
  draft: "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60",
  archived: "bg-[#fde8e8] text-[#c0392b] dark:bg-[#ef4444]/15 dark:text-[#f87171]",
};

const COL_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};
const PER_PAGE_OPTS = ["12", "24", "48", "96"];

function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(); }}
      className={cn("w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center flex-shrink-0 transition-colors", checked ? "bg-[#ffd716] border-[#ffd716] text-[#1e1e1e]" : "bg-white/90 dark:bg-black/40 border-[#d4d4d4] dark:border-white/30 hover:border-[#ffd716]")}>
      {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );
}

function StockBar({ level, stock, unit }: { level: MyProduct["stockLevel"]; stock: number; unit: string | null }) {
  unit = unit || "unit";
  if (level === "out") return <span className="text-[12px] font-semibold text-[#e5484d]">Out of stock</span>;
  const pct = level === "high" ? "85%" : "28%";
  const color = level === "high" ? "bg-[#16a34a]" : "bg-[#ea580c]";
  return (
    <div className="min-w-[110px]">
      <p className="text-[12px] text-[#6b6b6b] dark:text-white/60 mb-1">{stock.toLocaleString()} {unit}s · <span className="capitalize">{level}</span></p>
      <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden"><div className={cn("h-full rounded-full", color)} style={{ width: pct }} /></div>
    </div>
  );
}

function priceRange(min: number | null, max?: number | null) {
  if (min == null) return "—";
  return max && max !== min ? `${naira(min)} – ${naira(max)}` : naira(min);
}

function ProductCardGrid({ p, selected, onToggle, onEdit }: { p: MyProduct; selected: boolean; onToggle: () => void; onEdit?: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = p.images.length > 0 ? p.images : [];
  const hasMultiple = imgs.length > 1;

  return (
    <div className={cn("group flex flex-col rounded-2xl border bg-white dark:bg-[#1e1e1e] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all", selected ? "border-[#ffd716] ring-1 ring-[#ffd716]" : "border-[#ececec] dark:border-white/10 hover:border-[#ffd716]/60")}>
      {/* Image area */}
      <div className="relative aspect-square bg-[#f8f8f8] dark:bg-white/5 overflow-hidden">
        <Link href={`/dashboard/my-products/${p.id}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {imgs[imgIdx] ? <img src={imgs[imgIdx]} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-[#d4d4d4] dark:text-white/20"><Package size={36} /></div>}
        </Link>
        {/* Status badge */}
        <span className="absolute top-3 left-10"><span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize shadow-sm", STATUS_PILL[p.status])}>{p.status}</span></span>
        {/* Checkbox */}
        <span className="absolute top-3 left-3"><Check checked={selected} onChange={onToggle} /></span>
        {/* Edit */}
        {onEdit && (
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }} title="Edit product"
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-black/50 text-[#6b6b6b] dark:text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-[#ffd716] hover:text-[#1e1e1e]">
            <Pencil size={14} />
          </button>
        )}
        {/* Image nav */}
        {hasMultiple && (
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 py-2.5">
            <button onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i - 1 + imgs.length) % imgs.length); }} className="w-6 h-6 rounded-full bg-white/80 dark:bg-black/50 flex items-center justify-center text-[#1e1e1e] dark:text-white text-[11px] hover:bg-white dark:hover:bg-black/70 transition-colors backdrop-blur-sm">←</button>
            <span className="text-[10px] font-semibold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">{imgIdx + 1} of {imgs.length}</span>
            <button onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i + 1) % imgs.length); }} className="w-6 h-6 rounded-full bg-white/80 dark:bg-black/50 flex items-center justify-center text-[#1e1e1e] dark:text-white text-[11px] hover:bg-white dark:hover:bg-black/70 transition-colors backdrop-blur-sm">→</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/dashboard/my-products/${p.id}`}>
          <h3 className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white leading-snug line-clamp-2 group-hover:text-[#caa400] dark:group-hover:text-[#ffd716] transition-colors">{p.name}</h3>
        </Link>
        <p className="text-[11px] text-[#b0b0b0] dark:text-white/40 mt-1">SKU {p.sku ?? "—"}</p>

        {/* Price */}
        <div className="mt-3 space-y-1">
          <p className="text-[18px] font-black text-[#1e1e1e] dark:text-white leading-none tracking-tight">{priceRange(p.retailMin, p.retailMax)}</p>
          {(p.wholesaleMin ?? 0) > 0 && (
            <p className="text-[11.5px] text-[#9a9a9a]">Wholesale: {priceRange(p.wholesaleMin, p.wholesaleMax)}</p>
          )}
        </div>

        {/* Stock + variants */}
        <div className="mt-3 pt-3 border-t border-[#f0f0f0] dark:border-white/[0.06] flex items-center justify-between gap-2 mt-auto">
          <StockBar level={p.stockLevel} stock={p.stock} unit={p.unit} />
          {p.variants.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {p.variants.slice(0, 3).map((v, i) => (
                <span key={i} className="w-5 h-5 rounded-full border-2 border-white dark:border-[#1e1e1e] bg-[#ffd716]" style={{ marginLeft: i > 0 ? -6 : 0 }} />
              ))}
              {p.variants.length > 3 && <span className="text-[10px] font-bold text-[#9a9a9a] ml-0.5">+{p.variants.length - 3}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductRow({ p, selected, onToggle, onEdit }: { p: MyProduct; selected: boolean; onToggle: () => void; onEdit?: () => void }) {
  return (
    <div className={cn("group flex items-center gap-3 px-4 py-3 transition-colors", selected ? "bg-[#fffdf2] dark:bg-[#ffd716]/[0.05]" : "hover:bg-[#fafafa] dark:hover:bg-white/[0.02]")}>
      <Check checked={selected} onChange={onToggle} />
      <Link href={`/dashboard/my-products/${p.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-lg bg-[#f5f5f5] dark:bg-white/5 overflow-hidden flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.images[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#c9c9c9]"><Package size={18} /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate group-hover:text-[#caa400] transition-colors">{p.name}</p>
          <p className="text-[12px] text-[#9a9a9a]">SKU {p.sku ?? "—"} · {p.category}</p>
        </div>
        <div className="hidden md:block w-40"><StockBar level={p.stockLevel} stock={p.stock} unit={p.unit} /></div>
        <div className="hidden sm:block text-right w-32"><p className="text-[11px] text-[#9a9a9a]">Retail</p><p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{priceRange(p.retailMin, p.retailMax)}</p></div>
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0", STATUS_PILL[p.status])}>{p.status}</span>
        <ChevronRight size={16} className="text-[#c9c9c9] flex-shrink-0" />
      </Link>
      {onEdit && (
        <button type="button" onClick={onEdit} title="Edit product" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f0f0f0] hover:text-[#1e1e1e] dark:hover:bg-white/10 dark:hover:text-white transition-colors flex-shrink-0"><Pencil size={15} /></button>
      )}
    </div>
  );
}

// export helpers
const COLS = ["Name", "SKU", "Category", "Status", "Retail", "Wholesale", "Stock", "Unit"];
const rowOf = (p: MyProduct) => [p.name, p.sku ?? "", p.category ?? "", p.status, p.retailMin ?? "", p.wholesaleMin ?? "", p.stock, p.unit ?? ""];
function dl(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function toCsv(rows: MyProduct[]) {
  const esc = (c: unknown) => `"${String(c).replace(/"/g, '""')}"`;
  return [COLS, ...rows.map(rowOf)].map((r) => r.map(esc).join(",")).join("\n");
}
function toXls(rows: MyProduct[]) {
  const esc = (c: unknown) => String(c).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = [COLS, ...rows.map(rowOf)].map((r, i) => `<tr>${r.map((c) => `<t${i === 0 ? "h" : "d"}>${esc(c)}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join("");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`;
}

export function ProductsManager({ products }: { products: MyProduct[] }) {
  const router = useRouter();
  const [list, setList] = useState(products);
  const [tab, setTab] = useState<ProductStatus | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [cols, setCols] = useState(4);
  const [q, setQ] = useState("");
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const p of list) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [list]);

  const filtered = useMemo(() => list.filter((p) => (tab === "all" || p.status === tab) && (q === "" || `${p.name} ${p.sku ?? ""} ${p.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))), [list, tab, q]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const items = filtered.slice(safePage * perPage, safePage * perPage + perPage);

  const selectedRows = useMemo(() => list.filter((p) => sel.has(p.id)), [list, sel]);
  const allOnPage = items.length > 0 && items.every((p) => sel.has(p.id));
  const toggleOne = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllOnPage = () => setSel((s) => { const n = new Set(s); if (allOnPage) items.forEach((p) => n.delete(p.id)); else items.forEach((p) => n.add(p.id)); return n; });
  const clearSel = () => setSel(new Set());

  function bulkStatus(status: ProductStatus) {
    const ids = [...sel]; const prev = list;
    setList((l) => l.map((p) => (sel.has(p.id) ? { ...p, status } : p)));
    toast.success(`${ids.length} product${ids.length > 1 ? "s" : ""} → ${status}`);
    Promise.all(ids.map((id) => setProductStatus(id, status))).then(() => router.refresh()).catch(() => { setList(prev); toast.error("Some updates failed"); });
    clearSel();
  }
  function bulkDelete() {
    const ids = [...sel]; const prev = list;
    setList((l) => l.filter((p) => !sel.has(p.id)));
    toast.success(`${ids.length} product${ids.length > 1 ? "s" : ""} deleted`);
    Promise.all(ids.map((id) => deleteProduct(id))).then(() => router.refresh()).catch(() => { setList(prev); toast.error("Some deletions failed"); });
    clearSel();
  }
  function exportRows(rows: MyProduct[], fmt: "csv" | "xls") {
    const date = new Date().toISOString().slice(0, 10);
    if (fmt === "csv") dl(`nomarc-products-${date}.csv`, "text/csv", toCsv(rows));
    else dl(`nomarc-products-${date}.xls`, "application/vnd.ms-excel", toXls(rows));
    toast.success(`${rows.length} exported`);
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Catalog"
          title="Products"
          subtitle="Manage your catalog, pricing, stock and variants."
          actions={
            <>
              <button onClick={() => setImporting(true)} className={bannerBtn}><Upload size={14} /> Import</button>
              <button onClick={() => exportRows(filtered, "csv")} className={bannerBtn}><Download size={14} /> CSV</button>
              <button onClick={() => exportRows(filtered, "xls")} className={cn(bannerBtn, "hidden sm:inline-flex")}><Download size={14} /> Excel</button>
              <Link href="/dashboard/add-product" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-white shadow-sm hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors active:scale-[0.97]"><Plus size={16} /> Add Product</Link>
            </>
          }
        />
      </DashBanner>

      {/* tabs */}
      <div className="mt-5 flex items-center gap-1 border-b border-[#ececec] dark:border-white/10 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(0); }} className={cn("relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors", tab === t.key ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>
            {t.label} <span className="text-[11px] text-[#b3b3b3]">{counts[t.key] ?? 0}</span>
            {tab === t.key && <motion.span layoutId="prodtab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#ffd716]" />}
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[340px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search products…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
        </div>
        <div className="flex items-center gap-2">
          {/* grid density (grid view only) */}
          {view === "grid" && (
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-[#e3e3e3] dark:border-white/15 p-0.5">
              {[2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setCols(n)} title={`${n} columns`} className={cn("w-7 h-7 rounded-md text-[12px] font-semibold transition-colors", cols === n ? "bg-[#fff7cc] dark:bg-white/10 text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>{n}</button>
              ))}
            </div>
          )}
          {/* view toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-[#e3e3e3] dark:border-white/15 p-0.5">
            {([["grid", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} className={cn("p-1.5 rounded-md transition-colors", view === v ? "bg-[#fff7cc] dark:bg-white/10 text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}><Icon size={16} /></button>
            ))}
          </div>
        </div>
      </div>

      {/* bulk bar */}
      {sel.size > 0 && (
        <div className="mt-4 flex items-center gap-3 flex-wrap rounded-xl border border-[#ffd716]/50 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] px-4 py-2.5">
          <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{sel.size} selected</span>
          <button onClick={clearSel} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={15} /></button>
          <div className="h-4 w-px bg-[#e3e3e3] dark:bg-white/15" />
          <button onClick={toggleAllOnPage} className="text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white">{allOnPage ? "Deselect page" : "Select page"}</button>
          <div className="w-[130px]"><SelectMenu value="Set status…" options={["Active", "Draft", "Archived"]} onChange={(l) => bulkStatus(l.toLowerCase() as ProductStatus)} /></div>
          <button onClick={() => exportRows(selectedRows, "csv")} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white"><Download size={14} /> Export</button>
          <button onClick={bulkDelete} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#e5484d] hover:text-[#d33a3f]"><Trash2 size={14} /> Delete</button>
        </div>
      )}

      {/* content */}
      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"><Package size={22} /></div>
          <p className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">No products found</p>
          <p className="mt-1 text-[13px] text-[#9a9a9a]">Try a different search or add a new product.</p>
        </div>
      ) : view === "grid" ? (
        <motion.div layout className={cn("mt-4 grid gap-4", COL_CLASS[cols])}>
          <AnimatePresence mode="popLayout">
            {items.map((p) => <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><ProductCardGrid p={p} selected={sel.has(p.id)} onToggle={() => toggleOne(p.id)} onEdit={() => setEditId(p.id)} /></motion.div>)}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] divide-y divide-[#f5f5f5] dark:divide-white/5 overflow-hidden">
          {items.map((p) => <ProductRow key={p.id} p={p} selected={sel.has(p.id)} onToggle={() => toggleOne(p.id)} onEdit={() => setEditId(p.id)} />)}
        </div>
      )}

      {/* footer: per-page + pagination */}
      {filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-[13px] text-[#9a9a9a]">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Per page</span>
            <div className="w-[74px]"><SelectMenu value={String(perPage)} options={PER_PAGE_OPTS} onChange={(v) => { setPerPage(Number(v)); setPage(0); }} /></div>
            <span className="hidden sm:inline">· {filtered.length} total</span>
          </div>
          <div className="flex items-center gap-1">
            <Pagination page={safePage + 1} pageCount={pageCount} onPageChange={(p) => setPage(p - 1)} />
          </div>
        </div>
      )}

      <AnimatePresence>{importing && <ImportData config={PRODUCT_IMPORT} onClose={() => setImporting(false)} onDone={() => router.refresh()} />}</AnimatePresence>
      <ProductEditDrawer open={!!editId} onClose={() => setEditId(null)} productId={editId} />
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function ProductsManagerSkeleton() {
  const S = ({ cls = "" }: { cls?: string }) => <div className={`skeleton rounded-md ${cls}`} />;
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      {/* banner skeleton */}
      <div className="skeleton rounded-2xl h-[110px] sm:h-[120px] w-full" />
      <div className="mt-5 flex items-center gap-1 border-b border-[#ececec] dark:border-white/10">
        {[80, 64, 72, 88, 72].map((w, i) => <div key={i} className="skeleton rounded-md h-4 px-3.5 py-2.5" style={{ width: w }} />)}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <S cls="h-9 flex-1 min-w-[200px] max-w-[340px] rounded-lg" />
        <div className="flex gap-2"><S cls="h-8 w-20 rounded-lg" /><S cls="h-8 w-16 rounded-lg" /></div>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3 space-y-3">
            <S cls="aspect-square w-full rounded-xl" />
            <S cls="h-4 w-3/4" /><S cls="h-3 w-1/2" />
            <div className="flex items-center justify-between"><S cls="h-4 w-16" /><S cls="h-8 w-16 rounded-lg" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
