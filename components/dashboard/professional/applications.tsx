"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Download } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { EmptyState, StatusBadge, type BadgeTone } from "@/components/dashboard/kit";
import type { ApplicationRow } from "@/lib/services/applications";
import { Pagination } from "@/components/ui/pagination";

const A_PER = ["10", "25", "50"];
function applicationsExport(rows: ApplicationRow[], fmt: "csv" | "xls") {
  const cols = ["Role", "Company", "Applied", "Status"];
  const data = rows.map((r) => [r.role, r.company, r.date, meta(r.status).label]);
  const date = new Date().toISOString().slice(0, 10);
  const out = (type: string, content: string) => { const u = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = u; a.download = `nomarc-applications-${date}.${fmt}`; a.click(); URL.revokeObjectURL(u); };
  if (fmt === "csv") { const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`; out("text/csv", [cols, ...data].map((r) => r.map(esc).join(",")).join("\n")); }
  else { const esc = (v: unknown) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); const b = [cols, ...data].map((r, i) => `<tr>${r.map((v) => `<t${i === 0 ? "h" : "d"}>${esc(v)}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join(""); out("application/vnd.ms-excel", `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table border="1">${b}</table></body></html>`); }
}

/** Status vocabulary — display labels follow the redesign (image 27: In review /
 *  Interview / Rejected / Offer received) while the underlying DB status values
 *  (applied|shortlisted|interview|offer|hired|rejected|withdrawn) stay untouched. */
const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  applied: { label: "In review", tone: "amber" },
  shortlisted: { label: "Shortlisted", tone: "blue" },
  interview: { label: "Interview", tone: "blue" },
  offer: { label: "Offer received", tone: "green" },
  hired: { label: "Offer received", tone: "green" },
  rejected: { label: "Rejected", tone: "grey" },
  withdrawn: { label: "Withdrawn", tone: "grey" },
};
const meta = (s: string) => STATUS_META[s] ?? { label: s, tone: "grey" as BadgeTone };
const TABS = ["All", "In review", "Interview", "Offer received"];

function JobIcon() {
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10">
      <Briefcase size={17} />
    </div>
  );
}

function DetailView({ row, onBack }: { row: ApplicationRow; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-5"><ArrowLeft size={16} /> Back</button>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <div className="flex items-start gap-3">
              <JobIcon />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{row.role}</h2>
                <p className="text-[13px] text-[#9a9a9a]">{row.company} · Lagos, Nigeria</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#f0f0f0] dark:border-white/10 flex items-center gap-2.5">
              <span className="text-[12px] text-[#9a9a9a]">Applied {row.date}</span>
              <StatusBadge tone={meta(row.status).tone}>{meta(row.status).label}</StatusBadge>
            </div>
          </div>
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <h3 className="text-sm font-bold text-[#1e1e1e] dark:text-white">Job description</h3>
            <p className="mt-1.5 text-[13px] text-[#6b6b6b] dark:text-white/60">An experienced Project manager to monitor and supervise an estate construction development project at Ibeju-Lekki, Lagos.</p>
            <h3 className="mt-4 text-sm font-bold text-[#1e1e1e] dark:text-white">Requirements</h3>
            <ul className="mt-1.5 space-y-1.5">{["7+ years experience managing construction projects", "Strong knowledge of Nigerian building codes", "Proficiency in MS Project or similar"].map((r) => <li key={r} className="flex gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60"><span className="text-[#ffd716]">•</span>{r}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <h3 className="text-sm font-bold text-[#1e1e1e] dark:text-white">Your submission</h3>
            <p className="mt-1.5 text-[13px] text-[#6b6b6b] dark:text-white/60">Expected Salary: ₦450,000 /m • Resume: sandra-james-cv.pdf</p>
            <h3 className="mt-4 text-sm font-bold text-[#1e1e1e] dark:text-white">Cover letter</h3>
            <p className="mt-1.5 text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed">I&apos;m excited to apply for the Senior Architect role at Cubic Studio. Over the past 8 years leading residential builds across Lagos, I&apos;ve developed a deep familiarity with the unique Lagos coastal environment and the demands of the Ibeju-Lekki corridor.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <p className="text-[12px] text-[#9a9a9a]">Company</p>
            <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{row.company}</p>
            <p className="text-[12px] text-[#9a9a9a]">Lagos, Nigeria</p>
          </div>
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <p className="text-[12px] text-[#9a9a9a]">Recruiter</p>
            <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{row.recruiterName || "Recruiter at " + row.company}</p>
            <p className="text-[12px] text-[#9a9a9a] mb-3">{row.recruiterName ? "Recruiter, " + row.company : row.company}</p>
            <Link href={`/dashboard/messages?to=${encodeURIComponent(row.ownerUserId)}`} className="w-full inline-flex items-center justify-center py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">Message recruiter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Applications({ rows = [] }: { rows?: ApplicationRow[] }) {
  const [tab, setTab] = useState("All");
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const empty = rows.length === 0;
  const filtered = tab === "All" ? rows : rows.filter((r) => meta(r.status).label === tab);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6">
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">Applications</h1>
          <p className="text-[13px] text-[#9a9a9a] mt-0.5">Track every role you&apos;ve applied to.</p>
        </div>
        {!empty && !selected && (
          <div className="flex items-center gap-2">
            <button onClick={() => applicationsExport(filtered, "csv")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Download size={13} /> CSV</button>
            <button onClick={() => applicationsExport(filtered, "xls")} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Download size={13} /> Excel</button>
          </div>
        )}
      </div>

      {empty ? (
        <EmptyState
          icon={Briefcase}
          title="No applications submitted yet"
          description="This is where you'll track your progress after applying to a job. Head over to the job board to find your next opportunity."
          primary={{ label: "Browse jobs", href: "/dashboard/jobs" }}
          secondary={{ label: "View saved jobs", href: "/dashboard/jobs/saved" }}
        />
      ) : selected ? (
        <DetailView row={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {TABS.map((t) => (
              <button key={t} onClick={() => { setTab(t); setPage(0); }} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${tab === t ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f0f0f0] dark:bg-white/5 text-[#6b6b6b] dark:text-white/60 hover:bg-[#e8e8e8] dark:hover:bg-white/10"}`}>{t}</button>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="text-[11px] uppercase tracking-wider text-[#9a9a9a] border-b border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
                {["Role", "Company", "Applied", "Status", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className="border-b border-[#f5f5f5] dark:border-white/5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-[#1e1e1e] dark:text-white">{r.role}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[#9a9a9a]">{r.company}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[#9a9a9a]">{r.date}</td>
                    <td className="px-5 py-3.5"><StatusBadge tone={meta(r.status).tone}>{meta(r.status).label}</StatusBadge></td>
                    <td className="px-5 py-3.5 text-right"><button onClick={() => setSelected(r)} className="text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:text-[#caa400] dark:hover:text-[#ffd716] transition-colors">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-3">
            {paged.map((r) => (
              <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 hover:border-[#ffd716] transition-colors">
                <div className="flex items-start gap-3">
                  <JobIcon />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate">{r.role}</p>
                        <p className="text-[12px] text-[#9a9a9a] mt-0.5">{r.company}</p>
                      </div>
                      <StatusBadge tone={meta(r.status).tone} className="flex-shrink-0">{meta(r.status).label}</StatusBadge>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11.5px] text-[#9a9a9a]">Applied {r.date}</span>
                      <span className="text-[12.5px] font-medium text-[#caa400]">View →</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-[13px] text-[#9a9a9a] py-12">No applications in this view.</p>
          )}

          {filtered.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-[13px] text-[#9a9a9a]">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Per page</span>
                <div className="w-[70px]"><SelectMenu value={String(perPage)} options={A_PER} onChange={(v) => { setPerPage(Number(v)); setPage(0); }} /></div>
              </div>
              <div className="flex items-center gap-1">
                <Pagination page={safePage + 1} pageCount={pageCount} onPageChange={(p) => setPage(p - 1)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function ApplicationsSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6">
      <div className="mb-5 space-y-1.5">
        <S cls="h-7 w-36" />
        <S cls="h-3.5 w-52 max-w-full" />
      </div>
      <div className="flex gap-2 mb-4">
        {[64, 88, 72, 96].map((w, i) => <S key={i} cls="h-8 rounded-full" style={{ width: w }} />)}
      </div>
      <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1fr_100px_130px_60px] gap-4 px-5 py-3 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#ececec] dark:border-white/10">
          {[72, 72, 56, 52, 0].map((w, i) => w > 0 ? <S key={i} cls="h-3" style={{ width: w }} /> : <span key={i} />)}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="hidden md:grid grid-cols-[1fr_1fr_100px_130px_60px] gap-4 items-center px-5 py-3.5 border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
            <S cls="h-3.5 w-3/4" />
            <S cls="h-3.5 w-2/3" />
            <S cls="h-3.5 w-14" />
            <S cls="h-6 w-24 rounded-full" />
            <S cls="h-3.5 w-8" />
          </div>
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="md:hidden border-b border-[#f5f5f5] dark:border-white/5 last:border-0 p-4">
            <div className="flex items-start gap-3">
              <S cls="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5"><S cls="h-3.5 w-40 max-w-full" /><S cls="h-3 w-28" /></div>
              <S cls="h-6 w-20 rounded-full flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
