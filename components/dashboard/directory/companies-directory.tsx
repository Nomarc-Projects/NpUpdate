"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ListPlus, FileDown, MessageSquare, Eye, BadgeCheck, Building2 } from "lucide-react";
import {
  DataTable, CopyChip, SlideOverDrawer, AddToListDialog, ExportCsvDialog,
  StatusBadge, ChipList, type DataTableColumn,
} from "@/components/dashboard/kit";
import { MySearchesMenu } from "@/components/dashboard/directory/my-searches-menu";
import { getCompanyById, type CompanyCard, type CompanyDetail } from "@/lib/services/company";
import { INDUSTRIES } from "@/lib/constants/industries";

export function CompaniesDirectory({ rows }: { rows: CompanyCard[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query && !`${r.name} ${r.industry ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (industry && r.industry !== industry) return false;
      if (location && !(r.headquarters ?? "").toLowerCase().includes(location.toLowerCase())) return false;
      if (size && r.companySize !== size) return false;
      return true;
    });
  }, [rows, query, industry, location, size]);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    setDetailLoading(true);
    getCompanyById(openId).then(setDetail).catch(() => setDetail(null)).finally(() => setDetailLoading(false));
  }, [openId]);

  function applySearch(q: Record<string, unknown>) {
    setQuery(typeof q.query === "string" ? q.query : "");
    setIndustry(typeof q.industry === "string" ? q.industry : "");
    setLocation(typeof q.location === "string" ? q.location : "");
    setSize(typeof q.size === "string" ? q.size : "");
  }

  const columns: DataTableColumn<CompanyCard>[] = [
    {
      key: "company", label: "Company",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
            {r.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.avatarUrl} alt={r.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 size={14} className="text-[#9a9a9a]" />
            )}
          </div>
          <div className="min-w-0">
            <span className="flex items-center gap-1 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
              {r.name} {r.verified && <BadgeCheck size={13} className="text-[#ffd716]" />}
            </span>
            <span className="block truncate text-[11.5px] text-[#9a9a9a]">{r.headquarters}</span>
          </div>
        </div>
      ),
    },
    { key: "industry", label: "Primary Industry", render: (r) => <span className="text-[13px] text-[#1e1e1e] dark:text-white">{r.industry ?? "—"}</span> },
    { key: "email", label: "Email", render: (r) => <CopyChip value={r.email} /> },
    { key: "phone", label: "Phone number", render: (r) => <CopyChip value={r.phone} /> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by company or industry…" className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
        </div>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white">
          <option value="">Primary Industry</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="w-36 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
        <select value={size} onChange={(e) => setSize(e.target.value)} className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white">
          <option value="">Company Size</option>
          <option value="1-10">1-10</option>
          <option value="11-50">11-50</option>
          <option value="51-200">51-200</option>
          <option value="201+">201+</option>
        </select>
        <MySearchesMenu kind="companies" currentQuery={{ query, industry, location, size }} onApply={applySearch} />
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
          <>
            <button onClick={() => setAddToListOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-3 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"><ListPlus size={13} /> Add to list</button>
            <button onClick={() => setExportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"><FileDown size={13} /> Export</button>
          </>
        )}
      />

      <SlideOverDrawer open={!!openId} onClose={() => setOpenId(null)} title="Overview">
        {detailLoading ? (
          <p className="py-8 text-center text-[13px] text-[#9a9a9a]">Loading…</p>
        ) : detail ? (
          <div>
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
              {detail.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.avatarUrl} alt={detail.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 size={20} className="text-[#9a9a9a]" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{detail.name}</h3>
              {detail.verified && <StatusBadge tone="green">Verified</StatusBadge>}
            </div>
            <p className="text-[13px] text-[#6b6b6b] dark:text-white/60">{[detail.industry, detail.headquarters].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 space-y-1.5">
              {rows.find((r) => r.id === openId)?.email && <CopyChip value={rows.find((r) => r.id === openId)!.email} />}
              {rows.find((r) => r.id === openId)?.phone && <div className="mt-1"><CopyChip value={rows.find((r) => r.id === openId)!.phone} /></div>}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setSelected(new Set([openId!])); setAddToListOpen(true); }} className="flex-1 rounded-lg bg-[#ffd716] px-3 py-2 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">+ Add to list</button>
              <button onClick={() => router.push(`/dashboard/messages`)} className="flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"><MessageSquare size={13} /> Message</button>
              <button onClick={() => router.push(`/dashboard/companies/${openId}`)} className="flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"><Eye size={13} /> View full profile</button>
            </div>
            {detail.about && (
              <section className="mt-5"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">About</h4><p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{detail.about}</p></section>
            )}
            {(detail.headquarters || detail.yearFounded || detail.companySize) && (
              <section className="mt-4">
                <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Company Details</h4>
                <div className="mt-1.5 space-y-1 text-[13px] text-[#6b6b6b] dark:text-white/60">
                  {detail.headquarters && <p>Headquarters · {detail.headquarters}</p>}
                  {detail.yearFounded && <p>Year Founded · {detail.yearFounded}</p>}
                  {detail.companySize && <p>Company Size · {detail.companySize}</p>}
                </div>
              </section>
            )}
            {detail.categories.length > 0 && (
              <section className="mt-4"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Categories</h4><ChipList items={detail.categories} tone="yellow" className="mt-1.5" /></section>
            )}
            {detail.certifications.length > 0 && (
              <section className="mt-4"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Certifications</h4>
                <ul className="mt-1.5 space-y-1.5">{detail.certifications.map((c) => <li key={c.id} className="text-[13px]"><span className="font-medium text-[#1e1e1e] dark:text-white">{c.name}</span><span className="block text-[11.5px] text-[#9a9a9a]">{[c.issuer, c.year].filter(Boolean).join(" · ")}</span></li>)}</ul>
              </section>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-[13px] text-[#9a9a9a]">Couldn't load this company.</p>
        )}
      </SlideOverDrawer>

      <AddToListDialog open={addToListOpen} onClose={() => setAddToListOpen(false)} itemType="company" itemIds={Array.from(selected)} onDone={() => setSelected(new Set())} />
      <ExportCsvDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        count={selected.size}
        filename="companies-export"
        rows={rows.filter((r) => selected.has(r.id)).map((r) => ({ Name: r.name, Industry: r.industry ?? "", Headquarters: r.headquarters ?? "", Email: r.email, Phone: r.phone }))}
      />
    </div>
  );
}
