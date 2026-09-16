"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Building2, BadgeCheck, MapPin, Users, SlidersHorizontal, X, Download, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CompanyCard } from "@/lib/services/company";
import { SaveToList } from "@/components/dashboard/save-to-list";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";

const C_COL: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", 5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" };
const C_PER = ["12", "24", "48", "96"];
function cdl(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function companiesExport(rows: CompanyCard[], fmt: "csv" | "xls") {
  const cols = ["Name", "Industry", "Headquarters", "Size", "Verified"];
  const data = rows.map((c) => [c.name, c.industry ?? "", c.headquarters ?? "", c.companySize ?? "", c.verified ? "Yes" : "No"]);
  const date = new Date().toISOString().slice(0, 10);
  if (fmt === "csv") {
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    cdl(`nomarc-companies-${date}.csv`, "text/csv", [cols, ...data].map((r) => r.map(esc).join(",")).join("\n"));
  } else {
    const esc = (v: unknown) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const body = [cols, ...data].map((r, i) => `<tr>${r.map((v) => `<t${i === 0 ? "h" : "d"}>${esc(v)}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join("");
    cdl(`nomarc-companies-${date}.xls`, "application/vnd.ms-excel", `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`);
  }
}

const INDUSTRIES = [
  "Architecture & Design",
  "Construction & Contracting",
  "Core Building Materials",
  "Heavy Machinery & Plant",
  "Electrical & Lighting",
  "Plumbing & Water Systems",
  "HVAC Systems",
  "Roofing & Waterproofing",
  "Interior Fit-Out",
  "Engineering Consultancy",
  "Project Management",
];

function CompanyCardItem({ c }: { c: CompanyCard }) {
  const initials = c.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 hover:border-[#ffd716] transition-colors flex flex-col"
    >
      {/* Logo */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {c.avatarUrl ? (
          <img src={c.avatarUrl} alt={c.name} className="w-11 h-11 rounded-lg object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] font-bold text-sm flex-shrink-0">
            {initials || <Building2 size={18} />}
          </div>
        )}
        {c.verified && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#1d4ed8] bg-[#e0edff] dark:bg-[#6366f1]/20 dark:text-[#818cf8] px-2 py-0.5 rounded-full flex-shrink-0">
            <BadgeCheck size={11} /> Verified
          </span>
        )}
      </div>

      {/* Info */}
      <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white leading-snug">{c.name}</h3>
      {c.industry && <p className="text-[12px] text-[#9a9a9a] mt-0.5">{c.industry}</p>}

      <div className="mt-2 flex flex-col gap-1">
        {c.headquarters && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#9a9a9a]">
            <MapPin size={11} /> {c.headquarters}
          </p>
        )}
        {c.companySize && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#9a9a9a]">
            <Users size={11} /> {c.companySize}
          </p>
        )}
      </div>

      <div className="mt-auto pt-3 flex items-center gap-2">
        <Link href={`/dashboard/companies/${c.id}`} className="flex-1 text-center py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">
          View company
        </Link>
        <SaveToList itemType="company" itemId={c.id} />
      </div>
    </motion.div>
  );
}

interface Props {
  companies: CompanyCard[];
  initialQ: string;
  initialIndustry: string;
}

