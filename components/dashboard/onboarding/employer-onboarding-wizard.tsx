"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Loader2, Calendar, Camera } from "lucide-react";
import { toast } from "sonner";
import { useSession, authClient } from "@/lib/auth-client";
import { Field, inputClass } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import {
  getEmployerOnboardingContext,
  chooseEmployerCompany,
  saveEmployerProfile,
} from "@/lib/services/employer";
import {
  WizardFooter,
  SegmentBar,
  StepHeader,
  OtpBoxes,
  GuideSection,
  CancelSetupDialog,
  yellowBtn,
  ghostBtn,
} from "./wizard-chrome";

const OTP_LEN = 6;
const COMPANY_SIZES = ["1 - 10 employees", "11 - 50 employees", "51 - 200 employees", "201+ employees"];
const EMPLOYER_TYPES = [
  { value: "general_contracting", label: "General Contracting", description: "Manages complete construction projects from start to finish and hires specialized subcontractors across various trades." },
  { value: "staffing_recruiting", label: "Staffing & Recruiting", description: "Sources and places talent, professionals, or labor for other companies' projects." },
  { value: "multi_disciplinary", label: "Multi-Disciplinary / General", description: "Operates across multiple sectors, offering a mix of services like architecture, engineering, and planning in-house." },
];

type Screen = "guidelines" | "choice" | "employerType" | "identity" | "otp" | "profile" | "summary";

/**
 * Employer onboarding wizard — two branches depending on whether the account
 * already manages an exhibitor company:
 *  A) hire under that company (3 segments: choice → employer type → summary)
 *  B) freestanding hiring profile (4 segments: identity → OTP → profile → summary)
 * Replaces the old single-button `EmployerGate` confirmation.
 */
