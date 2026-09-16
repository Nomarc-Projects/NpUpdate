"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Eye, Lock, Unlock, Trash2, Plus, Pencil } from "lucide-react";
import { DataTable, KebabMenu, StatusBadge, SlideOverDrawer, type DataTableColumn, type BadgeTone } from "@/components/dashboard/kit";
import { FiltersRail, type FilterGroup } from "@/components/admin/filters-rail";
import { AdminProductFormDrawer } from "@/components/admin/admin-product-form";
import { suspendAdminProduct, restoreAdminProduct, deleteAdminProduct, getAdminProductDetail, getAdminProductForEdit, type AdminProduct, type AdminProductDetail, type AdminProductForEdit } from "@/lib/services/admin";

const STATUS_TONE: Record<string, BadgeTone> = { active: "green", suspended: "amber", draft: "grey" };

export function ExhibitionHubModeration({ rows }: { rows: AdminProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState("");
  const [industry, setIndustry] = useState("");
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProductForEdit | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    getAdminProductDetail(selected.id).then(setDetail).catch(() => setDetail(null));
  }, [selected]);

  const industryOptions = useMemo(() => Array.from(new Set(rows.map((p) => p.companyIndustry).filter((x): x is string => !!x))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter((p) => {
    if (query && !`${p.name} ${p.vendor} ${p.vendorCompany ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (stock === "in" && p.stock <= 0) return false;
    if (stock === "out" && p.stock > 0) return false;
    if (industry && p.companyIndustry !== industry) return false;
    return true;
  }), [rows, query, stock, industry]);

  function suspend(p: { id: string }) { start(() => suspendAdminProduct(p.id).then(() => { toast.success("Product suspended"); router.refresh(); }).catch(() => { toast.error("Couldn't suspend"); })); }
  function restore(p: { id: string }) { start(() => restoreAdminProduct(p.id).then(() => { toast.success("Product restored"); router.refresh(); }).catch(() => { toast.error("Couldn't restore"); })); }
  function del(p: { id: string; name: string }) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    start(() => deleteAdminProduct(p.id).then(() => { toast.success("Product deleted"); setSelected(null); router.refresh(); }).catch(() => { toast.error("Couldn't delete"); }));
  }

  function edit(p: AdminProduct) {
    start(() => getAdminProductForEdit(p.id).then((d) => { if (d) { setEditing(d); setFormOpen(true); } else { toast.error("Product not found"); } }).catch(() => { toast.error("Couldn't load product"); }));
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  const columns: DataTableColumn<AdminProduct>[] = [
    { key: "product", label: "Product", render: (p) => (<div><p className="font-semibold text-[#1e1e1e] dark:text-white">{p.name}</p><p className="text-[11.5px] text-[#9a9a9a]">{p.category ?? "—"}</p></div>) },
    { key: "vendor", label: "Exhibitor", render: (p) => (<div><p className="text-[#1e1e1e] dark:text-white">{p.vendorCompany ?? p.vendor}</p><p className="text-[11.5px] text-[#9a9a9a]">{p.vendor}</p></div>) },
    { key: "date", label: "Date Added", render: (p) => <span className="text-[#9a9a9a]">{p.date}</span> },
    {
      key: "pricing", label: "Pricing & Stock",
      render: (p) => (
        <div className="text-[12.5px]">
          <p className="font-semibold text-[#1e1e1e] dark:text-white">{p.retailMin ? `₦${p.retailMin.toLocaleString()}` : "Custom Quote"}</p>
          <p className="text-[#9a9a9a]">{p.stock > 0 ? "In Stock" : "Out of Stock"}</p>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (p) => <StatusBadge tone={STATUS_TONE[p.status] ?? "grey"}>{p.status === "draft" ? "In Drafts" : p.status[0].toUpperCase() + p.status.slice(1)}</StatusBadge> },
  ];

  const filterGroups: FilterGroup[] = [
    { key: "stock", label: "Status", value: stock, onChange: setStock, options: [{ value: "", label: "All" }, { value: "in", label: "In Stock" }, { value: "out", label: "Out of Stock" }] },
    { key: "industry", label: "Primary Industry", value: industry, onChange: setIndustry, options: [{ value: "", label: "All" }, ...industryOptions.map((i) => ({ value: i, label: i }))] },
  ];

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <FiltersRail groups={filterGroups} />

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative max-w-[420px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by product, exhibitor, or industry…" className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#333] dark:bg-white dark:text-[#1e1e1e] dark:hover:bg-[#e5e5e5]"><Plus size={15} /> Create Product</button>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.id}
          onRowClick={setSelected}
          rowHoverActions={(p) => (
            <KebabMenu items={[
              { icon: Eye, label: "View Product Details", onClick: () => setSelected(p) },
              { icon: Pencil, label: "Edit Product", onClick: () => edit(p) },
              { icon: Lock, label: "Suspend Product", onClick: () => suspend(p), hidden: p.status === "suspended" },
              { icon: Unlock, label: "Restore Product", onClick: () => restore(p), hidden: p.status !== "suspended" },
              { icon: Trash2, label: "Delete Product", danger: true, onClick: () => del(p) },
            ]} />
          )}
        />
      </div>

      <SlideOverDrawer open={!!selected} onClose={() => setSelected(null)} title="Overview" subtitle={undefined}>
        {selected && (
          <div>
            <div>
              <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{selected.name}</h3>
              <p className="text-[12.5px] text-[#9a9a9a]">{selected.vendorCompany ?? selected.vendor}{detail?.vendorLocation ? ` · ${detail.vendorLocation}` : ""}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {(detail ? [detail.type, detail.materialGrade] : []).filter(Boolean).map((t) => (
                <span key={t} className="rounded-md border border-[#ececec] px-2 py-1 text-[11.5px] text-[#6b6b6b] dark:border-white/10 dark:text-white/60">{t}</span>
              ))}
              <span className="rounded-md border border-[#ececec] px-2 py-1 text-[11.5px] text-[#6b6b6b] dark:border-white/10 dark:text-white/60">{selected.date}</span>
              <StatusBadge tone={STATUS_TONE[selected.status] ?? "grey"}>{selected.status === "draft" ? "In Drafts" : selected.status}</StatusBadge>
              <span className="ml-auto flex items-center gap-2">
                {selected.status === "suspended" ? (
                  <button onClick={() => restore(selected)} className="rounded-lg bg-[#1a7f43] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#166636]">Restore Product</button>
                ) : (
                  <button onClick={() => suspend(selected)} className="rounded-lg bg-[#ffd716] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">Suspend Product</button>
                )}
                <KebabMenu items={[{ icon: Trash2, label: "Delete Product", danger: true, onClick: () => del(selected) }]} />
              </span>
            </div>

            <p className="mt-3 text-[13px] text-[#6b6b6b] dark:text-white/60">{selected.category ?? "Uncategorized"} · {selected.retailMin ? `₦${selected.retailMin.toLocaleString()}` : "Custom Quote"} · {selected.stock} in stock</p>

            {!detail && <div className="mt-6 h-20 animate-pulse rounded-xl bg-[#f4f4f4] dark:bg-white/5" />}

            {detail?.description && (
              <section className="mt-5">
                <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Product Description</h4>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-[#6b6b6b] dark:text-white/60">{detail.description}</p>
              </section>
            )}

            {!!detail?.specs.length && (
              <section className="mt-4">
                <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Technical Specs &amp; Features</h4>
                <ul className="mt-1.5 space-y-1 text-[13px] text-[#6b6b6b] dark:text-white/60">
                  {detail.specs.map((s, i) => <li key={i} className="flex gap-2"><span className="text-[#9a9a9a]">•</span><span><span className="font-medium text-[#1e1e1e] dark:text-white">{s.label}:</span> {s.value}</span></li>)}
                </ul>
              </section>
            )}

            {!!detail?.gallery.length && (
              <section className="mt-4">
                <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Product Gallery</h4>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {detail.gallery.map((g, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={g} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </SlideOverDrawer>

      <AdminProductFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
      />
    </div>
  );
}
