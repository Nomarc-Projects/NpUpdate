"use client";

import { useState } from "react";
import { FolderOpen, Download, Plus, CheckCircle2, Clock, XCircle, Search, FileText, FileSpreadsheet, File } from "lucide-react";

type Category = "all" | "contract" | "boq" | "invoice" | "report" | "specification" | "schedule" | "other";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all",           label: "All" },
  { id: "contract",      label: "Contracts" },
  { id: "boq",          label: "Bill of Quantities" },
  { id: "specification", label: "Specifications" },
  { id: "report",        label: "Reports & Logs" },
  { id: "schedule",      label: "Schedules" },
  { id: "invoice",       label: "Invoices" },
  { id: "other",         label: "Other" },
];

interface Template {
  id: string; name: string; category: Category; discipline: string;
  fileType: string; downloads: number; isPremium: boolean; status: "published" | "draft" | "archived";
}

const TEMPLATES: Template[] = [
  { id: "t1",  name: "Professional Services Agreement",     category: "contract",      discipline: "All",                    fileType: "docx", downloads: 312, isPremium: false, status: "published" },
  { id: "t2",  name: "Preliminaries Bill of Quantities",    category: "boq",           discipline: "Quantity Surveying",     fileType: "xlsx", downloads: 289, isPremium: false, status: "published" },
  { id: "t3",  name: "NEC3 Subcontract Template",          category: "contract",      discipline: "Project Management",    fileType: "docx", downloads: 201, isPremium: true,  status: "published" },
  { id: "t4",  name: "Construction Programme (Gantt)",      category: "schedule",      discipline: "Project Management",    fileType: "xlsx", downloads: 178, isPremium: false, status: "published" },
  { id: "t5",  name: "Architect's Site Inspection Report",  category: "report",        discipline: "Architecture",          fileType: "docx", downloads: 145, isPremium: false, status: "published" },
  { id: "t6",  name: "Structural Steel Specification",      category: "specification", discipline: "Structural Engineering",fileType: "docx", downloads: 132, isPremium: true,  status: "published" },
  { id: "t7",  name: "Interim Valuation Certificate",       category: "invoice",       discipline: "Quantity Surveying",    fileType: "docx", downloads: 98,  isPremium: false, status: "published" },
  { id: "t8",  name: "MEP Coordination Checklist",          category: "report",        discipline: "MEP Engineering",       fileType: "docx", downloads: 87,  isPremium: false, status: "published" },
  { id: "t9",  name: "Planning Application Fee Schedule",   category: "schedule",      discipline: "Architecture",          fileType: "xlsx", downloads: 74,  isPremium: false, status: "published" },
  { id: "t10", name: "BIM Execution Plan Template",         category: "specification", discipline: "BIM",                   fileType: "docx", downloads: 61,  isPremium: true,  status: "draft" },
];

const SUBMISSIONS = [
  { id: "s1", name: "Fire Protection Specification",      submittedBy: "Emeka Eze",     discipline: "MEP Engineering",   fileType: "docx", status: "pending" as const },
  { id: "s2", name: "QS Monthly Valuation Template",     submittedBy: "Tunde Bakare",  discipline: "QS",               fileType: "xlsx", status: "pending" as const },
  { id: "s3", name: "Landscape Architecture Brief",      submittedBy: "Amaka Obi",     discipline: "Landscape",        fileType: "docx", status: "pending" as const },
];

function FileIcon2({ type }: { type: string }) {
  if (type === "xlsx") return <FileSpreadsheet size={15} className="text-[#22c55e]" />;
  if (type === "docx") return <FileText size={15} className="text-[#6366f1]" />;
  return <File size={15} className="text-[#9a9a9a]" />;
}

export default function AdminTemplatesPage() {
  const [cat, setCat] = useState<Category>("all");
  const [search, setSearch] = useState("");

  const filtered = TEMPLATES.filter((t) =>
    (cat === "all" || t.category === cat) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.discipline.toLowerCase().includes(search.toLowerCase()))
  );

  const published = TEMPLATES.filter((t) => t.status === "published").length;
  const totalDownloads = TEMPLATES.reduce((s, t) => s + t.downloads, 0);
  const premium = TEMPLATES.filter((t) => t.isPremium).length;

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[1020px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ffd716]/15 dark:bg-[#ffd716]/[0.08] flex items-center justify-center text-[#caa400]">
              <FolderOpen size={18} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Business Templates</h1>
              <p className="text-[12px] text-[#9a9a9a] mt-0.5">Manage the professional template library.</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">
            <Plus size={15} /> Add template
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Published",       value: published,      color: "text-[#22c55e] bg-[#dcfce7] dark:bg-[#22c55e]/15", icon: CheckCircle2 },
              { label: "Total downloads", value: totalDownloads, color: "text-[#caa400] bg-[#fff7cc] dark:bg-[#ffd716]/10",  icon: Download },
              { label: "Premium only",    value: premium,        color: "text-[#6366f1] bg-[#e0e7ff] dark:bg-[#6366f1]/15",  icon: FolderOpen },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}><s.icon size={15} /></div>
                <p className="text-xl font-bold text-[#1e1e1e] dark:text-white">{s.value}</p>
                <p className="text-[11px] text-[#9a9a9a]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pending submissions */}
          {SUBMISSIONS.length > 0 && (
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-3">
                Pending submissions <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#ffd716]/20 text-[#caa400] text-[10px]">{SUBMISSIONS.length}</span>
              </h2>
              <div className="space-y-2">
                {SUBMISSIONS.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-[#ffd716]/20 bg-[#fffdf2] dark:bg-[#ffd716]/[0.04] p-4">
                    <Clock size={15} className="text-[#caa400] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{s.name}</p>
                      <p className="text-[11px] text-[#9a9a9a]">{s.submittedBy} · {s.discipline} · .{s.fileType}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#dcfce7] text-[#16803c] text-[12px] font-semibold hover:bg-[#bbf7d0] transition-colors">
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#fce8e8] text-[#e5484d] text-[12px] font-semibold hover:bg-[#fecaca] transition-colors">
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search + filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="w-full pl-8 pr-3 h-9 text-[13px] rounded-lg border border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#1e1e1e] dark:text-white placeholder-[#9a9a9a] outline-none focus:border-[#ffd716]"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${cat === c.id ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f0f0f0] dark:bg-white/5 text-[#6b6b6b] dark:text-white/50 hover:bg-[#e8e8e8]"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Templates table */}
          <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#9a9a9a] border-b border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
                  <th className="px-4 py-3 font-semibold">Template</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Discipline</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Downloads</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const statusCls = t.status === "published" ? "bg-[#dcfce7] text-[#16803c]" : t.status === "draft" ? "bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]" : "bg-[#fce8e8] text-[#e5484d]";
                  return (
                    <tr key={t.id} className="border-b border-[#f5f5f5] dark:border-white/5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon2 type={t.fileType} />
                          <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate max-w-[200px]">{t.name}</span>
                          {t.isPremium && <span className="text-[9px] font-bold text-[#8a7400] bg-[#ffd716]/20 px-1.5 py-0.5 rounded-full flex-shrink-0">Premium</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#9a9a9a] hidden sm:table-cell">{t.discipline}</td>
                      <td className="px-4 py-3 text-[12px] text-[#9a9a9a] capitalize hidden md:table-cell">{t.category}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-[12px] text-[#9a9a9a]">
                          <Download size={11} /> {t.downloads.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusCls}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-[12px] font-semibold text-[#9a9a9a] hover:text-[#ffd716] transition-colors">Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-[13px] text-[#9a9a9a]">No templates match your filter.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
