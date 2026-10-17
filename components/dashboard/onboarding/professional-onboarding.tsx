"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ArrowRight, Plus, Briefcase, GraduationCap, Award, Check } from "lucide-react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { Logo } from "@/components/ui/logo";
import { completeProfessionalOnboarding } from "@/lib/services/profile";
import { cn } from "@/lib/utils";
import { WizardFooter, CancelSetupDialog, yellowBtn, ghostBtn } from "./wizard-chrome";
import { lgasFor } from "@/lib/data/nigeria-lga";
import { COUNTRIES, statesFor } from "@/lib/data/countries";

const AVAIL_OPTIONS = [
  { label: "Open to work", value: "open_to_work" },
  { label: "Not right now", value: "none" },
];

const PROFESSIONS = [
  "Architect",
  "Architectural Designer",
  "Contractor",
  "Architectural Technologist / Technician",
  "Landscape Architect",
  "Urban / Town Planner",
  "Interior Designer",
  "Civil Engineer",
  "Structural Engineer",
  "Building Services Engineer (MEP)",
  "Geotechnical Engineer",
  "Environmental / Sustainability Engineer",
  "Fire Safety Engineer",
  "Acoustic Engineer",
  "Coastal / Hydraulic Engineer",
  "Quantity Surveyor",
  "Land / Geomatics Surveyor",
  "Building Surveyor",
  "Valuation / Estate Surveyor",
  "Hydrographic Surveyor",
  "Professional Builder / Construction Manager",
  "Construction Project Manager",
  "Building Control Officer / Inspector",
  "Health & Safety Manager (HSE)",
  "BIM (Building Information Modeling) Manager / Coordinator",
  "Facility Manager",
  "Real Estate Developer",
  "Other",
];

const OTHER_PROFESSION = "Other";

const PRACTICE_STATUS_OPTIONS = [
  { label: "Intern", value: "intern" },
  { label: "Graduate / Freelancer", value: "graduate" },
  { label: "Consultant", value: "consultant" },
  { label: "Licensed", value: "licensed" },
  { label: "Registered", value: "registered" },
  { label: "Company", value: "company" },
];

// SelectMenu deals in plain labels; map them back to the DB values on submit.
const AVAIL_TO_DB = Object.fromEntries(AVAIL_OPTIONS.map((o) => [o.label, o.value]));
const PRACTICE_STATUS_TO_DB = Object.fromEntries(PRACTICE_STATUS_OPTIONS.map((o) => [o.label, o.value]));

const SECTION_CARD = "rounded-2xl border border-[#ececec] bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1e1e]";
const SECTION_TITLE = "text-[12px] font-bold uppercase tracking-[0.08em] text-[#9a9a9a]";
const ROW = "rounded-xl border border-[#ececec] bg-[#fafafa] px-4 py-3 text-[13px] text-[#1e1e1e] dark:border-white/10 dark:bg-white/[0.02] dark:text-white";

const YEAR_OPTIONS = Array.from({ length: 70 }, (_, i) => String(new Date().getFullYear() - i));

