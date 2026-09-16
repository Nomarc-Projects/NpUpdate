"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, X, FileText, Link as LinkIcon, Linkedin, MessageSquare, Search } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { setApplicationStatus, type Applicant } from "@/lib/services/jobs";
import { r2Url } from "@/lib/r2-public";

const APPLICATION_STAGES = ["applied", "shortlisted", "interview", "offer", "hired", "rejected"] as const;
const STAGE_LABEL: Record<string, string> = { applied: "Applied", shortlisted: "Shortlisted", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Rejected" };
const STAGE_OPTIONS = APPLICATION_STAGES.map((s) => STAGE_LABEL[s]);
const labelToStage = (l: string) => (APPLICATION_STAGES.find((s) => STAGE_LABEL[s] === l) ?? "applied");

// The forward pipeline (rejected sits outside it).
const PIPELINE = ["applied", "shortlisted", "interview", "offer", "hired"] as const;

/** Visual hiring-progress stepper driven by the application's real status. */
function HiringProgress({ status }: { status: string }) {
  if (status === "rejected") {
    return <div className="rounded-xl bg-[#fde8e8] dark:bg-[#ef4444]/10 px-4 py-3 text-[13px] font-medium text-[#c0392b] dark:text-[#f87171]">This candidate was not moved forward.</div>;
  }
  const idx = PIPELINE.indexOf(status as typeof PIPELINE[number]);
  return (
    <div className="flex items-start gap-1.5">
      {PIPELINE.map((s, i) => {
        const done = i <= idx;
        return (
          <div key={s} className="flex-1 flex flex-col items-center gap-1.5 text-center">
            <div className={`w-full h-1.5 rounded-full ${done ? "bg-[#ffd716]" : "bg-[#ececec] dark:bg-white/10"}`} />
            <span className={`text-[10px] leading-tight ${i === idx ? "font-bold text-[#1e1e1e] dark:text-white" : "font-medium text-[#9a9a9a]"}`}>{STAGE_LABEL[s]}</span>
          </div>
        );
      })}
    </div>
  );
}

function stageTone(stage: string) {
  return {
    applied: "bg-[#eef2ff] text-[#4f46e5]", shortlisted: "bg-[#e0f2fe] text-[#0369a1]",
    interview: "bg-[#fef3c7] text-[#92400e]", offer: "bg-[#dcfce7] text-[#16803c]",
    hired: "bg-[#16803c] text-white", rejected: "bg-[#fde8e8] text-[#c0392b]",
  }[stage] ?? "bg-[#f0f0f0] text-[#6b6b6b]";
}

export function JobApplicants({ jobId, jobTitle, applicants = [] }: { jobId: string; jobTitle: string; applicants?: Applicant[] }) {
  const router = useRouter();
  const [list, setList] = useState(applicants);
  const [active, setActive] = useState<Applicant | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [, start] = useTransition();

  const q = query.trim().toLowerCase();
  const visible = list.filter((a) =>
    (filter === "all" || a.status === filter) &&
    (!q || `${a.name} ${a.headline}`.toLowerCase().includes(q)),
  );
  const countFor = (s: string) => (s === "all" ? list.length : list.filter((a) => a.status === s).length);

  const changeStatus = (id: string, label: string) => {
    const stage = labelToStage(label);
    const prev = list;
    setList((l) => l.map((a) => (a.id === id ? { ...a, status: stage } : a)));
    setActive((a) => (a && a.id === id ? { ...a, status: stage } : a));
    toast.success(`Moved to ${label}`);
    start(() => setApplicationStatus(id, stage).then(() => router.refresh()).catch((e) => { setList(prev); toast.error(e instanceof Error ? e.message : "Could not update"); }));
  };

  return (
    <div className="px-6 md:px-8 py-6">
      <Link href="/dashboard/jobs/posted" className="flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-4"><ArrowLeft size={16} /> Back to my jobs</Link>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[#1e1e1e] dark:text-white">{jobTitle}</h1>
        <p className="text-sm text-[#9a9a9a] mt-0.5">{list.length} applicant{list.length === 1 ? "" : "s"}</p>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 rounded-xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Users size={22} /></div>
          <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No applicants yet</h3>
          <p className="mt-1.5 text-[13px] text-[#9a9a9a]">Applications will appear here as professionals apply.</p>
        </div>
      ) : (
        <>
          {/* Filter tabs + search */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["all", ...APPLICATION_STAGES] as string[]).map((s) => (
                <button key={s} onClick={() => setFilter(s)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${filter === s ? "bg-[#ffd716] text-[#1e1e1e]" : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"}`}>
                  {s === "all" ? "All" : STAGE_LABEL[s]}
                  <span className={`text-[10px] ${filter === s ? "text-[#1e1e1e]/60" : "text-[#9a9a9a]"}`}>{countFor(s)}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px] max-w-[280px] ml-auto">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants" className="w-full rounded-full border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] pl-10 pr-3 py-2 text-[12.5px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-16 text-[13px] text-[#9a9a9a]">No applicants in this stage.</div>
          ) : (
          <div className="space-y-3">
          {visible.map((a) => (
            <div key={a.id} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.avatarUrl || r2Url("site/photo-1494790108377-be9c29b29330.jpg")} alt={a.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{a.name}</h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageTone(a.status)}`}>{STAGE_LABEL[a.status] ?? a.status}</span>
                  </div>
                  <p className="text-[12px] text-[#9a9a9a]">{[a.headline, a.expectedSalary && `Expects ${a.expectedSalary}`, `Applied ${a.date}`].filter(Boolean).join(" • ")}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="w-[170px]"><SelectMenu value={STAGE_LABEL[a.status]} options={STAGE_OPTIONS} onChange={(l) => changeStatus(a.id, l)} /></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setActive(a)} className="px-4 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">View application</button>
                  <button onClick={() => router.push(`/dashboard/messages?to=${a.userId}`)} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors"><MessageSquare size={14} /> Message</button>
                </div>
              </div>
            </div>
          ))}
          </div>
          )}
        </>
      )}

      {/* application slide-over */}
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 z-[80]">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActive(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="absolute right-0 top-0 h-full w-full max-w-[460px] bg-white dark:bg-[#1e1e1e] shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#ececec] dark:border-white/10">
                <h3 className="text-base font-bold text-[#1e1e1e] dark:text-white">Application</h3>
                <button onClick={() => setActive(null)} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={active.avatarUrl || r2Url("site/photo-1494790108377-be9c29b29330.jpg")} alt={active.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-bold text-[#1e1e1e] dark:text-white">{active.name}</p>
                    <p className="text-[12px] text-[#9a9a9a]">{active.headline}</p>
                    <p className="text-[11px] text-[#9a9a9a] mt-0.5">Applied {active.date}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-2.5">Hiring progress</p>
                  <HiringProgress status={active.status} />
                </div>

                {active.expectedSalary && <Detail label="Expected pay" value={active.expectedSalary} />}
                {active.coverLetter && (
                  <div>
                    <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-1.5">Cover letter</p>
                    <p className="text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60 whitespace-pre-wrap">{active.coverLetter}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {active.resumeUrl && <LinkChip icon={FileText} href={active.resumeUrl}>Résumé</LinkChip>}
                  {active.portfolioUrl && <LinkChip icon={LinkIcon} href={active.portfolioUrl}>Portfolio</LinkChip>}
                  {active.linkedinUrl && <LinkChip icon={Linkedin} href={active.linkedinUrl}>LinkedIn</LinkChip>}
                </div>
              </div>
              <div className="p-5 border-t border-[#ececec] dark:border-white/10 flex items-center gap-3">
                <div className="flex-1"><SelectMenu value={STAGE_LABEL[active.status]} options={STAGE_OPTIONS} onChange={(l) => changeStatus(active.id, l)} /></div>
                <button onClick={() => router.push(`/dashboard/messages?to=${active.userId}`)} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors"><MessageSquare size={15} /> Message</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[12px] text-[#9a9a9a]">{label}</p><p className="text-sm font-medium text-[#1e1e1e] dark:text-white">{value}</p></div>;
}
function LinkChip({ icon: Icon, href, children }: { icon: typeof FileText; href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 px-3 py-1.5 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><Icon size={14} /> {children}</a>;
}
