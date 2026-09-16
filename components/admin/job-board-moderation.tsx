"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Eye, Lock, Unlock, Trash2, Plus, Pencil } from "lucide-react";
import { DataTable, KebabMenu, StatusBadge, SlideOverDrawer, type DataTableColumn, type BadgeTone } from "@/components/dashboard/kit";
import { FiltersRail, type FilterGroup } from "@/components/admin/filters-rail";
import { AdminJobFormDrawer } from "@/components/admin/admin-job-form";
import { EXPERIENCE_LEVELS } from "@/lib/experience-levels";
import { suspendAdminJob, restoreAdminJob, deleteAdminJob, getAdminJobForEdit, type AdminJob, type AdminJobDetail } from "@/lib/services/admin";

const STATUS_TONE: Record<string, BadgeTone> = { open: "green", suspended: "amber", closed: "grey" };

export function JobBoardModeration({ rows }: { rows: AdminJob[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [selected, setSelected] = useState<AdminJob | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminJobDetail | null>(null);
  const [, start] = useTransition();

  const filtered = useMemo(() => rows.filter((j) => {
    if (query && !`${j.title} ${j.posterName} ${j.company ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (status && (j.draft ? "draft" : j.status) !== status) return false;
    if (employmentType && j.employmentType !== employmentType) return false;
    if (experienceLevel && j.experienceLevel !== experienceLevel) return false;
    if (workModel && j.workModel !== workModel) return false;
    return true;
  }), [rows, query, status, employmentType, experienceLevel, workModel]);

  function suspend(j: AdminJob) { start(() => suspendAdminJob(j.id).then(() => { toast.success("Job suspended"); router.refresh(); }).catch(() => { toast.error("Couldn't suspend"); })); }
  function restore(j: AdminJob) { start(() => restoreAdminJob(j.id).then(() => { toast.success("Job restored"); router.refresh(); }).catch(() => { toast.error("Couldn't restore"); })); }
  function del(j: AdminJob) {
    if (!window.confirm(`Delete "${j.title}"? This cannot be undone.`)) return;
    start(() => deleteAdminJob(j.id).then(() => { toast.success("Job deleted"); setSelected(null); router.refresh(); }).catch(() => { toast.error("Couldn't delete"); }));
  }

  function edit(j: AdminJob) {
    start(() => getAdminJobForEdit(j.id).then((d) => { if (d) { setEditing(d); setFormOpen(true); } else { toast.error("Job not found"); } }).catch(() => { toast.error("Couldn't load job"); }));
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  const columns: DataTableColumn<AdminJob>[] = [
    { key: "role", label: "Job Role", render: (j) => (<div><p className="font-semibold text-[#1e1e1e] dark:text-white">{j.title}</p><p className="text-[11.5px] text-[#9a9a9a]">{j.company ?? j.posterName}</p></div>) },
    { key: "poster", label: "Posted By", render: (j) => (<div><p className="text-[#1e1e1e] dark:text-white">{j.posterName}</p><p className="text-[11.5px] text-[#9a9a9a]">{j.posterEmail}</p></div>) },
    { key: "date", label: "Date Posted", render: (j) => <span className="text-[#9a9a9a]">{j.date}</span> },
    { key: "setup", label: "Setup", render: (j) => (<div className="text-[12.5px] text-[#4a4a4a] dark:text-white/70"><p>{j.employmentType ?? "—"}</p><p className="text-[#9a9a9a]">{j.workModel ?? "—"}</p></div>) },
    { key: "applicants", label: "Applicants", render: (j) => <span>{j.applicants}</span> },
    { key: "status", label: "Status", render: (j) => <StatusBadge tone={j.draft ? "grey" : STATUS_TONE[j.status] ?? "grey"}>{j.draft ? "Draft" : j.status[0].toUpperCase() + j.status.slice(1)}</StatusBadge> },
  ];

  const filterGroups: FilterGroup[] = [
    { key: "status", label: "Status", value: status, onChange: setStatus, options: [{ value: "", label: "All" }, { value: "open", label: "Active" }, { value: "closed", label: "Closed" }, { value: "suspended", label: "Suspended" }] },
    { key: "employmentType", label: "Employment Type", value: employmentType, onChange: setEmploymentType, options: [{ value: "", label: "All" }, { value: "Full-time", label: "Full-time" }, { value: "Part-time", label: "Part-time" }, { value: "Contract", label: "Contract" }, { value: "Internship", label: "Internship" }, { value: "Project-based", label: "Project-based" }] },
    { key: "experienceLevel", label: "Experience Level", value: experienceLevel, onChange: setExperienceLevel, options: [{ value: "", label: "All" }, ...EXPERIENCE_LEVELS.map((l) => ({ value: l, label: l }))] },
    { key: "workModel", label: "Work Model", value: workModel, onChange: setWorkModel, options: [{ value: "", label: "All" }, { value: "On-site", label: "On-site" }, { value: "Remote", label: "Remote" }, { value: "Hybrid", label: "Hybrid" }] },
  ];

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <FiltersRail groups={filterGroups} />

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative max-w-[420px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by job title, poster name, or company…" className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#333] dark:bg-white dark:text-[#1e1e1e] dark:hover:bg-[#e5e5e5]"><Plus size={15} /> Post a Job</button>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(j) => j.id}
          onRowClick={setSelected}
          rowHoverActions={(j) => (
            <KebabMenu items={[
              { icon: Eye, label: "View Job Details", onClick: () => setSelected(j) },
              { icon: Pencil, label: "Edit Job", onClick: () => edit(j) },
              { icon: Lock, label: "Suspend Job", onClick: () => suspend(j), hidden: j.status === "suspended" },
              { icon: Unlock, label: "Restore Job", onClick: () => restore(j), hidden: j.status !== "suspended" },
              { icon: Trash2, label: "Delete Job", danger: true, onClick: () => del(j) },
            ]} />
          )}
        />
      </div>

      <SlideOverDrawer open={!!selected} onClose={() => setSelected(null)} title="Overview" subtitle={undefined}>
        {selected && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{selected.title}</h3>
                <p className="text-[12.5px] text-[#9a9a9a]">{selected.company ?? selected.posterName}{selected.location ? ` · ${selected.location}` : ""}</p>
                <p className="mt-1 text-[11.5px] text-[#9a9a9a]">Posted by {selected.posterName} · <StatusBadge tone={selected.draft ? "grey" : STATUS_TONE[selected.status] ?? "grey"} className="align-middle">{selected.draft ? "Draft" : selected.status}</StatusBadge> · {selected.applicants} Applicants</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {[selected.employmentType, selected.experienceLevel, selected.workModel, selected.salary].filter(Boolean).map((t) => (
                <span key={t} className="rounded-md border border-[#ececec] px-2 py-1 text-[11.5px] text-[#6b6b6b] dark:border-white/10 dark:text-white/60">{t}</span>
              ))}
              <span className="ml-auto flex items-center gap-2">
                {selected.status === "suspended" ? (
                  <button onClick={() => restore(selected)} className="rounded-lg bg-[#1a7f43] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#166636]">Restore Job</button>
                ) : (
                  <button onClick={() => suspend(selected)} className="rounded-lg bg-[#ffd716] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">Suspend Job</button>
                )}
                <KebabMenu items={[{ icon: Trash2, label: "Delete Job", danger: true, onClick: () => del(selected) }]} />
              </span>
            </div>

            {selected.description && <section className="mt-5"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Job Overview</h4><p className="mt-1.5 whitespace-pre-wrap text-[13px] text-[#6b6b6b] dark:text-white/60">{selected.description}</p></section>}
            {selected.requirements && <section className="mt-4"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Required Skills &amp; Qualifications</h4><p className="mt-1.5 whitespace-pre-wrap text-[13px] text-[#6b6b6b] dark:text-white/60">{selected.requirements}</p></section>}
          </div>
        )}
      </SlideOverDrawer>

      <AdminJobFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
      />
    </div>
  );
}
