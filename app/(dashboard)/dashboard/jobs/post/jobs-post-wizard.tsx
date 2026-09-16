"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, MapPin, Clock, GraduationCap, Plus, X, Send } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { createJob } from "@/lib/services/jobs";
import { getAccountInfo } from "@/lib/services/account";
import { EXPERIENCE_LEVELS } from "@/lib/experience-levels";
import { cn } from "@/lib/utils";

const EMPLOYMENT = ["Full-time", "Part-time", "Contract", "Internship", "Project-based"];
const WORK_MODEL = ["On-site", "Hybrid", "Remote"];
const EXPERIENCE: readonly string[] = EXPERIENCE_LEVELS;
const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];
const COMPANY_TYPES = ["Company", "Individual"];
const APPLY_OPTS = [
  { v: "nomarc", label: "Nomarc Projects" },
  { v: "url", label: "External URL" },
  { v: "email", label: "Email" },
] as const;

const DESCRIPTION_MAX = 2500;

/** One panel of the form. The design is a single scroll of titled cards rather
 *  than a stepper, so each section is its own card with a lead-in line. */
function Section({ title, hint, optional, children }: {
  title: string; hint?: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 sm:p-5">
      <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">
        {title}
        {optional && <span className="ml-1.5 font-medium text-[#9a9a9a]">(Optional)</span>}
      </h2>
      {hint && <p className="mt-0.5 mb-4 text-[12.5px] text-[#9a9a9a]">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "appearance-none bg-no-repeat pr-9")}
      style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239a9a9a' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")", backgroundPosition: "right 12px center" }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/** Repeatable single-line rows — Requirements and Benefits in the design. */
function RowList({ items, onChange, placeholder, addLabel }: {
  items: string[]; onChange: (next: string[]) => void; placeholder: string; addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputClass}
            value={v}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {/* The last remaining row stays put — removing it would leave the
              section with no input at all and no obvious way back. */}
          <button
            type="button"
            aria-label="Remove"
            disabled={items.length === 1}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="flex-shrink-0 p-2 text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] disabled:opacity-30 disabled:hover:text-[#9a9a9a] dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
      >
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

/** Tag input — Enter or the Add button commits, chips are removable. */
function TagInput({ tags, onChange, placeholder }: {
  tags: string[]; onChange: (next: string[]) => void; placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    if (!tags.some((t) => t.toLowerCase() === v.toLowerCase())) onChange([...tags, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
        />
        <button
          type="button"
          onClick={commit}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-[#e3e3e3] px-3 py-2.5 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-[#f3e6b0] bg-[#fdf6e0] px-3 py-1.5 text-[12.5px] text-[#1e1e1e] dark:border-[#ffd716]/25 dark:bg-[#ffd716]/[0.06] dark:text-white">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))} className="text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#1e1e1e] dark:text-white">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#1e1e1e] dark:accent-[#ffd716]" />
      {label}
    </label>
  );
}

export function JobsPostWizard() {
  const router = useRouter();
  const [f, setF] = useState({
    title: "", companyType: "Company", company: "", location: "", employmentType: "Full-time",
    experienceLevel: "Intermediate (3–5 yrs)", workModel: "On-site",
    currency: "NGN", salaryMin: "", salaryMax: "",
    description: "", recruiterName: "", recruiterTitle: "", applyTarget: "",
  });
  const [requirements, setRequirements] = useState<string[]>([""]);
  const [skills, setSkills] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([""]);
  const [docs, setDocs] = useState({ resume: true, portfolio: true, coverLetter: true });
  const [applyVia, setApplyVia] = useState<(typeof APPLY_OPTS)[number]["v"]>("nomarc");
  const [deadline, setDeadline] = useState("");
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const [accountName, setAccountName] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Prefill "Individual" posting with the signed-in user's name (editable).
  useEffect(() => {
    getAccountInfo().then((d) => {
      setAccountName(d.name);
      setF((p) => (p.companyType === "Individual" && !p.company.trim() ? { ...p, company: d.name } : p));
    }).catch(() => {});
  }, []);

  function onCompanyType(v: string) {
    set("companyType", v);
    set("company", v === "Individual" ? accountName : "");
  }

  function toPreview() {
    if (!f.title.trim()) { toast.error("Role title is required"); return; }
    if (!f.description.trim()) { toast.error("Add a job description"); return; }
    setPreview(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(draft: boolean) {
    if (!f.title.trim()) { toast.error("Role title is required"); return; }
    start(async () => {
      try {
        await createJob({
          ...f,
          requirementList: requirements,
          skills,
          benefits,
          requireResume: docs.resume,
          requirePortfolio: docs.portfolio,
          requireCoverLetter: docs.coverLetter,
          deadline,
          applyMethod: applyVia,
          applyTarget: f.applyTarget,
        }, draft);
        toast.success(draft ? "Saved as draft" : "Job published!");
        // Purge the client router cache so the job board re-fetches when the
        // user navigates back to it — otherwise a prefetched (empty) payload
        // for /dashboard/jobs rides the router cache and hides the new job.
        router.refresh();
        router.push("/dashboard/jobs/posted");
      } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save job"); }
    });
  }

  const two = "grid grid-cols-1 sm:grid-cols-2 gap-4";

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 sm:px-6 lg:px-8">
      <button type="button" onClick={() => (preview ? setPreview(false) : router.push("/dashboard/jobs/posted"))} className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1e1e1e] transition-colors hover:text-[#9a9a9a] dark:text-white">
        <ArrowLeft size={15} /> {preview ? "Back to editing" : "Back to posted jobs"}
      </button>

      {preview ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#ececec] dark:border-white/10">
            <div className="bg-[#fafafa] px-5 py-4 dark:bg-white/[0.02]">
              <h3 className="text-lg font-bold text-[#1e1e1e] dark:text-white">{f.title || "Untitled role"}</h3>
              <p className="text-[13px] text-[#9a9a9a]">{[f.company, f.location].filter(Boolean).join(" • ") || "Your company"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([[MapPin, f.location || "Location"], [Briefcase, f.employmentType], [Clock, f.workModel], [GraduationCap, f.experienceLevel]] as const).map(([Ic, t], i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md border border-[#ececec] bg-white px-2 py-1 text-[12px] text-[#6b6b6b] dark:border-white/10 dark:bg-white/5 dark:text-white/60"><Ic size={12} /> {t}</span>
                ))}
              </div>
            </div>
            <div className="space-y-4 px-5 py-4 text-[13px]">
              {(f.salaryMin || f.salaryMax) && <p className="font-medium text-[#1e1e1e] dark:text-white">{f.currency} {f.salaryMin || "—"} – {f.salaryMax || "—"} / month</p>}
              <div>
                <p className="mb-1 font-semibold text-[#1e1e1e] dark:text-white">Job Description</p>
                <p className="whitespace-pre-wrap text-[#6b6b6b] dark:text-white/60">{f.description || "No description added."}</p>
              </div>
              {requirements.some((r) => r.trim()) && (
                <div>
                  <p className="mb-1 font-semibold text-[#1e1e1e] dark:text-white">Requirements</p>
                  <ul className="space-y-1">{requirements.filter((r) => r.trim()).map((r) => <li key={r} className="flex gap-2 text-[#6b6b6b] dark:text-white/60"><span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" />{r}</li>)}</ul>
                </div>
              )}
              {skills.length > 0 && (
                <div>
                  <p className="mb-1.5 font-semibold text-[#1e1e1e] dark:text-white">Skills &amp; Tools</p>
                  <div className="flex flex-wrap gap-2">{skills.map((s) => <span key={s} className="rounded-full border border-[#f3e6b0] bg-[#fdf6e0] px-3 py-1 text-[12px] dark:border-[#ffd716]/25 dark:bg-[#ffd716]/[0.06] dark:text-white">{s}</span>)}</div>
                </div>
              )}
              {benefits.some((b) => b.trim()) && (
                <div>
                  <p className="mb-1 font-semibold text-[#1e1e1e] dark:text-white">Benefits &amp; Perks</p>
                  <ul className="space-y-1">{benefits.filter((b) => b.trim()).map((b) => <li key={b} className="flex gap-2 text-[#6b6b6b] dark:text-white/60"><span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" />{b}</li>)}</ul>
                </div>
              )}
              <p className="border-t border-[#f0f0f0] pt-3 text-[12px] text-[#9a9a9a] dark:border-white/10">
                Apply via <span className="font-medium text-[#1e1e1e] dark:text-white">{APPLY_OPTS.find((o) => o.v === applyVia)?.label}</span>{deadline && ` • closes ${deadline}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <button type="button" onClick={() => setPreview(false)} className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white">Back</button>
            <button type="button" disabled={pending} onClick={() => submit(true)} className="rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-medium text-[#1e1e1e] transition-colors hover:bg-[#f7f7f7] dark:border-white/15 dark:text-white dark:hover:bg-white/5">Save as draft</button>
            <button type="button" disabled={pending} onClick={() => submit(false)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-60">
              <Send size={15} /> {pending ? "Publishing…" : "Publish job"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Section title="Role basics" hint="The headline information candidates see first.">
            <div className={two}>
              <Field label="Role title"><input className={inputClass} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g Senior Architect" /></Field>
              <Field label="Work model"><Select value={f.workModel} onChange={(v) => set("workModel", v)} options={WORK_MODEL} /></Field>
              <Field label="Posting as">
                <Select value={f.companyType} onChange={onCompanyType} options={COMPANY_TYPES} />
              </Field>
              <Field label={f.companyType === "Company" ? "Company name" : "Your name"}>
                <input className={inputClass} value={f.company} onChange={(e) => set("company", e.target.value)} placeholder={f.companyType === "Company" ? "e.g UrbanGrid Studios" : "e.g. John Adeyemi"} />
              </Field>
              <Field label="Location"><input className={inputClass} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="City, State, Country" /></Field>
              <Field label="Employment type"><Select value={f.employmentType} onChange={(v) => set("employmentType", v)} options={EMPLOYMENT} /></Field>
              <Field label="Experience level"><Select value={f.experienceLevel} onChange={(v) => set("experienceLevel", v)} options={EXPERIENCE} /></Field>
            </div>
          </Section>

          <Section title="Compensation" hint="Setting a range helps you receive 2x more qualified applicants.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Currency"><Select value={f.currency} onChange={(v) => set("currency", v)} options={CURRENCIES} /></Field>
              <Field label="Min /month"><input className={inputClass} value={f.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} placeholder="e.g 600,000.00" inputMode="numeric" /></Field>
              <Field label="Max /month"><input className={inputClass} value={f.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} placeholder="e.g 900,000.00" inputMode="numeric" /></Field>
            </div>
          </Section>

          <Section title="Job Description" hint="Describe responsibilities, the team, and what success looks like.">
            <p className="mb-1.5 text-right text-[11.5px] text-[#9a9a9a]">{f.description.length}/{DESCRIPTION_MAX.toLocaleString()}</p>
            <textarea
              rows={6}
              maxLength={DESCRIPTION_MAX}
              className={cn(inputClass, "resize-none")}
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Lead the spatial planning and technical design for …"
            />
          </Section>

          <Section title="Requirements" hint="List the qualifications you expect candidates to meet.">
            <RowList items={requirements} onChange={setRequirements} placeholder="e.g 7+ years of experience" addLabel="Add requirement" />
          </Section>

          <Section title="Skills & tools" hint="Press Enter to add. These power matching to the right professionals.">
            <TagInput tags={skills} onChange={setSkills} placeholder="e.g Revit" />
          </Section>

          <Section title="Benefits & Perks" optional hint="List any additional benefits, allowances, or perks.">
            <RowList items={benefits} onChange={setBenefits} placeholder="e.g Comprehensive HMO" addLabel="Add benefit" />
          </Section>

          <Section title="Requested Documents" hint="Select the fields candidates must fill out when applying.">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <CheckRow checked={docs.resume} onChange={(v) => setDocs((d) => ({ ...d, resume: v }))} label="Require Resume / CV" />
              <CheckRow checked={docs.portfolio} onChange={(v) => setDocs((d) => ({ ...d, portfolio: v }))} label="Require Portfolio URL" />
              <CheckRow checked={docs.coverLetter} onChange={(v) => setDocs((d) => ({ ...d, coverLetter: v }))} label="Require Cover Letter" />
            </div>
          </Section>

          <Section title="Application settings" hint="Control how candidates apply and when the listing closes.">
            <div className={two}>
              <Field label="Application deadline"><DatePicker value={deadline} onChange={setDeadline} placeholder="dd / mm / yy" /></Field>
              <Field label="Apply via">
                <Select
                  value={APPLY_OPTS.find((o) => o.v === applyVia)?.label ?? ""}
                  onChange={(label) => setApplyVia(APPLY_OPTS.find((o) => o.label === label)?.v ?? "nomarc")}
                  options={APPLY_OPTS.map((o) => o.label)}
                />
              </Field>
              {applyVia !== "nomarc" && (
                <Field label={applyVia === "url" ? "Application URL" : "Receiving email address"}>
                  <input className={inputClass} value={f.applyTarget} onChange={(e) => set("applyTarget", e.target.value)} placeholder={applyVia === "url" ? "https://…" : "jobs@company.com"} />
                </Field>
              )}
              <Field label="Recruiter name"><input className={inputClass} value={f.recruiterName} onChange={(e) => set("recruiterName", e.target.value)} placeholder="e.g Tunde Bakare" /></Field>
              <Field label="Recruiter title"><input className={inputClass} value={f.recruiterTitle} onChange={(e) => set("recruiterTitle", e.target.value)} placeholder="e.g Talent lead" /></Field>
            </div>
          </Section>

          <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <button type="button" onClick={() => router.push("/dashboard/jobs/posted")} className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white">Cancel</button>
            <button type="button" disabled={pending} onClick={() => submit(true)} className="rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-medium text-[#1e1e1e] transition-colors hover:bg-[#f7f7f7] dark:border-white/15 dark:text-white dark:hover:bg-white/5">Save as draft</button>
            <button type="button" onClick={toPreview} className="rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">Continue to Preview</button>
          </div>
        </div>
      )}
    </div>
  );
}
