"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlideOverDrawer } from "@/components/dashboard/kit";
import { getOwnedJobForEdit, updateJob, type OwnedJobDetail, type JobInput } from "@/lib/services/jobs";
import { EXPERIENCE_LEVELS } from "@/lib/experience-levels";

const inputCls = "w-full rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white";
const labelCls = "mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]";
const fieldCls = "mb-3";
const btnPrimary = "rounded-lg bg-[#ffd716] px-4 py-2 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-50";
const btnGhost = "rounded-lg border border-[#e3e3e3] px-4 py-2 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5";

export function JobEditDrawer({ open, onClose, jobId }: { open: boolean; onClose: () => void; jobId: string | null }) {
  const router = useRouter();
  const [, start] = useTransition();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [requirementsList, setRequirementsList] = useState("");
  const [skills, setSkills] = useState("");
  const [benefits, setBenefits] = useState("");
  const [deadline, setDeadline] = useState("");
  const [applyMethod, setApplyMethod] = useState<"nomarc" | "url" | "email">("nomarc");
  const [applyTarget, setApplyTarget] = useState("");
  const [requireResume, setRequireResume] = useState(false);
  const [requirePortfolio, setRequirePortfolio] = useState(false);
  const [requireCoverLetter, setRequireCoverLetter] = useState(false);

  useEffect(() => {
    if (!open || !jobId) return;
    setLoaded(false);
    const close = () => onCloseRef.current();
    getOwnedJobForEdit(jobId)
      .then((d) => {
        if (!d) { toast.error("Job not found"); close(); return; }
        setTitle(d.title ?? ""); setCompany(d.company ?? ""); setLocation(d.location ?? "");
        setEmploymentType(d.employmentType ?? ""); setExperienceLevel(d.experienceLevel ?? ""); setWorkModel(d.workModel ?? "");
        setSalaryMin(d.salaryMinRaw?.toString() ?? ""); setSalaryMax(d.salaryMaxRaw?.toString() ?? "");
        setDescription(d.description ?? "");
        setRequirements(d.requirements ?? "");
        setRequirementsList((d.requirementList ?? []).join(", "));
        setSkills((d.skills ?? []).join(", ")); setBenefits((d.benefits ?? []).join(", "));
        setDeadline(d.deadline ?? "");
        setApplyMethod(d.applyMethod ?? "nomarc");
        setApplyTarget(d.applyTarget ?? "");
        setRequireResume(!!d.requireResume); setRequirePortfolio(!!d.requirePortfolio); setRequireCoverLetter(!!d.requireCoverLetter);
        setLoaded(true);
      })
      .catch(() => { toast.error("Couldn't load job"); close(); });
  }, [open, jobId]);

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  function submit() {
    if (!title.trim()) { toast.error("Job title is required"); return; }
    if (!jobId) return;
    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const payload: JobInput = {
      title, company: company || undefined, location: location || undefined, employmentType: employmentType || undefined,
      experienceLevel: experienceLevel || undefined, workModel: workModel || undefined, salaryMin: salaryMin || undefined, salaryMax: salaryMax || undefined,
      description: description || undefined, requirements: requirements || undefined,
      requirementList: split(requirementsList), skills: split(skills), benefits: split(benefits),
      deadline: deadline || undefined, applyMethod, applyTarget: applyTarget || undefined,
      requireResume, requirePortfolio, requireCoverLetter,
    };
    start(async () => {
      try {
        await updateJob(jobId, payload);
        toast.success("Job updated");
        router.refresh();
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save job");
      }
    });
  }

  return (
    <SlideOverDrawer open={open} onClose={onClose} title="Edit Job" subtitle="Update your listing details" widthClassName="w-full sm:max-w-[560px]">
      <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className={fieldCls}>
          <label className={labelCls}>Job Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Senior Structural Engineer" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Company name" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Lagos, Nigeria" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Employment Type</label>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={inputCls}>
              <option value="">Any</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Project-based">Project-based</option>
            </select>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Experience</label>
            <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className={inputCls}>
              <option value="">Any</option>
              {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Work Model</label>
            <select value={workModel} onChange={(e) => setWorkModel(e.target.value)} className={inputCls}>
              <option value="">Any</option>
              <option value="On-site">On-site</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Salary Min (₦)</label>
            <input value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className={inputCls} inputMode="numeric" placeholder="0" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Salary Max (₦)</label>
            <input value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className={inputCls} inputMode="numeric" placeholder="0" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls + " resize-y"} />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Requirements (comma-separated)</label>
          <textarea value={requirementsList} onChange={(e) => setRequirementsList(e.target.value)} rows={2} className={inputCls + " resize-y"} placeholder="B.Eng Civil Engineering, 5+ years experience, COREN certified" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={fieldCls}>
            <label className={labelCls}>Skills (comma-separated)</label>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} className={inputCls} placeholder="AutoCAD, STAAD Pro" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Benefits (comma-separated)</label>
            <input value={benefits} onChange={(e) => setBenefits(e.target.value)} className={inputCls} placeholder="Health insurance, Pension" />
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Apply Method</label>
          <div className="flex gap-2">
            {(["nomarc", "url", "email"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setApplyMethod(m)} className={"rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors " + (applyMethod === m ? "bg-[#1e1e1e] text-white dark:bg-white dark:text-[#1e1e1e]" : "bg-[#f0f0f0] text-[#6b6b6b] hover:bg-[#e5e5e5] dark:bg-white/10 dark:text-white/70")}>{m.toUpperCase()}</button>
            ))}
          </div>
          {applyMethod !== "nomarc" && (
            <input value={applyTarget} onChange={(e) => setApplyTarget(e.target.value)} className={inputCls + " mt-2"} placeholder={applyMethod === "email" ? "careers@company.com" : "https://apply-link.com"} />
          )}
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Require From Applicants</label>
          <div className="flex flex-wrap gap-4 text-[13px] text-[#4a4a4a] dark:text-white/70">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={requireResume} onChange={(e) => setRequireResume(e.target.checked)} /> Resume</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={requirePortfolio} onChange={(e) => setRequirePortfolio(e.target.checked)} /> Portfolio</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={requireCoverLetter} onChange={(e) => setRequireCoverLetter(e.target.checked)} /> Cover letter</label>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-4 mt-5 flex items-center justify-end gap-2 border-t border-[#ececec] bg-white px-5 py-3 dark:border-white/10 dark:bg-[#1e1e1e]">
          <button type="button" onClick={() => onClose()} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={!canSave || !loaded} className={btnPrimary}>Save Changes</button>
        </div>
      </form>
    </SlideOverDrawer>
  );
}
