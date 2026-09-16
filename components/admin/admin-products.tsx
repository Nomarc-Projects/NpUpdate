"use client";

import { useState, useMemo } from "react";
import { Package, Search, Download } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { type AdminProduct } from "@/lib/services/admin";
import { cn } from "@/lib/utils";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

const STATUS_CLS: Record<string, string> = {
  active: "bg-[#dcfce7] text-[#16a34a] dark:bg-[#16a34a]/15",
  draft: "bg-[#fef3c7] text-[#f59e0b] dark:bg-[#f59e0b]/15",
  archived: "bg-[#f3f4f6] text-[#6b7280] dark:bg-white/10",
};

export function AdminProductsView({ products }: { products: AdminProduct[] }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => products.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search) return `${p.name} ${p.vendor} ${p.category ?? ""}`.toLowerCase().includes(search.toLowerCase());
    return true;
  }), [products, filter, search]);

  function exportCsv() {
    const esc = (c: string) => `"${String(c).replace(/"/g, '""')}"`;
    const head = ["Name", "Vendor", "Category", "Price", "Stock", "Status", "Listed"];
    const rows = filtered.map((p) => [p.name, p.vendorCompany ?? p.vendor, p.category ?? "", p.retailMin ?? 0, p.stock, p.status, p.date]);
    const csv = [head, ...rows].map((r) => r.map((v) => esc(String(v))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "admin-products.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1180px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Products"
          title="Product Moderation"
          subtitle="Review, approve, and moderate exhibitor listings."
        />
      </DashBanner>

      <div className="flex items-end justify-between gap-4 mt-5 mb-5 flex-wrap">
        <p className="text-[13px] text-[#9a9a9a]">{products.length} total · {products.filter((p) => p.status === "active").length} active</p>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:bg-[#ffd716]/5 transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, vendor, category…"
            className="w-full sm:max-w-[360px] pl-9 pr-3 py-2 rounded-lg border border-[#e8e8e8] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[12.5px] text-[#1e1e1e] dark:text-white placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#ffd716] transition-colors" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", "active", "draft", "archived"].map((key) => {
            const count = key === "all" ? products.length : products.filter((p) => p.status === key).length;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className={cn("px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all capitalize",
                  filter === key ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]" : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"
                )}>{key === "all" ? "All" : key} {count}</button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_120px_80px_70px_90px] gap-2 px-5 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/[0.06]">
          {["Product", "Vendor", "Category", "Price", "Stock", "Status"].map((h) => (
            <span key={h} className="text-[10.5px] font-bold uppercase tracking-widest text-[#b0b0b0] dark:text-white/30">{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-[#9a9a9a]">No products found.</div>
        ) : (
          <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
            {filtered.map((p) => (
              <div key={p.id} className="sm:grid sm:grid-cols-[1fr_1fr_120px_80px_70px_90px] gap-2 flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Package size={15} className="text-[#9a9a9a] flex-shrink-0" />
                  <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{p.name}</p>
                </div>
                <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/60 truncate">{p.vendorCompany ?? p.vendor}</p>
                <p className="text-[12px] text-[#9a9a9a] truncate">{p.category ?? "—"}</p>
                <span className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white tabular-nums">{p.retailMin ? naira(p.retailMin) : "—"}</span>
                <span className="text-[12.5px] text-[#6b6b6b] dark:text-white/60 tabular-nums">{p.stock}</span>
                <span className={cn("text-[10.5px] font-bold px-2 py-0.5 rounded-full capitalize w-fit", STATUS_CLS[p.status] ?? STATUS_CLS.active)}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
        <div className="px-5 py-3 border-t border-[#f0f0f0] dark:border-white/10 text-[11.5px] text-[#9a9a9a]">
          Showing {filtered.length} of {products.length} products
        </div>
      </div>
    </div>
  );
}
