"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, inputClass, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { saveEmployerProfile, type EmployerProfileData } from "@/lib/services/employer";
import { uploadFile } from "@/lib/upload-client";

const DEFAULT_LOGO = "/logos/mark-on-light.png";

const COMPANY_SIZES = ["1 - 10 employees", "11 - 50 employees", "51 - 200 employees", "201+ employees"];

/** Mirrors EMPLOYER_TYPES in the onboarding wizard; stored as the snake_case value. */
const EMPLOYER_TYPE_LABELS: Record<string, string> = {
  general_contracting: "General Contracting",
  staffing_recruiting: "Staffing & Recruiting",
  multi_disciplinary: "Multi-disciplinary",
};
const EMPLOYER_TYPE_OPTIONS = Object.values(EMPLOYER_TYPE_LABELS);
const labelToValue = (label: string) =>
  Object.entries(EMPLOYER_TYPE_LABELS).find(([, l]) => l === label)?.[0] ?? "";

/**
 * Employer profile editor.
 *
 * This did not exist. `saveEmployerProfile` was called from exactly one place —
 * the onboarding wizard — so an employer's company name, logo, size, year
 * founded and description were write-once: set during onboarding and then
 * unreachable forever. Meanwhile /dashboard/profile served employers the
 * PROFESSIONAL form (occupation, practice status, skills, education), asking
 * them for things they have no reason to fill in.
 */
export function EmployerProfileForm({ initial }: { initial: EmployerProfileData }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [employerType, setEmployerType] = useState(initial.employerType);
  const [headquarters, setHeadquarters] = useState(initial.headquarters);
  const [companySize, setCompanySize] = useState(initial.companySize);
  const [yearFounded, setYearFounded] = useState(initial.yearFounded);
  const [about, setAbout] = useState(initial.about);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [pending, start] = useTransition();

  const logo = avatarUrl || DEFAULT_LOGO;

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image file."); return; }
    const t = toast.loading("Uploading logo…");
    try {
      const url = await uploadFile(file, "project");
      setAvatarUrl(url);
      toast.success("Logo updated", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed", { id: t });
    }
  }

  function save() {
    if (!name.trim()) { toast.error("Add your company name."); return; }
    start(async () => {
      try {
        await saveEmployerProfile({
          hiringAs: initial.hiringAs,
          name, email, employerType, headquarters, companySize, yearFounded, about,
          avatarUrl,
        });
        toast.success("Changes saved");
        router.refresh();
      } catch {
        toast.error("Could not save changes");
      }
    });
  }

  return (
    <div className="space-y-5">
      {initial.linkedCompanyName && (
        <p className="rounded-xl bg-[#faf9f4] dark:bg-white/[0.03] px-4 py-3 text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
          You hire under <strong className="text-[#1e1e1e] dark:text-white">{initial.linkedCompanyName}</strong>.
          Storefront details live in your <a href="/dashboard/company" className="font-semibold text-[#1e1e1e] underline dark:text-white">company profile</a>.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt="Company logo"
          className={`h-20 w-20 rounded-full ring-2 ring-[#ffd716]/40 ${avatarUrl ? "object-cover" : "object-contain bg-white p-4 dark:bg-white"}`}
        />
        <label className="cursor-pointer rounded-lg border border-[#e3e3e3] px-4 py-2 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white">
          Upload new logo
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {avatarUrl && (
          <button type="button" onClick={() => setAvatarUrl("")} className="text-[13px] font-medium text-[#9a9a9a] transition-colors hover:text-[#e5484d]">
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. UrbanGrid Studios" />
        </Field>
        <Field label="Company email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hiring@company.com" />
        </Field>
        <Field label="Employer type">
          <SelectMenu
            placeholder="Select type"
            value={EMPLOYER_TYPE_LABELS[employerType] ?? ""}
            onChange={(l) => setEmployerType(labelToValue(l))}
            options={EMPLOYER_TYPE_OPTIONS}
          />
        </Field>
        <Field label="Company size">
          <SelectMenu placeholder="Select size" value={companySize} onChange={setCompanySize} options={COMPANY_SIZES} />
        </Field>
        <Field label="Primary address">
          <input className={inputClass} value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="Lagos, Lagos State, Nigeria" />
        </Field>
        <Field label="Year founded">
          <input className={inputClass} inputMode="numeric" value={yearFounded} onChange={(e) => setYearFounded(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2004" />
        </Field>
      </div>

      <Field label="About the company" hint={`${about.length}/2,000`}>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value.slice(0, 2000))}
          rows={4}
          className={inputClass + " resize-none"}
          placeholder="Tell candidates about your company, culture, and what you're building…"
        />
      </Field>

      <div className="flex justify-end">
        <PrimaryButton onClick={save} disabled={pending}>{pending ? "Saving…" : "Save changes"}</PrimaryButton>
      </div>
    </div>
  );
}