export function EmployerOnboardingWizard() {
  const router = useRouter();
  const { data: session } = useSession();

  const [loaded, setLoaded] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  const [screen, setScreen] = useState<Screen>("guidelines");
  const [history, setHistory] = useState<Screen[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // Branch A
  const [hireChoice, setHireChoice] = useState<"existing" | "new">("existing");
  const [employerTypeOnly, setEmployerTypeOnly] = useState("");

  // Branch B
  const [hiringAs, setHiringAs] = useState<"company" | "individual">("company");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [employerType, setEmployerType] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [yearFounded, setYearFounded] = useState("");
  const [about, setAbout] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getEmployerOnboardingContext()
      .then((ctx) => { setHasCompany(ctx.hasCompany); setCompanyId(ctx.companyId); setCompanyName(ctx.companyName); })
      // Swallowing this left hasCompany=false, silently routing owners of an
      // existing company down the wrong branch. Surface it instead.
      .catch(() => toast.error("Couldn't load your company details. Some options may be missing."))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const e = (session?.user as { email?: string } | undefined)?.email;
    if (e && !email) setEmail(e);
  }, [session, email]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function go(next: Screen) { setHistory((h) => [...h, screen]); setScreen(next); }
  function back() { setHistory((h) => { const p = h[h.length - 1]; if (p) setScreen(p); return h.slice(0, -1); }); }

  function requestClose() {
    if (screen === "summary") { router.push("/dashboard"); return; }
    setCancelOpen(true);
  }

  function acceptGuidelines() {
    go(hasCompany ? "choice" : "identity");
  }

  function submitChoice() {
    if (hireChoice === "existing") go("employerType");
    else go("identity");
  }

  async function submitEmployerTypeOnly() {
    if (!employerTypeOnly) { toast.error("Select your employer type."); return; }
    setPending(true);
    try {
      await chooseEmployerCompany({ companyId, employerType: employerTypeOnly });
      go("summary");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function sendCode(): Promise<boolean> {
    setSeconds(60);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    if (error) { toast.error(error.message || "Couldn't send the code."); return false; }
    toast.success("A 6-digit code is on its way.");
    return true;
  }

  async function submitIdentity() {
    if (hiringAs === "company" && !name.trim()) { toast.error("Enter your company name."); return; }
    if (!emailValid) { toast.error("Enter a valid email address."); return; }
    // The OTP resolves against a *user account*, so it can only verify the
    // signed-in user's own address. Sending a code to a different company
    // address produced one that could never validate, which dead-ended the
    // whole wizard — that address is recorded unverified instead.
    const ownEmail = (session?.user as { email?: string } | undefined)?.email;
    if (ownEmail && email.trim().toLowerCase() === ownEmail.trim().toLowerCase()) {
      if (await sendCode()) go("otp");
      return;
    }
    go("profile");
  }

  async function verifyCode() {
    if (otp.length !== OTP_LEN) { toast.error("Enter the 6-digit code."); return; }
    setPending(true);
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
    setPending(false);
    if (error) { toast.error(error.message || "That code is invalid or has expired."); setOtp(""); return; }
    toast.success("Email verified.");
    go("profile");
  }

  async function submitProfile() {
    if (!employerType) { toast.error("Select your employer type."); return; }
    setPending(true);
    try {
      await saveEmployerProfile({ hiringAs, name, email, employerType, headquarters, companySize, yearFounded, about, avatarUrl: logoPreview ?? undefined });
      go("summary");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (!loaded) return null;

  const branchATotal = 3;
  const branchBTotal = 4;

  const summaryRows: [string, string][] = hireChoice === "existing" && screen === "summary" && history.includes("employerType")
    ? [["Company", companyName || "—"], ["Employer Type", EMPLOYER_TYPES.find((t) => t.value === employerTypeOnly)?.label || "—"]]
    : [
        ["Company Name", name || "—"],
        ["Company Email", email || "—"],
        ["Primary Address", headquarters || "Enter your primary HQ or showroom address"],
        ["Employer Type", EMPLOYER_TYPES.find((t) => t.value === employerType)?.label || "—"],
        ["Company size", companySize || "—"],
        ["Year Founded", yearFounded || "—"],
      ];

  return (
    <div className="min-h-full bg-[#f4f4f4] px-3 py-4 dark:bg-[#161616] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="px-6 pt-6 sm:px-10 sm:pt-9">
          <AnimatePresence mode="wait">
            <motion.div key={screen} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              {/* ── Guidelines ───────────────────────────────────────── */}
              {screen === "guidelines" && (
                <div>
                  <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-5 dark:border-white/10">
                    <Logo size="sm" tone="auto" />
                    <button onClick={requestClose} aria-label="Close" className="text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="border-b border-[#f0f0f0] py-7 text-center dark:border-white/10">
                    <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1e1e1e] dark:text-white">Nomarc Projects<br />Employer Profile Guidelines</h1>
                    <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/55">Establish your business identity and maintain a trusted presence on the Nomarc Projects platform.</p>
                  </div>
                  <div className="py-6">
                    <p className="text-[12px] font-medium text-[#9a9a9a]">Updated July 10, 2026</p>
                    <div className="mt-4 space-y-4 text-[13px] leading-relaxed text-[#3d3d3d] dark:text-white/70">
                      <p>Welcome to the Nomarc Projects employer profile. To ensure a secure, transparent, and high-quality marketplace for all professionals and companies, we require all employers to adhere to the following platform standards.</p>
                      <p>By setting up an employer profile and posting jobs, you agree to maintain these practices.</p>
                    </div>

                    <GuideSection title="Profile & Job Posting Requirements (The Basics)" items={[
                      ["Accurate Identity", "Your company name, headquarters, and operational details must accurately reflect your legally registered business entity."],
                      ["Clear Role Descriptions", "When posting roles, provide accurate technical requirements, compensation details, working models (e.g., On-site, Remote), and clear daily responsibilities. Vague or deceptive job descriptions are prohibited."],
                      ["Verifiable Credentials", "Any professional certifications you require from candidates, or proudly display as a company, must be current and verifiable."],
                      ["Active Hiring Status", "Ensure your posted roles are strictly up-to-date. If a position is filled, paused, or cancelled, realistically represent your hiring capacity by promptly updating the job's status."],
                    ]} />
                    <GuideSection title="Prohibited Content & Practices" items={[
                      ["Discriminatory Hiring", "Listing jobs that discriminate on the basis of race, gender, religion, age, disability, or sexual orientation is strictly prohibited."],
                      ["Misrepresentation", "Do not misrepresent your company's scale, primary industry, workplace culture, or compensation structure."],
                      ["Bait-and-Switch Tactics", "Advertising roles at artificially high salaries to attract candidates, or significantly changing the core responsibilities or terms of employment post-application, will not be tolerated."],
                      ["Spam & Unsolicited Outreach", "Do not use the platform directory or messaging tools to spam professionals with irrelevant recruitment pitches or duplicate promotional messages."],
                    ]} />
                    <GuideSection title="Trust, Verification & Enforcement" items={[
                      ["Mandatory Identity Verification", "To fully activate your employer profile and build instant credibility, you must submit legitimate business documents (CAC Certificate, valid Company Email, etc.) for review."],
                      ["Listing Suspensions", "The platform administration reserves the right to review, edit, hide, or suspend any job listing or company profile that violates these guidelines."],
                      ["Account Action", "Serious violations, such as fraud, predatory hiring practices, or repeated reports of misrepresentation, will result in the immediate revocation of your Trust Badge, removal of your job listings, and permanent account closure."],
                    ]} />

                    <label className="mt-7 flex items-start gap-2.5 text-[13px] text-[#3d3d3d] dark:text-white/70">
                      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#ffd716]" />
                      I have read and agree to abide by the Nomarc Platform Employer Guidelines.
                    </label>
                    <div className="mt-6 flex items-center justify-end gap-2.5">
                      <button onClick={requestClose} className={ghostBtn}>Cancel</button>
                      <button disabled={!agreed} onClick={acceptGuidelines} className={yellowBtn}>Accept &amp; Continue</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Branch A · Step 1 — choice ───────────────────────── */}
              {screen === "choice" && (
                <div className="max-w-[520px] pb-2">
                  <SegmentBar current={0} total={branchATotal} />
                  <StepHeader title="Setup Employer Profile" subtitle="Select your hiring identity or create a new profile to begin posting jobs." onClose={requestClose} />
                  <p className="mb-3 text-[13px] text-[#3d3d3d] dark:text-white/70">We see you already manage {companyName}. How would you like to hire?</p>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2.5 text-[13.5px] text-[#1e1e1e] dark:text-white">
                      <input type="radio" name="hire-choice" checked={hireChoice === "existing"} onChange={() => setHireChoice("existing")} className="h-4 w-4 accent-[#ffd716]" />
                      Hire under {companyName}
                    </label>
                    <label className="flex items-center gap-2.5 text-[13.5px] text-[#1e1e1e] dark:text-white">
                      <input type="radio" name="hire-choice" checked={hireChoice === "new"} onChange={() => setHireChoice("new")} className="h-4 w-4 accent-[#ffd716]" />
                      Create a new hiring profile
                    </label>
                  </div>
                  <button onClick={submitChoice} className={cn(yellowBtn, "mt-5 w-full py-3")}>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /> Continue
                  </button>
                </div>
              )}

              {/* ── Branch A · Step 2 — employer type only ───────────── */}
              {screen === "employerType" && (
                <div className="max-w-[520px] pb-2">
                  <SegmentBar current={1} total={branchATotal} />
                  <StepHeader title="Setup Employer Profile" subtitle="Define your employer type to set the right expectations for job seekers." onClose={requestClose} />
                  <Field label="Employer Type" hint="Select the option that best describes your primary business operations.">
                    <SelectMenu value={employerTypeOnly} placeholder="Select" options={EMPLOYER_TYPES.map((t) => t.label)} onChange={(label) => setEmployerTypeOnly(EMPLOYER_TYPES.find((t) => t.label === label)?.value || "")} />
                  </Field>
                  <div className="mt-5 flex items-center gap-2.5">
                    <button onClick={back} className={cn(ghostBtn, "flex-1")}>Back</button>
                    <button onClick={submitEmployerTypeOnly} disabled={pending} className={cn(yellowBtn, "flex-1")}>
                      {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Create Profile
                    </button>
                  </div>
                </div>
              )}

              {/* ── Branch B · Step 1 — identity ─────────────────────── */}
              {screen === "identity" && (
                <div className="max-w-[520px] pb-2">
                  <SegmentBar current={0} total={branchBTotal} />
                  <StepHeader title="Setup Employer Profile" subtitle="Establish your business identity and complete your account verification to become an employer and begin posting jobs." onClose={requestClose} />
                  <div className="mb-4 flex items-center gap-5 text-[13.5px] text-[#1e1e1e] dark:text-white">
                    <span className="text-[13px] font-semibold text-[#3d3d3d] dark:text-white/70">I am hiring as a:</span>
                    <label className="flex items-center gap-1.5"><input type="radio" name="hiring-as" checked={hiringAs === "company"} onChange={() => setHiringAs("company")} className="h-4 w-4 accent-[#ffd716]" /> Company</label>
                    <label className="flex items-center gap-1.5"><input type="radio" name="hiring-as" checked={hiringAs === "individual"} onChange={() => setHiringAs("individual")} className="h-4 w-4 accent-[#ffd716]" /> Individual / Independent</label>
                  </div>
                  <div className="space-y-4">
                    <Field label="Company Name">
                      <input className={inputClass} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="UrbanGrid Studios" />
                    </Field>
                    <Field label="Company Email">
                      <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@companyA.com" />
                    </Field>
                    <button onClick={submitIdentity} className={cn(yellowBtn, "w-full py-3")}>
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /> Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ── Branch B · Step 2 — OTP ───────────────────────────── */}
              {screen === "otp" && (
                <div className="max-w-[520px] pb-2">
                  <SegmentBar current={1} total={branchBTotal} />
                  <StepHeader title="Setup Employer Profile" subtitle="We've sent a 6-digit verification code to your email. Enter it below to secure your account." onClose={requestClose} />
                  <Field label="Verification code">
                    <OtpBoxes value={otp} onChange={(v) => { setOtp(v); if (v.length === OTP_LEN) verifyCode(); }} disabled={pending} />
                  </Field>
                  <div className="mt-5 flex items-center gap-2.5">
                    <button onClick={back} className={cn(ghostBtn, "flex-1")}>Back</button>
                    <button onClick={verifyCode} disabled={pending} className={cn(yellowBtn, "flex-1")}>
                      {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Verify email
                    </button>
                  </div>
                  <p className="mt-3 text-center text-[12.5px] text-[#9a9a9a]">
                    Didn&apos;t receive it?{" "}
                    {seconds > 0 ? (
                      <span className="font-semibold text-[#1e1e1e] dark:text-white">Click to resend (0:{String(seconds).padStart(2, "0")})</span>
                    ) : (
                      <button onClick={sendCode} className="font-semibold text-[#1e1e1e] hover:underline dark:text-white">Click to resend</button>
                    )}
                  </p>
                </div>
              )}

              {/* ── Branch B · Step 3 — full profile ─────────────────── */}
              {screen === "profile" && (
                <div className="max-w-[640px] pb-2">
                  <SegmentBar current={2} total={branchBTotal} />
                  <StepHeader title="Setup Employer Profile" subtitle="Add your essential details to help our algorithm match your jobs with the right professionals." onClose={requestClose} />
                  <div className="mb-6 flex items-center gap-4">
                    <button type="button" onClick={() => logoInput.current?.click()} className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1e1e1e] text-white/70 transition-opacity hover:opacity-90 dark:bg-white/10">
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Camera size={22} />
                      )}
                    </button>
                    <button type="button" onClick={() => logoInput.current?.click()} className={cn(ghostBtn, "px-4 py-2 text-[13px]")}>Upload profile picture</button>
                    <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogoPreview(URL.createObjectURL(f)); }} />
                  </div>
                  <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                    <Field label="Primary Address">
                      <input className={inputClass} value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="Lagos, Lagos State, Nigeria" />
                    </Field>
                    <Field label="Employer Type" hint="ⓘ">
                      <SelectMenu value={employerType} placeholder="Select" options={EMPLOYER_TYPES.map((t) => t.label)} onChange={(label) => setEmployerType(EMPLOYER_TYPES.find((t) => t.label === label)?.value || "")} />
                    </Field>
                    <Field label="Company Size">
                      <SelectMenu value={companySize} placeholder="Select" options={COMPANY_SIZES} onChange={setCompanySize} />
                    </Field>
                    <Field label="Year Founded">
                      <div className="flex items-center rounded-lg border border-[#e3e3e3] bg-white transition-colors focus-within:border-[#ffd716] dark:border-white/15 dark:bg-transparent">
                        <input className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:outline-none dark:text-white" inputMode="numeric" maxLength={4} value={yearFounded} onChange={(e) => setYearFounded(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2004" />
                        <Calendar size={15} className="mr-3 flex-shrink-0 text-[#9a9a9a]" />
                      </div>
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="About the Company" hint={`${about.length}/2,000`}>
                      <textarea rows={5} maxLength={2000} className={inputClass} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Tell candidates about your company, culture, and what you're building…" />
                    </Field>
                  </div>
                  <div className="mt-5 flex items-center gap-2.5">
                    <button onClick={back} className={cn(ghostBtn, "flex-1")}>Back</button>
                    <button onClick={submitProfile} disabled={pending} className={cn(yellowBtn, "flex-1")}>
                      {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Create Profile
                    </button>
                  </div>
                </div>
              )}

              {/* ── Summary ───────────────────────────────────────────── */}
              {screen === "summary" && (
                <div className="pb-2">
                  <SegmentBar current={(hireChoice === "existing" && history.includes("employerType")) ? 2 : 3} total={(hireChoice === "existing" && history.includes("employerType")) ? branchATotal : branchBTotal} />
                  <StepHeader title="Setup Employer Profile" subtitle="You are all set! Review your profile summary and take the next steps to start hiring." onClose={requestClose} />

                  <div className="rounded-2xl border border-[#ececec] bg-[#fafafa] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Profile Summary</h2>
                    <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                      {summaryRows.map(([label, value]) => (
                        <div key={label}>
                          <p className="mb-1.5 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{label}</p>
                          <div className="rounded-lg border border-[#e6e6e6] bg-white px-3.5 py-2.5 text-[13px] text-[#6b6b6b] dark:border-white/10 dark:bg-transparent dark:text-white/60">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#ececec] bg-[#fafafa] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Thank you for your submission!</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">Your employer profile has been successfully created and your baseline details are saved. To ensure quality for our community, your public visibility will be limited until you are fully verified.</p>
                    <p className="mt-4 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">What&apos;s Next:</p>
                    <ul className="mt-2 space-y-2.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
                      <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" /><span><span className="font-semibold text-[#1e1e1e] dark:text-white">Verify your employer profile:</span> Head to your account settings to upload required documents and get your verified seal.</span></li>
                      <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" /><span><span className="font-semibold text-[#1e1e1e] dark:text-white">Start posting open roles:</span> Add your job listings, role requirements, and company benefits so professionals can start applying.</span></li>
                    </ul>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <button onClick={() => { router.push("/dashboard"); router.refresh(); }} className={cn(ghostBtn, "flex-1 justify-center")}>Go to My Dashboard</button>
                    <button onClick={() => { router.push("/dashboard/jobs/post"); router.refresh(); }} className={cn(yellowBtn, "flex-1")}>
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /> Post a Job Now
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <WizardFooter />
      </div>

      <CancelSetupDialog open={cancelOpen} onCancel={() => setCancelOpen(false)} onConfirm={() => { setCancelOpen(false); router.push("/dashboard"); }} />
    </div>
  );
}