export function CompaniesView({ companies, initialQ, initialIndustry }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [industry, setIndustry] = useState(initialIndustry);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cols, setCols] = useState(3);
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(0);
  const [, startTransition] = useTransition();

  // Client-side filter on top of server-fetched data for instant feel
  const filtered = companies.filter((c) => {
    const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.industry ?? "").toLowerCase().includes(q.toLowerCase()) || (c.headquarters ?? "").toLowerCase().includes(q.toLowerCase());
    const matchInd = !industry || (c.industry ?? "").toLowerCase().includes(industry.toLowerCase());
    return matchQ && matchInd;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * perPage, safePage * perPage + perPage);

  function applyFilters(newQ: string, newInd: string) {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newInd) params.set("industry", newInd);
    startTransition(() => router.push(`/dashboard/companies?${params.toString()}`));
  }

  function clearFilters() {
    setQ(""); setIndustry("");
    startTransition(() => router.push("/dashboard/companies"));
  }

  const hasFilters = !!q || !!industry;

  return (
    <div className="px-5 sm:px-8 py-6 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1e1e1e] dark:text-white">Companies</h1>
          <p className="text-[13px] text-[#9a9a9a] mt-0.5">Browse firms, suppliers, and brands across the construction ecosystem.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => companiesExport(filtered, "csv")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Download size={14} /> CSV</button>
          <button onClick={() => companiesExport(filtered, "xls")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Download size={14} /> Excel</button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[480px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); applyFilters(e.target.value, industry); }}
            className="w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] pl-10 pr-4 py-2.5 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors"
            placeholder="Search companies by name, industry, location…"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-colors ${filtersOpen ? "bg-[#ffd716] text-[#1e1e1e] border-[#ffd716]" : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"}`}
        >
          <SlidersHorizontal size={14} /> Filters
          {hasFilters && <span className="w-2 h-2 rounded-full bg-[#e5484d]" />}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-[13px] text-[#9a9a9a] hover:text-[#e5484d] transition-colors">
            <X size={13} /> Clear
          </button>
        )}
        <div className="hidden sm:flex items-center gap-1 rounded-lg border border-[#e3e3e3] dark:border-white/15 p-0.5 ml-auto">
          <LayoutGrid size={14} className="text-[#9a9a9a] ml-1.5" />
          {[2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setCols(n)} title={`${n} columns`} className={cn("w-7 h-7 rounded-md text-[12px] font-semibold transition-colors", cols === n ? "bg-[#fff7cc] dark:bg-white/10 text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>{n}</button>
          ))}
        </div>
      </div>

      {/* Filter drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mb-5 p-4 rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9a9a9a] mb-3">Industry</p>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => { const next = industry === ind ? "" : ind; setIndustry(next); applyFilters(q, next); }}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${industry === ind ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-white dark:bg-white/5 border border-[#e3e3e3] dark:border-white/10 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"}`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <p className="text-[12px] text-[#9a9a9a] mb-4">
        {filtered.length === 0 ? "No companies found" : `${filtered.length} ${filtered.length === 1 ? "company" : "companies"}`}
        {hasFilters ? " matching your filters" : " in the directory"}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center mb-4">
            <Building2 size={24} className="text-[#caa400]" />
          </div>
          <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">No companies found</h3>
          <p className="text-[13px] text-[#9a9a9a] mt-1.5 max-w-sm">
            {hasFilters ? "Try adjusting your search or filters." : "Companies will appear here as exhibitors join the platform."}
          </p>
          {hasFilters && <button onClick={clearFilters} className="mt-4 text-[13px] text-[#ffd716] hover:underline">Clear filters</button>}
        </div>
      ) : (
        <>
          <motion.div layout className={cn("grid gap-4", C_COL[cols])}>
            <AnimatePresence>
              {paged.map((c) => <CompanyCardItem key={c.id} c={c} />)}
            </AnimatePresence>
          </motion.div>
          {/* per-page + pagination */}
          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap text-[13px] text-[#9a9a9a]">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Per page</span>
              <div className="w-[74px]"><SelectMenu value={String(perPage)} options={C_PER} onChange={(v) => { setPerPage(Number(v)); setPage(0); }} /></div>
            </div>
            <div className="flex items-center gap-1">
              <Pagination page={safePage + 1} pageCount={pageCount} onPageChange={(p) => setPage(p - 1)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function CompaniesViewSkeleton() {
  const S = ({ cls = "" }: { cls?: string }) => <div className={`skeleton rounded-md ${cls}`} />;
  return (
    <div className="px-5 sm:px-8 py-6 max-w-[1200px]">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1.5"><S cls="h-7 w-32" /><S cls="h-3.5 w-72 max-w-full" /></div>
        <div className="flex items-center gap-2"><S cls="h-8 w-14 rounded-lg" /><S cls="h-8 w-16 rounded-lg" /></div>
      </div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <S cls="h-10 flex-1 min-w-[200px] max-w-[480px] rounded-lg" />
        <S cls="h-10 w-24 rounded-lg" />
        <S cls="hidden sm:block h-8 w-24 rounded-lg ml-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
            <S cls="h-24 w-full rounded-none" />
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-3"><S cls="w-12 h-12 rounded-2xl flex-shrink-0 -mt-8" /><S cls="h-4 w-32" /></div>
              <S cls="h-3 w-full" /><S cls="h-3 w-2/3" />
              <div className="flex gap-2 pt-1"><S cls="h-6 w-20 rounded-full" /><S cls="h-6 w-24 rounded-full" /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
