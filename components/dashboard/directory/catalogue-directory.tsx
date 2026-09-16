"use client";

import { useMemo, useState } from "react";
import { Search, FileDown, ExternalLink, Landmark, Building2 } from "lucide-react";
import { DataTable, CopyChip, SlideOverDrawer, ExportCsvDialog, type DataTableColumn } from "@/components/dashboard/kit";
import { CATEGORIES_BY_KIND, CATALOGUE_KIND_LABEL, type CatalogueKind } from "@/lib/constants/catalogue-categories";
import type { CatalogueEntry } from "@/lib/services/directory-catalogue";

/** The Institutions / Ministries tab of the Directory. Entries are
 *  admin-curated, so rows are served server-side and filtered client-side. */
export function CatalogueDirectory({ kind, rows }: { kind: CatalogueKind; rows: CatalogueEntry[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query && !`${r.name} ${r.acronym} ${r.category} ${r.location}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (category && r.category !== category) return false;
      if (location && !r.location.toLowerCase().includes(location.toLowerCase())) return false;
      return true;
    });
  }, [rows, query, category, location]);

  const open = rows.find((r) => r.id === openId);

  const columns: DataTableColumn<CatalogueEntry>[] = [
    {
      key: "name", label: CATALOGUE_KIND_LABEL[kind] === "Institutions" ? "Institution" : "Ministry",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
            {r.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.logoUrl} alt={r.name} className="h-full w-full object-cover" />
            ) : kind === "institution" ? (
              <Landmark size={14} className="text-[#9a9a9a]" />
            ) : (
              <Building2 size={14} className="text-[#9a9a9a]" />
            )}
          </div>
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
              <span className="truncate">{r.name}</span>
              {r.acronym && <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9a9a9a]">{r.acronym}</span>}
            </span>
            <span className="block truncate text-[11.5px] text-[#9a9a9a]">{r.category}</span>
          </div>
        </div>
      ),
    },
    { key: "category", label: "Category", render: (r) => <span className="text-[13px] text-[#1e1e1e] dark:text-white">{r.category || "—"}</span> },
    { key: "location", label: "Location", render: (r) => <span className="text-[13px] text-[#1e1e1e] dark:text-white">{r.location || "—"}</span> },
    { key: "email", label: "Email", render: (r) => <CopyChip value={r.email} /> },
    { key: "phone", label: "Phone number", render: (r) => <CopyChip value={r.phone} /> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${CATALOGUE_KIND_LABEL[kind].toLowerCase()} by name, acronym, or category…`}
            className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white"
        >
          <option value="">Category</option>
          {CATEGORIES_BY_KIND[kind].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="w-36 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white"
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={(r) => setOpenId(r.id)}
        bulkActions={() => (
          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
          >
            <FileDown size={13} /> Export
          </button>
        )}
      />

      <SlideOverDrawer open={!!openId} onClose={() => setOpenId(null)} title="Overview">
        {open ? (
          <div>
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
              {open.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={open.logoUrl} alt={open.name} className="h-full w-full object-cover" />
              ) : kind === "institution" ? (
                <Landmark size={20} className="text-[#9a9a9a]" />
              ) : (
                <Building2 size={20} className="text-[#9a9a9a]" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{open.name}</h3>
              {open.acronym && <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9a9a9a]">{open.acronym}</span>}
            </div>
            <p className="text-[13px] text-[#6b6b6b] dark:text-white/60">{[open.category, open.location].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 space-y-1.5">
              {open.email && <CopyChip value={open.email} />}
              {open.phone && <div className="mt-1"><CopyChip value={open.phone} /></div>}
            </div>
            {open.website && (
              <a
                href={open.website}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
              >
                <ExternalLink size={13} /> Visit website
              </a>
            )}
            {open.about && (
              <section className="mt-5">
                <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">About</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{open.about}</p>
              </section>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-[13px] text-[#9a9a9a]">Couldn't load this entry.</p>
        )}
      </SlideOverDrawer>

      <ExportCsvDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        count={selected.size}
        filename={`${kind}-export`}
        rows={rows.filter((r) => selected.has(r.id)).map((r) => ({
          Name: r.name, Acronym: r.acronym, Category: r.category, Location: r.location,
          Email: r.email, Phone: r.phone, Website: r.website,
        }))}
      />
    </div>
  );
}