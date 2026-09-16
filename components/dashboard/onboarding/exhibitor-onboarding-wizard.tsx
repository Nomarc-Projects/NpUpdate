"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Loader2, Camera, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { MultiSelect } from "@/components/ui/multi-select";
import { Logo } from "@/components/ui/logo";
import { saveCompany } from "@/lib/services/company";
import { submitKycDoc } from "@/lib/services/kyc";
import { useMultiStep } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";
import {
  WizardFooter,
  SegmentBar,
  StepHeader,
  GuideSection,
  CancelSetupDialog,
  yellowBtn,
  ghostBtn,
} from "./wizard-chrome";

const COMPANY_SIZES = ["1 - 9 employees", "10 - 49 employees", "50 - 249 employees", "250+ employees"];
const COMPANY_TYPES = [
  "Manufacturer", "Distributor", "Wholesaler", "Retailer", "Rental Company", "Equipment Dealer",
  "Importer", "Exporter", "Fabricator", "Service Provider", "OEM (Original Equipment Manufacturers)", "Consultant",
];
const PRODUCT_CATEGORIES = [
  "Building Materials",
  "Construction Equipment & Machinery",
  "Tools & Hardware",
  "Interior, Exterior & Landscaping",
  "Building Services (Electrical, Plumbing, HVAC, Fire Protection)",
  "Safety (PPE)",
];

/**
 * 4-step exhibitor onboarding: guidelines → business identity (name, address,
 * size, type, about, categories) → documents (logo, registration number, CAC
 * certificate) → summary. Final "Create Profile" calls saveCompany (grants
 * the exhibitor role). Matches the Figma flow's 3-segment progress bar —
 * unlike the employer wizard, there's no separate email/OTP step here.
 */
