"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Modal, Field, inputClass } from "@/components/ui/modal";
import { completeProfessionalOnboarding } from "@/lib/services/profile";

/**
 * "Setup professional as a company" modal, opened from the professional
 * dashboard identity card. Collects the company fields from the original
 * onboarding form (company name, registration number, company address) plus
 * headline/bio/availability, then saves them with practice status = "company"
 * and grants (or keeps) the professional role. On success it refreshes so the
 * dashboard reflects the new profile and the Find Professionals directory
 * shows this account under "Company".
 */
export function CompanySetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [companyKind, setCompanyKind] = useState<"professional" | "non_professional">("professional");
  const [availability, setAvailability] = useState("");
  const [headline, setHeadline] = useState("");
  const [practiceCompanyName, setPracticeCompanyName] = useState("");
  const [practiceRegNumber, setPracticeRegNumber] = useState("");
  const [practiceCompanyAddress, setPracticeCompanyAddress] = useState("");
  const [bio, setBio] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!headline.trim()) { toast.error("Enter your company's profession / headline."); return; }
    if (!practiceCompanyName.trim()) { toast.error("Enter the company name."); return; }
    start(async () => {
      try {
        await completeProfessionalOnboarding({
          headline: headline.trim(),
          bio: bio.trim(),
          availability,
          companyKind,
          practiceStatus: "company",
          practiceLicenceStatus: "company",
          practiceCompanyName: practiceCompanyName.trim(),
          practiceRegNumber: practiceRegNumber.trim(),
          practiceCompanyAddress: practiceCompanyAddress.trim(),
        });
        toast.success("Company account set up — welcome to the professional track!");
        onClose();
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg" title="Set up as a company" subtitle="Tell us a little about your firm so clients and employers can find you.">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-[#ffd716]/50 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] p-3.5">
          <Building2 size={18} className="text-[#caa400] flex-shrink-0 mt-0.5" />
          <p className="text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
            This marks your account as a <span className="font-semibold text-[#1e1e1e] dark:text-white">company professional</span> — it will appear under "Company" on Find Professionals.
          </p>
        </div>

        <Field label="Account type">
          <select className={inputClass} value={companyKind} onChange={(e) => setCompanyKind(e.target.value as "professional" | "non_professional")}>
            <option value="professional">Professional</option>
            <option value="non_professional">Non-professional</option>
          </select>
        </Field>

        <Field label="Company name">
          <input className={inputClass} value={practiceCompanyName} onChange={(e) => setPracticeCompanyName(e.target.value)} placeholder="e.g. Arcade Builds Ltd" />
        </Field>

        <Field label="Company profession / headline">
          <input className={inputClass} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Structural Engineering Firm" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Registration number" hint="Optional">
            <input className={inputClass} value={practiceRegNumber} onChange={(e) => setPracticeRegNumber(e.target.value)} placeholder="e.g. RAC/004512" />
          </Field>
          <Field label="Availability">
            <select className={inputClass} value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="">Select availability</option>
              <option value="open_to_work">Open to work</option>
              <option value="hiring">Hiring</option>
              <option value="none">Not right now</option>
            </select>
          </Field>
        </div>

        <Field label="Company address">
          <input className={inputClass} value={practiceCompanyAddress} onChange={(e) => setPracticeCompanyAddress(e.target.value)} placeholder="e.g. 12 Allen Avenue, Ikeja" />
        </Field>

        <Field label="Short bio" hint="Optional">
          <textarea rows={3} maxLength={280} className={inputClass} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A couple of lines about your firm…" />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">Cancel</button>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-[#ffd716] px-5 py-2.5 text-sm font-semibold text-[#1e1e1e] hover:bg-[#e6c114] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {pending ? <Loader2 size={15} className="animate-spin" /> : null}
            {pending ? "Saving…" : "Save company"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
