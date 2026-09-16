"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Copy } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { PhoneInput } from "@/components/ui/phone-input";
import { FileUpload } from "@/components/ui/file-upload";
import { ComingSoonButton } from "@/components/ui/coming-soon";
import { submitApplication, getApplicantDefaults } from "@/lib/services/applications";
import { uploadFile } from "@/lib/upload-client";

// Stand-in until live profile fields are wired.
export function ApplyForm({ jobId, jobTitle, jobCompany, jobLocation, required }: {
  jobId: string; jobTitle: string; jobCompany: string; jobLocation: string;
  /** What this listing asks for. All false on jobs posted before the poster
   *  could choose (drizzle/0044), which enforces nothing — the previous
   *  behaviour. */
  required: { resume: boolean; portfolio: boolean; coverLetter: boolean };
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("1–3 years");
  const [salary, setSalary] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [cover, setCover] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function copyFromProfile() {
    start(async () => {
      try {
        const p = await getApplicantDefaults();
        if (p.name) setName(p.name);
        if (p.email) setEmail(p.email);
        if (p.phone) setPhone(p.phone);
        if (p.location) setLocation(p.location);
        const filled = [p.name, p.email, p.phone, p.location].filter(Boolean).length;
        // Only claim to have copied something when there was something to copy.
        if (filled) toast.success("Details copied from your profile");
        else toast.error("Your profile has no contact details saved yet");
      } catch { toast.error("Couldn't read your profile"); }
    });
  }

  function save(draft: boolean) {
    // Drafts are deliberately exempt — the point of a draft is an incomplete one.
    if (!draft) {
      if (required.resume && !resumeUrl) { toast.error("This role requires a resume / CV"); return; }
      if (required.portfolio && !portfolio.trim()) { toast.error("This role requires a portfolio URL"); return; }
      if (required.coverLetter && !cover.trim()) { toast.error("This role requires a cover letter"); return; }
      if (!confirm) { toast.error("Please confirm your details are accurate."); return; }
    }
    start(async () => {
      try {
        await submitApplication({ jobId, coverLetter: cover, expectedSalary: salary, resumeUrl, portfolioUrl: portfolio, linkedinUrl: linkedin, draft });
        toast.success(draft ? "Saved as draft" : "Application submitted!");
        router.push(draft ? "/dashboard/applications/drafts" : "/dashboard/applications");
      } catch { toast.error("Something went wrong. Please try again."); }
    });
  }

  return (
    <div className="px-6 md:px-8 py-6 max-w-[920px]">
      <button onClick={() => router.push("/dashboard/jobs")} className="flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-5"><ArrowLeft size={16} /> Back to jobs</button>

      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Briefcase size={16} /></div>
          <div><h2 className="text-sm font-bold text-[#1e1e1e] dark:text-white">{jobTitle}</h2><p className="text-[12px] text-[#9a9a9a]">{jobCompany}{jobLocation && ` • ${jobLocation}`}</p></div>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 md:p-6">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div><h2 className="text-base font-bold text-[#1e1e1e] dark:text-white">Your application</h2><p className="text-[13px] text-[#9a9a9a]">Review and complete the details below.</p></div>
          <button type="button" onClick={copyFromProfile} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1e1e1e] dark:text-white hover:text-[#caa400] transition-colors"><Copy size={13} /> Copy details from profile</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" /></Field>
          <Field label="Email address"><input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></Field>
          <Field label="Phone"><PhoneInput value={phone} onChange={setPhone} /></Field>
          <Field label="Current location"><input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State, Country" /></Field>
          <Field label="Years of experience"><select value={experience} onChange={(e) => setExperience(e.target.value)} className={inputClass + " appearance-none"}><option className="dark:bg-[#1e1e1e]">1–3 years</option><option className="dark:bg-[#1e1e1e]">3–5 years</option><option className="dark:bg-[#1e1e1e]">6+ years</option></select></Field>
          <Field label="Expected salary (₦ / month)"><input className={inputClass} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 650,000.00" /></Field>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">Resume / CV{required.resume && <span className="text-[#e11d48]"> *</span>}</span>
            <ComingSoonButton label="Import from LinkedIn / CV" feature="Auto-fill from your CV" icon={false} />
          </div>
          <FileUpload accept=".pdf" maxSizeMB={10} label="Upload your CV" hint="PDF · max 10MB" upload={(f) => uploadFile(f, "resume")} onChange={(items) => setResumeUrl(items[0]?.url ?? "")} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label={required.portfolio ? "Portfolio URL *" : "Portfolio URL"}><input className={inputClass} value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://" /></Field>
          <Field label="LinkedIn URL"><input className={inputClass} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/" /></Field>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">Cover letter{required.coverLetter && <span className="text-[#e11d48]"> *</span>}</span>
            <div className="flex items-center gap-3">
              <ComingSoonButton label="Write with AI" feature="AI cover-letter assist" />
              <span className="text-[11px] text-[#b3b3b3]">{cover.length}/2,500</span>
            </div>
          </div>
          <textarea rows={5} maxLength={2500} className={inputClass} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Tell the team why you're a great fit…" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="accent-[#ffd716]" /> I confirm the information above is accurate and complete.</label>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={() => router.push("/dashboard/jobs")} className="px-4 py-2 text-sm font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white">Cancel</button>
          <button type="button" disabled={pending} onClick={() => save(true)} className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 disabled:opacity-60">Save as draft</button>
          <button type="submit" disabled={pending} className="px-5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors disabled:opacity-60">{pending ? "Submitting…" : "Submit application"}</button>
        </div>
      </form>
    </div>
  );
}