export function ExhibitorOnboardingWizard() {
  const router = useRouter();
  const { step, next, prev } = useMultiStep(4);

  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [about, setAbout] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [regNumber, setRegNumber] = useState("");
  const [cacFileName, setCacFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const cacInput = useRef<HTMLInputElement>(null);

  function goToDocuments() {
    if (!name.trim()) { toast.error("Enter your company name."); return; }
    if (!companyType) { toast.error("Select a company type."); return; }
    next();
  }

  async function createProfile() {
    setPending(true);
    try {
      await saveCompany({
        name, headquarters, about, companySize, companyType, categories,
        industry: categories[0], // legacy field, mirrors the primary category so existing industry-keyed surfaces keep working
      });
      // Registration number is a lightweight Tier-2 corporate doc; the CAC
      // certificate file upload isn't wired to storage yet (same as the logo
      // preview above — local-only until a file-upload service exists).
      if (regNumber.trim()) {
        await submitKycDoc({ tier: 2, docType: "cac_number", textValue: regNumber.trim() }).catch(() => {});
      }
      next();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function requestClose() {
    if (step === 3) { router.push("/dashboard"); return; }
    setCancelOpen(true);
  }

  const summaryRows: [string, string][] = [
    ["Company Name", name || "—"],
    ["Company Address", headquarters || "Enter your primary HQ or showroom address"],
    ["Company Type", companyType || "—"],
    ["Company size", companySize || "—"],
  ];

  return (
    <div className="min-h-full bg-[#f4f4f4] px-3 py-4 dark:bg-[#161616] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="px-6 pt-6 sm:px-10 sm:pt-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* ── Step 0 — Guidelines ─────────────────────────────── */}
              {step === 0 && (
                <div>
                  <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-5 dark:border-white/10">
                    <Logo size="sm" tone="auto" />
                    <button onClick={requestClose} aria-label="Close" className="text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="border-b border-[#f0f0f0] py-7 text-center dark:border-white/10">
                    <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1e1e1e] dark:text-white">Nomarc Projects<br />Exhibitor Profile Guidelines</h1>
                    <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/55">Establish your business identity and maintain a trusted presence on the Nomarc Exhibition Hub.</p>
                  </div>
                  <div className="py-6">
                    <p className="text-[12px] font-medium text-[#9a9a9a]">Updated July 10, 2026</p>
                    <div className="mt-4 space-y-4 text-[13px] leading-relaxed text-[#3d3d3d] dark:text-white/70">
                      <p>Welcome to the Nomarc Projects Exhibition Hub. To ensure a secure, transparent, and high-quality marketplace for all professionals and employers, we require all exhibitors to adhere to the following platform standards.</p>
                      <p>By setting up an exhibitor profile and listing products, you agree to maintain these practices.</p>
                    </div>

                    <GuideSection title="Profile & Catalog Requirements (The Basics)" items={[
                      ["Accurate Identity", "Your company name, headquarters, and operational details must accurately reflect your legally registered business entity."],
                      ["Clear Product Specifications", "When listing products or heavy machinery, provide accurate technical specifications, material grades, and variations. Vague or deceptive descriptions are prohibited."],
                      ["Verifiable Credentials", "Any professional certifications you highlight on your company profile (e.g., ISO 9001:2015, SONCAP) must be current and verifiable."],
                      ["Inventory & Fulfillment Transparency", "Ensure your product availability statuses (e.g., “In Stock”) are kept up-to-date. If you are a supplier handling high-volume procurement, realistically represent your output capacity."],
                    ]} />
                    <GuideSection title="Prohibited Content & Practices" items={[
                      ["Counterfeit & Substandard Materials", "Listing counterfeit construction materials, uncertified heavy machinery, or materials that fail to meet recognized regional safety standards is strictly prohibited."],
                      ["Misrepresentation", "Do not misrepresent your company's size, primary industry, manufacturing capabilities, or identity."],
                      ["Bait-and-Switch Tactics", "Advertising materials at artificially low prices to attract quote requests, or delivering lower-tier materials than what was listed on your profile, will not be tolerated."],
                      ["Spam & Unsolicited Outreach", "Do not use the platform directory or messaging tools to spam professionals with irrelevant sales pitches or duplicate promotional messages."],
                    ]} />
                    <GuideSection title="Trust, Verification & Enforcement" items={[
                      ["Mandatory Identity Verification", "To fully activate your exhibitor profile and build instant credibility, you must submit legitimate business documents (CAC Certificate, CAC Status Report, TIN, and Valid Primary Contact ID) for Tier 2 review."],
                      ["Catalog Suspensions", "The platform administration reserves the right to review, edit, hide, or suspend any product listing or company profile that violates these guidelines."],
                      ["Account Action", "Serious violations, such as fraud, uploading forged CAC/TIN documents, or repeated reports of substandard materials, will result in the immediate revocation of your Trust Badge, removal of your product catalog, and permanent account closure."],
                    ]} />

                    <label className="mt-7 flex items-start gap-2.5 text-[13px] text-[#3d3d3d] dark:text-white/70">
                      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#ffd716]" />
                      I have read and agree to abide by the Nomarc Platform Exhibitor Guidelines.
                    </label>
                    <div className="mt-6 flex items-center justify-end gap-2.5">
                      <button onClick={requestClose} className={ghostBtn}>Cancel</button>
                      <button disabled={!agreed} onClick={() => next()} className={yellowBtn}>Accept &amp; Continue</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 1 — Business identity ──────────────────────── */}
              {step === 1 && (
                <div className="max-w-[640px] pb-2">
                  <SegmentBar current={0} total={3} />
                  <StepHeader
                    title="Setup Exhibitor Profile"
                    subtitle="Define your business identity and select your product categories to begin setting up your digital showroom."
                    onClose={requestClose}
                  />
                  <div className="space-y-4">
                    <Field label="Company Name">
                      <input className={inputClass} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="enter company name" />
                    </Field>
                    <Field label="Company Address">
                      <input className={inputClass} value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="enter company address" />
                    </Field>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                      <Field label="Company Size">
                        <SelectMenu value={companySize} placeholder="Select" options={COMPANY_SIZES} onChange={setCompanySize} />
                      </Field>
                      <Field label="Company Type">
                        <SelectMenu value={companyType} placeholder="Select company type" options={COMPANY_TYPES} onChange={setCompanyType} />
                      </Field>
                    </div>
                    <Field label="About the Company" hint={`${about.length}/2,000`}>
                      <textarea rows={4} maxLength={2000} className={inputClass} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="We are West Africa's leading supplier of…" />
                    </Field>
                    <Field label="Product Category" hint="(Select all that apply)">
                      <MultiSelect
                        options={PRODUCT_CATEGORIES}
                        value={categories}
                        onChange={setCategories}
                        placeholder="enter company address"
                      />
                    </Field>
                    <button onClick={goToDocuments} className={cn(yellowBtn, "w-full py-3")}>
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /> Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2 — Documents ───────────────────────────────── */}
              {step === 2 && (
                <div className="max-w-[520px] pb-2">
                  <SegmentBar current={1} total={3} />
                  <StepHeader
                    title="Setup Exhibitor Profile"
                    subtitle="Upload your official company documents and logo to verify your business and build instant trust with buyers."
                    onClose={requestClose}
                  />
                  <div className="mb-6 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => logoInput.current?.click()}
                      className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1e1e1e] text-white/70 transition-opacity hover:opacity-90 dark:bg-white/10"
                    >
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
                    <Field label="Company Registration number">
                      <input className={inputClass} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="enter registration number" />
                    </Field>
                    <Field label="Certificate of Incorporation">
                      <button
                        type="button"
                        onClick={() => cacInput.current?.click()}
                        className="flex w-full items-center justify-between rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-2.5 text-left text-sm text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:bg-transparent dark:text-white"
                      >
                        <span className={cn("truncate", !cacFileName && "text-[#b3b3b3]")}>{cacFileName || "CAC Certificate (or equivalent)"}</span>
                        <Paperclip size={15} className="flex-shrink-0 text-[#9a9a9a]" />
                      </button>
                      <input ref={cacInput} type="file" accept="image/*,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setCacFileName(f.name); }} />
                    </Field>
                  </div>
                  <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-[#9a9a9a]">
                    <span aria-hidden>🔒</span> Your documents are encrypted, securely stored, and only used for verification purposes. They will never be displayed publicly on your profile.
                  </p>
                  <div className="mt-5 flex items-center gap-2.5">
                    <button onClick={prev} className={cn(ghostBtn, "flex-1")}>Back</button>
                    <button onClick={createProfile} disabled={pending} className={cn(yellowBtn, "flex-1")}>
                      {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Create Profile
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3 — Summary / confirmation ─────────────────── */}
              {step === 3 && (
                <div className="pb-2">
                  <SegmentBar current={2} total={3} />
                  <StepHeader title="Setup Exhibitor Profile" subtitle="You're all set! Your digital showroom is ready." onClose={requestClose} />

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
                    <div className="mt-4">
                      <p className="mb-1.5 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">About the Company</p>
                      <div className="rounded-lg border border-[#e6e6e6] bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:border-white/10 dark:bg-transparent dark:text-white/60">{about || "—"}</div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#ececec] bg-[#fafafa] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Thank you for your submission!</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">Your company profile has been successfully created and your baseline details are saved. To ensure quality for our community, your public visibility will be limited until your business is fully verified.</p>
                    <p className="mt-4 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">What&apos;s Next:</p>
                    <ul className="mt-2 space-y-2.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
                      <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" /><span><span className="font-semibold text-[#1e1e1e] dark:text-white">Upload your first product (Free):</span> Enjoy one free product listing for your first 30 days. Get a feel for the platform before committing to a plan.</span></li>
                      <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" /><span><span className="font-semibold text-[#1e1e1e] dark:text-white">Activate a full subscription:</span> Ready to list your entire catalog? Choose an exhibitor plan to unlock multiple uploads, technical sheets, and premium visibility.</span></li>
                    </ul>
                  </div>

                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                    <button onClick={() => { router.push("/dashboard/add-product"); router.refresh(); }} className={cn(ghostBtn, "w-full sm:flex-1")}>
                      Upload Free Product
                    </button>
                    <button onClick={() => { router.push("/dashboard"); router.refresh(); }} className={cn(yellowBtn, "w-full sm:flex-1")}>
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /> Go to My Dashboard
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
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
