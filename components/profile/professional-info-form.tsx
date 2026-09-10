"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Award } from "lucide-react";
import { Field, inputClass, PrimaryButton, GhostButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { saveProfile, type ProfileData, type PracticeStatus } from "@/lib/services/profile";

const AVAIL_OPTIONS = [
  { label: "Open to work", value: "open_to_work" },
  { label: "Hiring", value: "hiring" },
  { label: "Not right now", value: "none" },
];

const PRACTICE_OPTIONS = [
  { label: "Intern", value: "intern" },
  { label: "Graduate / Freelancer", value: "graduate" },
  { label: "Consultant", value: "consultant" },
  { label: "Licensed", value: "licensed" },
  { label: "Registered", value: "registered" },
  { label: "Company", value: "company" },
];

const labelOf = (opts: { label: string; value: string }[], v?: string) =>
  opts.find((o) => o.value === v)?.label ?? "";

/**
 * "Edit Professional Info" — the professional practice fields collected by the
 * onboarding form (availability, practice status, licence/registration/company
 * details) but not editable on the Public Profile tab. Every field is required,
 * with the licence/registration/company sub-fields required only when their
 * practice status is selected.
 */
export function ProfessionalInfoForm({ initial }: { initial?: ProfileData }) {
  const router = useRouter();
  const [availability, setAvailability] = useState(labelOf(AVAIL_OPTIONS, initial?.availability));
  const [practiceStatus, setPracticeStatus] = useState(labelOf(PRACTICE_OPTIONS, initial?.practiceStatus));
  const [licenseNumber, setLicenseNumber] = useState(initial?.licenseNumber ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(initial?.registrationNumber ?? "");
  const [practiceCompanyName, setPracticeCompanyName] = useState(initial?.practiceCompanyName ?? "");
  const [practiceRegNumber, setPracticeRegNumber] = useState(initial?.practiceRegNumber ?? "");
  const [practiceCompanyAddress, setPracticeCompanyAddress] = useState(initial?.practiceCompanyAddress ?? "");
  const [pending, start] = useTransition();

  const dbStatus = PRACTICE_OPTIONS.find((o) => o.label === practiceStatus)?.value as PracticeStatus | undefined;
  const isCompany = dbStatus === "company";

  function save() {
    if (!availability) { toast.error("Select your availability."); return; }
    if (!practiceStatus) { toast.error("Select your professional practice status."); return; }
    if (dbStatus === "licensed" && !licenseNumber.trim()) { toast.error("Enter your licence number."); return; }
    if (dbStatus === "registered" && !registrationNumber.trim()) { toast.error("Enter your registration number."); return; }
    if (isCompany) {
      if (!practiceCompanyName.trim()) { toast.error("Enter the company name."); return; }
      if (!practiceRegNumber.trim()) { toast.error("Enter the company registration number."); return; }
      if (!practiceCompanyAddress.trim()) { toast.error("Enter the company address."); return; }
    }
    start(async () => {
      try {
        await saveProfile({
          availability,
          practiceStatus: dbStatus,
          licenseNumber: dbStatus === "licensed" ? licenseNumber.trim() : undefined,
          registrationNumber: dbStatus === "registered" ? registrationNumber.trim() : undefined,
          practiceCompanyName: isCompany ? practiceCompanyName.trim() : undefined,
          practiceRegNumber: isCompany ? practiceRegNumber.trim() : undefined,
          practiceCompanyAddress: isCompany ? practiceCompanyAddress.trim() : undefined,
        });
        toast.success("Professional info saved");
        router.refresh();
      } catch {
        toast.error("Could not save professional info");
      }
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6">
      <div className="flex items-center gap-2 text-[14px] font-bold text-[#1e1e1e] dark:text-white">
        <Award size={16} className="text-[#caa400]" /> Professional Info
      </div>
      <p className="text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
        All fields are required. This drives how you appear on Find Professionals and whether your account is listed as an individual or a company.
      </p>

      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Availability">
          <SelectMenu placeholder="Select availability" value={availability} onChange={setAvailability} options={AVAIL_OPTIONS.map((o) => o.label)} />
        </Field>
        <Field label="Professional practice status">
          <SelectMenu placeholder="Select status" value={practiceStatus} onChange={setPracticeStatus} options={PRACTICE_OPTIONS.map((o) => o.label)} />
        </Field>

        {dbStatus === "licensed" && (
          <div className="sm:col-span-2">
            <Field label="Licence number">
              <input className={inputClass} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. COREN/XXXXX/12345" required />
            </Field>
          </div>
        )}
        {dbStatus === "registered" && (
          <div className="sm:col-span-2">
            <Field label="Registration number">
              <input className={inputClass} value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="e.g. ARCON/REG/004512" required />
            </Field>
          </div>
        )}
        {isCompany && (
          <>
            <Field label="Company name">
              <input className={inputClass} value={practiceCompanyName} onChange={(e) => setPracticeCompanyName(e.target.value)} placeholder="e.g. Arcade Builds Ltd" required />
            </Field>
            <Field label="Company registration number">
              <input className={inputClass} value={practiceRegNumber} onChange={(e) => setPracticeRegNumber(e.target.value)} placeholder="e.g. RAC/004512" required />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Company address">
                <input className={inputClass} value={practiceCompanyAddress} onChange={(e) => setPracticeCompanyAddress(e.target.value)} placeholder="e.g. 12 Allen Avenue, Ikeja" required />
              </Field>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 py-4 mt-2 border-t border-[#ececec] dark:border-white/10">
        <GhostButton type="button" onClick={() => router.refresh()}>Cancel</GhostButton>
        <PrimaryButton type="submit" disabled={pending}>{pending ? <Loader2 size={15} className="animate-spin" /> : "Save professional info"}</PrimaryButton>
      </div>
    </form>
  );
}