export function ProfessionalOnboarding({ title, description, savedLocation = "" }: { title: string; description: string; savedLocation?: string }) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);

  // Intro
  const [availability, setAvailability] = useState("");

  // Profession (job title)
  const [headline, setHeadline] = useState("");
  const [customHeadline, setCustomHeadline] = useState("");
  const finalHeadline = headline === OTHER_PROFESSION ? customHeadline.trim() : headline.trim();

  // Qualification — skills + certifications
  const [skill, setSkill] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [practiceLicenceStatus, setPracticeLicenceStatus] = useState("");
  const isLicensedOrRegistered = ["licensed", "registered"].includes(PRACTICE_STATUS_TO_DB[practiceLicenceStatus] ?? "");
  const isPracticeCompany = (PRACTICE_STATUS_TO_DB[practiceLicenceStatus] ?? practiceLicenceStatus) === "company";
  const [licenseNumber, setLicenseNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [practiceCompanyName, setPracticeCompanyName] = useState("");
  const [practiceRegNumber, setPracticeRegNumber] = useState("");
  const [practiceCompanyAddress, setPracticeCompanyAddress] = useState("");
  const [certs, setCerts] = useState<{ name: string; issuer: string; year: string }[]>([]);
  const [cert, setCert] = useState({ name: "", issuer: "", year: "" });

  // Work experience
  const [experience, setExperience] = useState<{ title: string; company: string; startDate: string; endDate: string; current: boolean }[]>([]);
  const [exp, setExp] = useState({ title: "", company: "", startDate: "", endDate: "", current: false });

  // Education
  const [education, setEducation] = useState<{ school: string; degree: string; field: string; startYear: string; endYear: string; current: boolean }[]>([]);
  const [edu, setEdu] = useState({ school: "", degree: "", field: "", startYear: "", endYear: "", current: false });

  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [lga, setLga] = useState("");
  const [bio, setBio] = useState("");
  const [pending, setPending] = useState(false);

  // Field-level validation. On submit we flag every missing required field at
  // once (red border + summary banner) instead of stopping at the first toast.
  const [errors, setErrors] = useState<Record<string, string>>({});
  function clearError(key: string) {
    setErrors((p) => {
      if (!(key in p)) return p;
      const next = { ...p };
      delete next[key];
      return next;
    });
  }
  /** inputClass, with an error border once submit has flagged this field. */
  const fieldClass = (key: string) =>
    cn(inputClass, errors[key] && "border-[#e5484d] focus:border-[#e5484d]");

  // Location is already collected on the basic profile ("Country / State / LGA /
  // Address" on the profile update form) — reuse it here instead of asking for
  // it again. Only show the Location section when nothing has been saved yet.
  const hasLocation = savedLocation.trim().length > 0;
  const location = hasLocation ? savedLocation.trim() : [address.trim(), lga.trim(), stateName.trim(), country.trim()].filter(Boolean).join(", ");

  function requestClose() {
    setCancelOpen(true);
  }

  function addSkill() {
    const s = skill.trim();
    if (!s) return;
    if (skills.includes(s)) { setSkill(""); return; }
    setSkills((p) => [...p, s]);
    setSkill("");
    clearError("skills");
  }

  function addCert() {
    if (!cert.name.trim()) { toast.error("Enter the certification name."); return; }
    if (!cert.issuer.trim()) { toast.error("Enter the certification issuer."); return; }
    if (!cert.year) { toast.error("Select the certification year."); return; }
    setCerts((p) => [...p, { name: cert.name.trim(), issuer: cert.issuer.trim(), year: cert.year }]);
    setCert({ name: "", issuer: "", year: "" });
    clearError("certs");
  }

  /** True when the Work Experience draft has any user input (so submit can
   *  auto-register it instead of silently discarding it). */
  function expDraftStarted() {
    return Boolean(exp.title.trim() || exp.company.trim() || exp.startDate || exp.endDate || exp.current);
  }

  /** Validate the draft and return the cleaned entry, or null. `silent` skips
   *  the toast so submit can collect it into the all-at-once error summary. */
  function prepareExp(silent = false) {
    const fail = (msg: string) => { if (!silent) toast.error(msg); return null; };
    if (!exp.title.trim()) return fail("Role is required.");
    if (!exp.startDate) return fail("Select the start year.");
    if (!exp.current && !exp.endDate) return fail("Select the end year (or tick 'Currently work here').");
    return { ...exp, title: exp.title.trim(), company: exp.company.trim() };
  }

  function addExp() {
    const entry = prepareExp();
    if (!entry) return;
    setExperience((p) => [...p, entry]);
    setExp({ title: "", company: "", startDate: "", endDate: "", current: false });
  }

  /** See expDraftStarted / prepareExp — same idea for Education. */
  function eduDraftStarted() {
    return Boolean(edu.school.trim() || edu.degree.trim() || edu.field.trim() || edu.startYear || edu.endYear || edu.current);
  }

  function prepareEdu(silent = false) {
    const fail = (msg: string) => { if (!silent) toast.error(msg); return null; };
    if (!edu.school.trim()) return fail("School is required.");
    if (!edu.degree.trim()) return fail("Enter a degree / qualification.");
    if (!edu.field.trim()) return fail("Enter a field of study.");
    if (!edu.startYear) return fail("Select the start year.");
    if (!edu.current && !edu.endYear) return fail("Select the end year (or tick 'Currently study here').");
    return { ...edu, school: edu.school.trim(), degree: edu.degree.trim(), field: edu.field.trim() };
  }

  function addEdu() {
    const entry = prepareEdu();
    if (!entry) return;
    setEducation((p) => [...p, entry]);
    setEdu({ school: "", degree: "", field: "", startYear: "", endYear: "", current: false });
  }

  async function submit() {
    // Auto-register a filled-in Work Experience / Education draft so users who
    // type into the fields (without clicking "+ Add") don't lose the entry.
    let allExperience = experience;
    if (expDraftStarted()) {
      const entry = prepareExp(true);
      if (entry) {
        allExperience = [...experience, entry];
        setExperience(allExperience);
        setExp({ title: "", company: "", startDate: "", endDate: "", current: false });
      }
    }
    let allEducation = education;
    if (eduDraftStarted()) {
      const entry = prepareEdu(true);
      if (entry) {
        allEducation = [...education, entry];
        setEducation(allEducation);
        setEdu({ school: "", degree: "", field: "", startYear: "", endYear: "", current: false });
      }
    }

    // Fold a half-typed skill into the list too.
    let allSkills = skills;
    const pendingSkill = skill.trim();
    if (pendingSkill && !skills.includes(pendingSkill)) {
      allSkills = [...skills, pendingSkill];
      setSkills(allSkills);
      setSkill("");
    }

    // Collect every missing required field in one pass so the user sees the
    // full list at once rather than fixing them one toast at a time.
    const dbStatus = PRACTICE_STATUS_TO_DB[practiceLicenceStatus] ?? practiceLicenceStatus;
    const found: Record<string, string> = {};
    if (!finalHeadline) found.headline = "Job title";
    if (!availability) found.availability = "Open to work";
    if (!practiceLicenceStatus) found.practiceStatus = "Professional practice status";
    if (dbStatus === "licensed" && !licenseNumber.trim()) found.licenseNumber = "Licence number";
    if (dbStatus === "registered" && !registrationNumber.trim()) found.registrationNumber = "Registration number";
    if (dbStatus === "company") {
      if (!practiceCompanyName.trim()) found.practiceCompanyName = "Company name";
      if (!practiceRegNumber.trim()) found.practiceRegNumber = "Company registration number";
      if (!practiceCompanyAddress.trim()) found.practiceCompanyAddress = "Company address";
    }
    if (allSkills.length === 0) found.skills = "Skills";
    if (isLicensedOrRegistered && certs.length === 0) found.certs = "Certifications";
    if (!isPracticeCompany && allExperience.length === 0) found.exp = "Work experience";
    if (isPracticeCompany && allEducation.length === 0) found.edu = "Education";
    if (!isPracticeCompany && !bio.trim()) found.bio = "Short bio";
    if (!hasLocation) {
      if (!country) found.country = "Country";
      if (!stateName) found.state = "State / Region";
      if (!address.trim()) found.address = "Address";
    }

    if (Object.keys(found).length > 0) {
      setErrors(found);
      const n = Object.keys(found).length;
      toast.error(`Please complete ${n} highlighted field${n > 1 ? "s" : ""}.`);
      return;
    }
    setErrors({});

    setPending(true);
    try {
      await completeProfessionalOnboarding({
        headline: finalHeadline,
        bio,
        location,
        availability: AVAIL_TO_DB[availability] ?? availability,
        practiceLicenceStatus: PRACTICE_STATUS_TO_DB[practiceLicenceStatus] ?? practiceLicenceStatus,
        licenseNumber,
        registrationNumber,
        practiceCompanyName,
        practiceRegNumber,
        practiceCompanyAddress,
        skills: allSkills,
        certifications: certs.map((c) => ({ name: c.name, issuer: c.issuer, year: c.year ? Number(c.year) : undefined })),
        experience: allExperience.map((x) => ({ title: x.title, company: x.company, startDate: x.startDate, endDate: x.current ? undefined : x.endDate, current: x.current })),
        education: allEducation.map((e) => ({ school: e.school, degree: e.degree || undefined, field: e.field || undefined, startYear: e.startYear ? Number(e.startYear) : undefined, endYear: e.current ? undefined : e.endYear ? Number(e.endYear) : undefined, current: e.current })),
      });
      toast.success("You're all set — welcome to the professional track!");
      router.push("/dashboard/jobs");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="min-h-full bg-[#f4f4f4] px-3 py-4 dark:bg-[#161616] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="px-6 pt-6 sm:px-10 sm:pt-9">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-5 dark:border-white/10">
            <Logo size="sm" tone="auto" />
            <button onClick={requestClose} aria-label="Close" className="text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"><X size={20} /></button>
          </div>

          <div className="border-b border-[#f0f0f0] py-7 dark:border-white/10">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1e1e1e] dark:text-white">{title}</h1>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/55">{description}</p>
            <p className="mx-auto mt-2 max-w-md text-[12px] font-medium text-[#caa400] dark:text-[#ffd716]">All fields are required unless marked optional.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5 py-6">
            {Object.keys(errors).length > 0 && (
              <div className="rounded-xl border border-[#e5484d]/40 bg-[#fdecec] px-4 py-3 dark:border-[#e5484d]/30 dark:bg-[#e5484d]/10">
                <p className="text-[13px] font-semibold text-[#c0272d] dark:text-[#ff8a8f]">
                  Please complete {Object.keys(errors).length} required field{Object.keys(errors).length > 1 ? "s" : ""}:
                </p>
                <p className="mt-1 text-[12.5px] text-[#c0272d]/90 dark:text-[#ff8a8f]/80">
                  {Object.values(errors).join(" · ")}
                </p>
              </div>
            )}
            {/* ── Intro ───────────────────────────────────────────── */}
            <section className={SECTION_CARD}>
              <h2 className={SECTION_TITLE}>Intro</h2>
              <div className="mt-4 space-y-4">
                <Field label="Are you open to work?" required hint="Employers and clients can then find out you're available — you can change this later on your profile.">
                  <SelectMenu placeholder="Select an option" value={availability} onChange={(v) => { setAvailability(v); clearError("availability"); }} options={AVAIL_OPTIONS.map((o) => o.label)} invalid={!!errors.availability} />
                </Field>
              </div>
            </section>

            {/* ── Professional Profile ────────────────────────────── */}
            <section className={SECTION_CARD}>
              <h2 className={SECTION_TITLE}>Professional Profile</h2>

              {/* Profession */}
              <div className="mt-4 border-b border-[#f0f0f0] pb-5 dark:border-white/10">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1e1e1e] dark:text-white"><Briefcase size={15} className="text-[#9a9a9a]" /> Profession</h3>
                <div className="mt-3">
                  <Field label="Job title / headline" required>
                    <SelectMenu
                      placeholder="Select your profession"
                      value={headline}
                      onChange={(v) => { setHeadline(v); clearError("headline"); }}
                      options={PROFESSIONS}
                      invalid={!!errors.headline}
                    />
                  </Field>
                  {headline === OTHER_PROFESSION && (
                    <div className="mt-3">
                      <Field label="Enter your job title" required>
                        <input className={fieldClass("headline")} value={customHeadline} onChange={(e) => { setCustomHeadline(e.target.value); clearError("headline"); }} placeholder="e.g. Project Architect" />
                      </Field>
                    </div>
                  )}
                </div>
              </div>

              {/* Qualification */}
              <div className="mt-5 border-b border-[#f0f0f0] pb-5 dark:border-white/10">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1e1e1e] dark:text-white"><Award size={15} className="text-[#9a9a9a]" /> Qualification</h3>

                <div className="mt-3 max-w-sm">
                  <Field label="Professional practice status" required>
                    <SelectMenu placeholder="Select status" value={practiceLicenceStatus} onChange={(v) => { setPracticeLicenceStatus(v); clearError("practiceStatus"); }} options={PRACTICE_STATUS_OPTIONS.map((o) => o.label)} invalid={!!errors.practiceStatus} />
                  </Field>
                  {PRACTICE_STATUS_TO_DB[practiceLicenceStatus] === "licensed" && (
                    <div className="mt-3">
                      <Field label="Licence number" required>
                        <input className={fieldClass("licenseNumber")} value={licenseNumber} onChange={(e) => { setLicenseNumber(e.target.value); clearError("licenseNumber"); }} placeholder="e.g. COREN/XXXXX/12345" />
                      </Field>
                    </div>
                  )}
                  {PRACTICE_STATUS_TO_DB[practiceLicenceStatus] === "registered" && (
                    <div className="mt-3">
                      <Field label="Registration number" required>
                        <input className={fieldClass("registrationNumber")} value={registrationNumber} onChange={(e) => { setRegistrationNumber(e.target.value); clearError("registrationNumber"); }} placeholder="e.g. ARCON/REG/004512" />
                      </Field>
                    </div>
                  )}
                  {PRACTICE_STATUS_TO_DB[practiceLicenceStatus] === "company" && (
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <Field label="Company name" required>
                        <input className={fieldClass("practiceCompanyName")} value={practiceCompanyName} onChange={(e) => { setPracticeCompanyName(e.target.value); clearError("practiceCompanyName"); }} placeholder="e.g. Arcade Builds Ltd" />
                      </Field>
                      <Field label="Registration number" required>
                        <input className={fieldClass("practiceRegNumber")} value={practiceRegNumber} onChange={(e) => { setPracticeRegNumber(e.target.value); clearError("practiceRegNumber"); }} placeholder="e.g. RAC/004512" />
                      </Field>
                      <Field label="Company address" required>
                        <input className={fieldClass("practiceCompanyAddress")} value={practiceCompanyAddress} onChange={(e) => { setPracticeCompanyAddress(e.target.value); clearError("practiceCompanyAddress"); }} placeholder="e.g. 12 Allen Avenue, Ikeja" />
                      </Field>
                    </div>
                  )}
                </div>

                <p className="mt-4 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white">Skills <span className="text-[#e5484d]">*</span></p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-[#f3d34d] bg-[#fffae6] px-3 py-1 text-[12.5px] text-[#1e1e1e] dark:border-[#ffd716]/40 dark:bg-[#ffd716]/10 dark:text-white/90">
                      {s}
                      <button type="button" onClick={() => setSkills((p) => p.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="text-[#9a9a9a] hover:text-[#e5484d]"><X size={12} /></button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      className={cn(fieldClass("skills"), "w-44")}
                      placeholder="Add a skill + Enter"
                      value={skill}
                      onChange={(e) => setSkill(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    />
                    <button type="button" onClick={addSkill} className="rounded-lg border border-[#e3e3e3] px-2.5 py-2 text-[#6b6b6b] transition-colors hover:border-[#ffd716] hover:text-[#1e1e1e] dark:border-white/15 dark:text-white/70 dark:hover:text-white"><Plus size={14} /></button>
                  </div>
                </div>

                {isLicensedOrRegistered && (
                  <p className="mt-4 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white">Certifications / Licenses <span className="text-[#e5484d]">*</span></p>
                )}
                {isLicensedOrRegistered && certs.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {certs.map((c, i) => (
                      <li key={i} className={cn(ROW, "flex items-center justify-between gap-2")}>
                        <span className="truncate"><span className="font-semibold">{c.name}</span>{c.issuer ? ` · ${c.issuer}` : ""}</span>
                        <button type="button" onClick={() => setCerts((p) => p.filter((_, j) => j !== i))} aria-label="Remove certification" className="flex-shrink-0 text-[#9a9a9a] hover:text-[#e5484d]"><X size={13} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                {isLicensedOrRegistered && (
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input className={inputClass} placeholder="e.g. COREN Registered Engineer" value={cert.name} onChange={(e) => setCert((p) => ({ ...p, name: e.target.value }))} />
                    <input className={inputClass} placeholder="Issuer" value={cert.issuer} onChange={(e) => setCert((p) => ({ ...p, issuer: e.target.value }))} />
                    <SelectMenu placeholder="Year" value={cert.year} onChange={(v) => setCert((p) => ({ ...p, year: v }))} options={YEAR_OPTIONS} />
                  </div>
                )}
                {isLicensedOrRegistered && (
                  <button type="button" onClick={addCert} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#caa400] hover:underline"><Plus size={14} /> Add</button>
                )}
              </div>

              {/* Work experience */}
              <div className="mt-5 border-b border-[#f0f0f0] pb-5 dark:border-white/10">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1e1e1e] dark:text-white"><Briefcase size={15} className="text-[#9a9a9a]" /> Work experience {isPracticeCompany ? <span className="text-[11px] font-medium text-[#9a9a9a]">(Optional)</span> : <span className="text-[#e5484d]">*</span>}</h3>
                {experience.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {experience.map((x, i) => (
                      <li key={i} className={cn(ROW, "flex items-center justify-between gap-2")}>
                        <span className="truncate">
                          <span className="font-semibold">{x.title}</span>{x.company ? ` · ${x.company}` : ""}
                          <span className="text-[#9a9a9a]">{x.startDate || x.endDate ? ` — ${[x.startDate, x.current ? "Present" : x.endDate].filter(Boolean).join(" – ")}` : ""}</span>
                        </span>
                        <button type="button" onClick={() => setExperience((p) => p.filter((_, j) => j !== i))} aria-label="Remove role" className="flex-shrink-0 text-[#9a9a9a] hover:text-[#e5484d]"><X size={13} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className={fieldClass("exp")} placeholder={isPracticeCompany ? "Role / title" : "Role / title *"} value={exp.title} onChange={(e) => { setExp((p) => ({ ...p, title: e.target.value })); clearError("exp"); }} />
                  <input className={inputClass} placeholder="Company (optional)" value={exp.company} onChange={(e) => setExp((p) => ({ ...p, company: e.target.value }))} />
                  <SelectMenu placeholder="Start" value={exp.startDate} onChange={(v) => { setExp((p) => ({ ...p, startDate: v })); clearError("exp"); }} options={YEAR_OPTIONS} invalid={!!errors.exp} />
                  {!exp.current ? (
                    <SelectMenu placeholder="End" value={exp.endDate} onChange={(v) => { setExp((p) => ({ ...p, endDate: v })); clearError("exp"); }} options={YEAR_OPTIONS} invalid={!!errors.exp} />
                  ) : (
                    <div className="flex items-center justify-center rounded-lg border border-[#e7efea] bg-[#f2faf4] px-3 text-[12.5px] font-medium text-[#1a7f43] dark:border-[#1a7f43]/20 dark:bg-[#1a7f43]/10 dark:text-[#4ade80]">Present</div>
                  )}
                </div>
                <label className="mt-2 flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60">
                  <input type="checkbox" checked={exp.current} onChange={(e) => { setExp((p) => ({ ...p, current: e.target.checked, endDate: "" })); clearError("exp"); }} className="h-4 w-4 accent-[#ffd716]" />
                  I currently work here
                </label>
                <button type="button" onClick={addExp} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#caa400] hover:underline"><Plus size={14} /> Add</button>
              </div>

              {/* Education */}
              <div className="mt-5">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1e1e1e] dark:text-white"><GraduationCap size={15} className="text-[#9a9a9a]" /> Education {isPracticeCompany ? <span className="text-[#e5484d]">*</span> : <span className="text-[11px] font-medium text-[#9a9a9a]">(Optional)</span>}</h3>
                {education.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {education.map((v, i) => (
                      <li key={i} className={cn(ROW, "flex items-center justify-between gap-2")}>
                        <span className="truncate">
                          <span className="font-semibold">{v.school}</span>
                          {v.degree ? ` · ${v.degree}` : ""}
                          {v.startYear || v.endYear ? ` — ${[v.startYear, v.current ? "Present" : v.endYear].filter(Boolean).join(" – ")}` : ""}
                        </span>
                        <button type="button" onClick={() => setEducation((p) => p.filter((_, j) => j !== i))} aria-label="Remove education" className="flex-shrink-0 text-[#9a9a9a] hover:text-[#e5484d]"><X size={13} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className={fieldClass("edu")} placeholder={isPracticeCompany ? "School *" : "School"} value={edu.school} onChange={(e) => { setEdu((p) => ({ ...p, school: e.target.value })); clearError("edu"); }} />
                  <input className={fieldClass("edu")} placeholder="Degree / qualification" value={edu.degree} onChange={(e) => { setEdu((p) => ({ ...p, degree: e.target.value })); clearError("edu"); }} />
                  <input className={fieldClass("edu")} placeholder="Field of study" value={edu.field} onChange={(e) => { setEdu((p) => ({ ...p, field: e.target.value })); clearError("edu"); }} />
                  <div className="grid grid-cols-2 gap-3">
                    <SelectMenu placeholder="Start year" value={edu.startYear} onChange={(v) => { setEdu((p) => ({ ...p, startYear: v })); clearError("edu"); }} options={YEAR_OPTIONS} invalid={!!errors.edu} />
                    {!edu.current ? (
                      <SelectMenu placeholder="End year" value={edu.endYear} onChange={(v) => { setEdu((p) => ({ ...p, endYear: v })); clearError("edu"); }} options={YEAR_OPTIONS} invalid={!!errors.edu} />
                    ) : (
                      <div className="flex items-center justify-center rounded-lg border border-[#e7efea] bg-[#f2faf4] px-3 text-[12.5px] font-medium text-[#1a7f43] dark:border-[#1a7f43]/20 dark:bg-[#1a7f43]/10 dark:text-[#4ade80]"><Check size={13} className="mr-1" /> Present</div>
                    )}
                  </div>
                </div>
                <label className="mt-2 flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60">
                  <input type="checkbox" checked={edu.current} onChange={(e) => { setEdu((p) => ({ ...p, current: e.target.checked, endYear: "" })); clearError("edu"); }} className="h-4 w-4 accent-[#ffd716]" />
                  I currently study here
                </label>
                <button type="button" onClick={addEdu} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#caa400] hover:underline"><Plus size={14} /> Add</button>
              </div>
            </section>

            {/* ── About ───────────────────────────────────────────── */}
            <section className={SECTION_CARD}>
              <h2 className={SECTION_TITLE}>About</h2>
              <div className="mt-4">
                <Field label="Short bio" hint={isPracticeCompany ? "Optional" : undefined} required={!isPracticeCompany}>
                  <textarea rows={4} maxLength={280} className={fieldClass("bio")} value={bio} onChange={(e) => { setBio(e.target.value); clearError("bio"); }} placeholder="A couple of lines about your experience…" />
                </Field>
              </div>
            </section>

            {/* ── Location (only when nothing saved on the basic profile) ── */}
            {!hasLocation && (
              <section className={SECTION_CARD}>
                <h2 className={SECTION_TITLE}>Location</h2>
                <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                  <Field label="Country" required>
                    <SelectMenu
                      placeholder="Select country"
                      value={country}
                      onChange={(v) => { setCountry(v); setStateName(""); setLga(""); clearError("country"); }}
                      options={COUNTRIES}
                      invalid={!!errors.country}
                    />
                  </Field>
                  <Field label="State / Region" required>
                    <SelectMenu
                      placeholder={country ? "Select state" : "Select country first"}
                      value={stateName}
                      onChange={(v) => { setStateName(v); setLga((cur) => (lgasFor(v).includes(cur) ? cur : "")); clearError("state"); }}
                      options={country ? statesFor(country) : []}
                      invalid={!!errors.state}
                    />
                  </Field>
                  {country && country.toLowerCase() === "nigeria" ? (
                    <Field label="Local Government Area" hint={stateName ? undefined : "Select a state first"}>
                      <SelectMenu
                        placeholder={stateName ? "Select LGA" : "Select a state first"}
                        value={lga}
                        onChange={setLga}
                        options={lgasFor(stateName)}
                      />
                    </Field>
                  ) : null}
                  <Field label="Address" required>
                    <input className={fieldClass("address")} value={address} onChange={(e) => { setAddress(e.target.value); clearError("address"); }} placeholder="e.g. 12 Allen Avenue" />
                  </Field>
                </div>
              </section>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button type="button" onClick={requestClose} className={cn(ghostBtn, "flex-1 sm:flex-none")}>Cancel</button>
              <button type="submit" disabled={pending} className={cn(yellowBtn, "flex-1 sm:flex-none sm:px-7")}>
                {pending ? <Loader2 size={15} className="animate-spin" /> : <><ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /> Save &amp; browse jobs</>}
              </button>
            </div>
          </form>
        </div>

        <WizardFooter />
      </div>

      <CancelSetupDialog
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => { setCancelOpen(false); router.push("/dashboard"); }}
      />
    </div>
  );
}