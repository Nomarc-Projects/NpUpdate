"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Users, Briefcase, Trash2, Lock, Unlock, Copy, FileText, Pencil } from "lucide-react";
import { Modal, GhostButton } from "@/components/ui/modal";
import { DashboardTabs, KebabMenu, StatusBadge, EmptyState, type TabItem } from "@/components/dashboard/kit";
import { PostingGuidelinesDrawer } from "@/components/dashboard/posting-guidelines-drawer";
import { JobEditDrawer } from "@/components/dashboard/job-edit-drawer";
import { VerificationRequiredModal } from "@/components/dashboard/shared/verification-required-modal";
import { setJobStatus, publishDraftJob, deleteJob, duplicateJobAsDraft, type PostedJob } from "@/lib/services/jobs";
import { getKycState } from "@/lib/services/kyc";

type Tab = "active" | "drafts" | "closed";
const TABS: TabItem[] = [
  { key: "active", label: "Active" },
  { key: "drafts", label: "Drafts" },
  { key: "closed", label: "Closed" },
];

export function PostedJobs({ jobs = [], initialTab = "active" }: { jobs?: PostedJob[]; initialTab?: Tab }) {
  const router = useRouter();
  const [list, setList] = useState(jobs);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [delId, setDelId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [, start] = useTransition();

  const active = useMemo(() => list.filter((j) => !j.draft && j.status === "open"), [list]);
  const drafts = useMemo(() => list.filter((j) => j.draft), [list]);
  const closed = useMemo(() => list.filter((j) => !j.draft && j.status === "closed"), [list]);
  const shown = tab === "active" ? active : tab === "drafts" ? drafts : closed;

  const bg = (action: Promise<unknown>, revert: () => void, ok: string) => {
    toast.success(ok);
    start(() => action.then(() => router.refresh()).catch((e) => { revert(); toast.error(e instanceof Error ? e.message : "Something went wrong"); }));
  };

  const toggleStatus = (j: PostedJob) => {
    const next = j.status === "open" ? "closed" : "open";
    const prev = list;
    setList((l) => l.map((x) => (x.id === j.id ? { ...x, status: next } : x)));
    bg(setJobStatus(j.id, next), () => setList(prev), next === "closed" ? "Job closed" : "Job reopened");
  };
  const duplicate = (j: PostedJob) => {
    bg(duplicateJobAsDraft(j.id), () => {}, "Duplicated to drafts");
  };
  const publish = (j: PostedJob) => {
    const prev = list;
    setList((l) => l.map((x) => (x.id === j.id ? { ...x, draft: false } : x)));
    bg(publishDraftJob(j.id), () => setList(prev), "Job published");
  };
  const confirmDelete = () => {
    if (!delId) return;
    const prev = list; const id = delId;
    setList((l) => l.filter((x) => x.id !== id)); setDelId(null);
    bg(deleteJob(id), () => setList(prev), "Job deleted");
  };

  return (
    <div className="px-6 md:px-8 py-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1e1e1e] dark:text-white">Posted Jobs</h1>
          <p className="text-sm text-[#9a9a9a] mt-0.5">Manage your listings and review applicants.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setGuidelinesOpen(true)} className="text-[13px] font-medium text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white transition-colors">View posting guidelines</button>
          <Link href="/dashboard/jobs/post" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors"><Plus size={16} /> New Job post</Link>
        </div>
      </div>

      <DashboardTabs tabs={TABS} active={tab} onChange={(k) => setTab(k as Tab)} className="mb-5" />

      {shown.length === 0 ? (
        tab === "drafts" ? (
          <EmptyState icon={FileText} title="No job drafts" description="Jobs you start creating but haven't published yet will appear here." primary={{ label: "Create a job post", href: "/dashboard/jobs/post" }} secondary={{ label: "View posting guidelines", onClick: () => setGuidelinesOpen(true) }} />
        ) : tab === "closed" ? (
          <EmptyState icon={Lock} title="No closed jobs" description="Jobs you close will show up here for your records." />
        ) : (
          <EmptyState icon={Briefcase} title="No jobs posted yet" description="Post your first role to start receiving applications." primary={{ label: "Create a job post", href: "/dashboard/jobs/post" }} secondary={{ label: "View posting guidelines", onClick: () => setGuidelinesOpen(true) }} />
        )
      ) : tab === "drafts" ? (
        <div className="space-y-3">
          {shown.map((j) => (
            <div key={j.id} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white truncate">{j.title}</h3>
                  <p className="text-[12px] text-[#9a9a9a] mt-1">{[j.company, j.location].filter(Boolean).join(" • ") || "Draft"} • Edited {j.createdAt}</p>
                  <div className="mt-2.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
                    <div className="h-full rounded-full bg-[#ffd716]" style={{ width: `${j.completePercent}%` }} />
                  </div>
                  {j.missing.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-[#9a9a9a]">Missing:</span>
                      {j.missing.map((m) => (
                        <span key={m} className="rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[11px] text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">{m}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button onClick={() => setEditId(j.id)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white transition-colors"><Pencil size={13} /> Edit</button>
                  <button onClick={() => setDelId(j.id)} className="text-[12.5px] font-medium text-[#9a9a9a] hover:text-[#e5484d] transition-colors">Remove</button>
                  <button onClick={() => publish(j)} className="rounded-lg bg-[#ffd716] px-3.5 py-2 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">Publish</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((j) => (
            <div key={j.id} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white truncate">{j.title}</h3>
                    <StatusBadge tone={j.status === "closed" ? "grey" : "green"}>{j.status === "closed" ? "Closed" : "Active"}</StatusBadge>
                    {j.newApplicants > 0 && <StatusBadge tone="yellow">{j.newApplicants} new</StatusBadge>}
                  </div>
                  <p className="text-[12px] text-[#9a9a9a] mt-1">{[j.company, j.location, j.employmentType, j.workModel].filter(Boolean).join(" • ")}</p>
                  <p className="text-[12px] text-[#9a9a9a] mt-0.5">{j.salary} • Posted {j.createdAt}</p>
                </div>
                <KebabMenu
                  items={[
                    { icon: Users, label: "View Applicants", onClick: () => router.push(`/dashboard/jobs/posted/${j.id}`) },
                    { icon: Pencil, label: "Edit Job", onClick: () => setEditId(j.id) },
                    j.status === "open"
                      ? { icon: Lock, label: "Close Job", onClick: () => toggleStatus(j) }
                      : { icon: Unlock, label: "Reopen Job", onClick: () => toggleStatus(j) },
                    { icon: Copy, label: "Duplicate in drafts", onClick: () => duplicate(j) },
                    { icon: Trash2, label: "Delete Record", danger: true, onClick: () => setDelId(j.id) },
                  ]}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[13px] text-[#6b6b6b] dark:text-white/60"><Users size={15} /> {j.applicants} applicant{j.applicants === 1 ? "" : "s"}</span>
                <Link href={`/dashboard/jobs/posted/${j.id}`} className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:text-[#caa400]">Review Candidates →</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Delete job" maxWidth="max-w-md">
        <p className="text-sm text-[#6b6b6b] dark:text-white/60">Deleting this job also removes all applications to it. This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5"><GhostButton onClick={() => setDelId(null)}>Cancel</GhostButton><button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-[#e5484d] text-white text-sm font-semibold hover:bg-[#d33a3f] transition-colors flex items-center gap-1.5"><Trash2 size={15} /> Delete</button></div>
      </Modal>

      <PostingGuidelinesDrawer open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
      <JobEditDrawer open={!!editId} onClose={() => setEditId(null)} jobId={editId} />
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function PostedJobsSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-6 md:px-8 py-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="space-y-1.5"><S cls="h-7 w-40" /><S cls="h-3.5 w-56" /></div>
        <S cls="h-10 w-28 rounded-lg" />
      </div>
      <div className="flex gap-1 mb-5"><S cls="h-8 w-16 rounded-lg" /><S cls="h-8 w-16 rounded-lg" /><S cls="h-8 w-16 rounded-lg" /></div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5"><S cls="h-4 w-48" /><S cls="h-3 w-32" /></div>
              <S cls="h-6 w-16 rounded-full flex-shrink-0" />
            </div>
            <div className="mt-3 flex gap-3 flex-wrap">
              <S cls="h-3 w-24" /><S cls="h-3 w-20" /><S cls="h-3 w-28" />
            </div>
            <div className="mt-3 pt-3 border-t border-[#f5f5f5] dark:border-white/5 flex items-center justify-between">
              <S cls="h-3 w-24" /><S cls="h-8 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
