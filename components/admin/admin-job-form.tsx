"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { SlideOverDrawer } from "@/components/dashboard/kit";
import {
  createAdminJob, updateAdminJob, getAdminUserPicker, type AdminUserOption, type AdminJobDetail,
} from "@/lib/services/admin";
import { EXPERIENCE_LEVELS } from "@/lib/experience-levels";

const inputCls = "w-full rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white";
const labelCls = "mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]";
const fieldCls = "mb-3";
const btnPrimary = "rounded-lg bg-[#ffd716] px-4 py-2 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-50";
const btnGhost = "rounded-lg border border-[#e3e3e3] px-4 py-2 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5";

export function AdminJobFormDrawer({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: AdminJobDetail | null }) {
  const router = useRouter();
  const [, start] = useTransition();
  const isEdit = !!initial;

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

  const [owner, setOwner] = useState<AdminUserOption | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<AdminUserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setUserResults([]); }, [userSearch]);

  const reset = () => {
    setTitle(""); setCompany(""); setLocation(""); setEmploymentType(""); setExperienceLevel(""); setWorkModel("");
    setSalaryMin(""); setSalaryMax(""); setDescription(""); setRequirements(""); setRequirementsList(""); setSkills(""); setBenefits("");
    setDeadline(""); setApplyMethod("nomarc"); setApplyTarget(""); setRequireResume(false); setRequirePortfolio(false); setRequireCoverLetter(false);
    setOwner(null); setUserSearch(""); setUserResults([]);
  };

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title ?? ""); setCompany(initial.company ?? ""); setLocation(initial.location ?? "");
      setEmploymentType(initial.employmentType ?? ""); setExperienceLevel(initial.experienceLevel ?? ""); setWorkModel(initial.workModel ?? "");
      setSalaryMin(initial.salaryMin?.toString() ?? ""); setSalaryMax(initial.salaryMax?.toString() ?? "");
      setDescription(initial.description ?? "");
      setRequirements(initial.requirements ?? "");
      setRequirementsList((initial.requirementsList ?? []).join(", "));
      setSkills((initial.skills ?? []).join(", ")); setBenefits((initial.benefits ?? []).join(", "));
      setDeadline(initial.deadline ?? "");
      setApplyMethod((initial.applyMethod ?? "nomarc") as "nomarc" | "url" | "email");
      setApplyTarget(initial.applyTarget ?? "");
      setRequireResume(!!initial.requireResume); setRequirePortfolio(!!initial.requirePortfolio); setRequireCoverLetter(!!initial.requireCoverLetter);
      setOwner({ id: initial.ownerUserId, name: initial.posterName, email: initial.posterEmail || null, role: null });
      setUserSearch("");
      setUserResults([]);
    } else {
      reset();
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open || userSearch.trim().length < 1 || owner) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setSearching(true);
      getAdminUserPicker(userSearch.trim())
        .then((r) => setUserResults(r))
        .catch(() => setUserResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [userSearch, open, owner]);

  const canSave = useMemo(() => !!owner && title.trim().length > 0, [owner, title]);

  function submit(publish: boolean) {
    if (!owner) { toast.error("Select an owner"); return; }
    if (!title.trim()) { toast.error("Job title is required"); return; }
    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const payload = {
      title, company: company || undefined, location: location || undefined, employmentType: employmentType || undefined,
      experienceLevel: experienceLevel || undefined, workModel: workModel || undefined, salaryMin: salaryMin || undefined, salaryMax: salaryMax || undefined,
      description: description || undefined, requirements: requirements || undefined,
      requirementList: split(requirementsList), skills: split(skills), benefits: split(benefits),
      deadline: deadline || undefined, applyMethod, applyTarget: applyTarget || undefined,
      requireResume, requirePortfolio, requireCoverLetter,
    };
    start(async () => {
      try {
        if (isEdit && initial) {
          await updateAdminJob(initial.id, owner.id, payload as Parameters<typeof updateAdminJob>[2]);
          toast.success("Job updated");
        } else {
          await createAdminJob(owner.id, payload as Parameters<typeof createAdminJob>[1], publish);
          toast.success(publish ? "Job posted" : "Draft saved");
        }
        router.refresh();
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save job");
      }
    });
  }

  return (
    <SlideOverDrawer open={open} onClose={onClose} title={isEdit ? "Edit Job" : "Post a Job"} subtitle={isEdit ? "Update this listing" : "Create a job on behalf of an owner"} widthClassName="w-full sm:max-w-[560px]">
      <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); submit(true); }}>
        <div className={fieldCls}>
          <label className={labelCls}>Owner</label>
          {owner ? (
            <div className="flex items-center justify-between rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 dark:border-white/15 dark:bg-[#1e1e1e]">
              <div>
                <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">{owner.name}</p>
                <p className="text-[11.5px] text-[#9a9a9a]">{owner.email ?? "—"} {owner.role ? `· ${owner.role}` : ""}</p>
              </div>
              <button type="button" onClick={() => { setOwner(null); setUserSearch(""); }} className="text-[12px] font-medium text-[#e5484d]">Change</button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users by name or email…" className={inputCls + " pl-8"} />
              </div>
              {searching && <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#9a9a9a]"><Loader2 size={12} className="animate-spin" /> Searching…</p>}
              {userResults.length > 0 && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#e3e3e3] bg-white dark:border-white/15 dark:bg-[#1e1e1e]">
                  {userResults.map((u) => (
                    <button key={u.id} type="button" onClick={() => setOwner(u)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#f5f5f5] dark:hover:bg-white/5">
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-[#1e1e1e] dark:text-white">{u.name}</span>
                        <span className="block truncate text-[11.5px] text-[#9a9a9a]">{u.email ?? "—"}</span>
                      </span>
                      {u.role && <span className="rounded bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#6b6b6b] dark:bg-white/10 dark:text-white/60">{u.role}</span>}
                    </button>
                  ))}
                </div>
              )}
              {userSearch.trim().length >= 1 && !searching && userResults.length === 0 && !owner && <p className="mt-1 text-[11.5px] text-[#9a9a9a]">No matching users.</p>}
            </div>
          )}
        </div>

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
          {!isEdit && (
            <button type="button" onClick={() => submit(false)} disabled={!canSave} className={btnGhost}>Save as Draft</button>
          )}
          <button type="button" onClick={() => onClose()} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={!canSave} className={btnPrimary}>{isEdit ? "Save Changes" : "Post Job"}</button>
        </div>
      </form>
    </SlideOverDrawer>
  );
}
