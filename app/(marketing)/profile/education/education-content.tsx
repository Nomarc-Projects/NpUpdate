"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, GraduationCap, X, UserCheck } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SelectMenu } from "@/components/ui/select-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { uploadFile } from "@/lib/upload-client";
import { INSTITUTION_TYPES, institutionsFor } from "@/lib/data/nigeria-institutions";
import { DEGREES_BY_TYPE, STUDY_PROGRAMS } from "@/lib/data/study-programs";
import {
  addEducation, deleteEducation, getReferences, addReference, removeReference,
  type Edu, type Reference,
} from "@/lib/services/qualifications";

const tmp = () => `tmp_${Math.random().toString(36).slice(2)}`;
/** Sentinel for "not in the list" — reveals a free-text box so anyone who
 *  studied abroad (or at a school we don't carry) can still enter it. */
const OTHER = "__other__";
const INTERNATIONAL = "Other / International";
const blankEdu = { type: "", school: "", schoolOther: "", degree: "", field: "", fieldOther: "", startDate: "", endDate: "", current: false, description: "" };
const PROGRAM_OPTIONS = [
  ...STUDY_PROGRAMS.map((p) => ({ value: p, label: p })),
  { value: OTHER, label: "My programme isn't listed…" },
];
const yearOf = (iso: string) => (iso ? Number(iso.slice(0, 4)) : undefined);

// Stable identity — an inline `= []` default allocates a new array every render
// and re-triggers the sync-effect below until React hits max update depth.
const NO_EDU: Edu[] = [];

export function EducationContent({ education = NO_EDU }: { education?: Edu[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<null | "edu" | "ref">(null);
  const close = () => setOpen(null);
  const [f, setF] = useState(blankEdu);
  const [proofUrl, setProofUrl] = useState("");
  const [proofName, setProofName] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [list, setList] = useState<Edu[]>(education);
  useEffect(() => { setList(education); }, [education]);

  // references (client-fetched)
  const [refs, setRefs] = useState<Reference[]>([]);
  const [rf, setRf] = useState<{ name: string; contactType: "email" | "phone"; contact: string; organization: string }>({ name: "", contactType: "email", contact: "", organization: "" });
  useEffect(() => { getReferences().then(setRefs).catch(() => {}); }, []);

  const proofRef = useRef<HTMLInputElement>(null);
  async function pickProof(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)."); return; }
    setUploadingProof(true);
    try {
      const url = await uploadFile(file, "doc");
      setProofUrl(url);
      setProofName(file.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploadingProof(false); }
  }

  const bg = (action: Promise<unknown>, revert: () => void, ok?: string) => {
    if (ok) toast.success(ok);
    action.then(() => router.refresh()).catch((e) => { revert(); toast.error(e instanceof Error ? e.message : "Something went wrong"); });
  };

  // Institution/programme can come from the dropdown or the "not listed" box.
  const isInternational = f.type === INTERNATIONAL;
  const school = (isInternational || f.school === OTHER ? f.schoolOther : f.school).trim();
  const field = (f.field === OTHER ? f.fieldOther : f.field).trim();

  function submit() {
    if (!school) { toast.error("Institution is required"); return; }
    const id = tmp();
    const startYear = yearOf(f.startDate);
    const endYear = f.current ? undefined : yearOf(f.endDate);
    const hasProof = !!proofUrl;
    const row: Edu = {
      id, school, degree: f.degree || null, field: field || null,
      startYear: startYear ?? null, endYear: endYear ?? null,
      current: f.current, description: f.description || null,
      proofUrl: proofUrl || null, proofStatus: hasProof ? "pending" : null,
    };
    setList((p) => [row, ...p]);
    close();
    const payload = { school, degree: f.degree, field, startYear, endYear, current: f.current, description: f.description, proofUrl };
    setF(blankEdu); setProofUrl(""); setProofName("");
    // The "Document Submitted" confirmation only appears when a proof was
    // actually attached — otherwise there is nothing under review.
    bg(addEducation(payload), () => setList((p) => p.filter((x) => x.id !== id)), hasProof ? undefined : "Education added");
    if (hasProof) setSubmitted(true);
  }
  function remove(id: string) {
    const prev = list; setList((p) => p.filter((x) => x.id !== id));
    bg(deleteEducation(id), () => setList(prev), "Removed");
  }

  function submitRef() {
    if (!rf.name.trim()) { toast.error("Reference name is required"); return; }
    const id = tmp();
    const row: Reference = { id, name: rf.name.trim(), contactType: rf.contactType, contact: rf.contact || null, organization: rf.organization || null };
    setRefs((p) => [...p, row]);
    close();
    const payload = { ...rf };
    setRf({ name: "", contactType: "email", contact: "", organization: "" });
    bg(addReference(payload), () => setRefs((p) => p.filter((x) => x.id !== id)), "Reference added");
  }
  function removeRef(id: string) {
    const prev = refs; setRefs((p) => p.filter((x) => x.id !== id));
    bg(removeReference(id), () => setRefs(prev), "Removed");
  }

  return (
    <div>
      {/* Add education row */}
      <button type="button" onClick={() => setOpen("edu")}
        className="w-full flex items-center justify-between gap-4 rounded-xl border border-[#ececec] dark:border-white/10 px-5 py-4 text-left hover:border-[#ffd716] transition-colors">
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center"><GraduationCap size={16} className="text-[#1e1e1e] dark:text-white" /></span>
          <span><span className="block text-sm font-semibold text-[#1e1e1e] dark:text-white">Education</span><span className="block text-xs text-[#9a9a9a]">({list.length}/5)</span></span>
        </span>
        <span className="w-7 h-7 rounded-lg border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#1e1e1e] dark:text-white"><Plus size={15} /></span>
      </button>

      <h2 className="text-xl font-bold text-[#1e1e1e] dark:text-white mt-8 mb-4">Education</h2>
      {list.length === 0 ? (
        <p className="text-[13px] text-[#9a9a9a]">No education added yet.</p>
      ) : (
        <div className="space-y-5">
          {list.map((e) => (
            <div key={e.id} className="group relative">
              <button onClick={() => remove(e.id)} className="absolute right-0 top-0 text-[#b3b3b3] hover:text-[#e5484d] opacity-0 group-hover:opacity-100"><X size={15} /></button>
              <p className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white">{e.school}</p>
              <p className="text-[13px] text-[#9a9a9a] mt-0.5">
                {[[e.degree, e.field].filter(Boolean).join(" - "), [e.startYear, e.endYear].filter(Boolean).join(" - ")].filter(Boolean).join(" • ")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* References */}
      <div className="mt-10">
        <button type="button" onClick={() => setOpen("ref")}
          className="w-full flex items-center justify-between gap-4 rounded-xl border border-[#ececec] dark:border-white/10 px-5 py-4 text-left hover:border-[#ffd716] transition-colors">
          <span className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center"><UserCheck size={16} className="text-[#1e1e1e] dark:text-white" /></span>
            <span><span className="block text-sm font-semibold text-[#1e1e1e] dark:text-white">References</span><span className="block text-xs text-[#9a9a9a]">Referees who can vouch for you — e.g. a lecturer ({refs.length}/5)</span></span>
          </span>
          <span className="w-7 h-7 rounded-lg border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#1e1e1e] dark:text-white"><Plus size={15} /></span>
        </button>
        <div className="mt-5 space-y-3">
          {refs.map((r) => (
            <div key={r.id} className="group relative rounded-xl border border-[#ececec] dark:border-white/10 p-4">
              <button onClick={() => removeRef(r.id)} className="absolute right-3 top-3 text-[#b3b3b3] hover:text-[#e5484d] opacity-0 group-hover:opacity-100"><X size={15} /></button>
              <p className="text-[14px] font-semibold text-[#1e1e1e] dark:text-white">{r.name}</p>
              <p className="text-[13px] text-[#9a9a9a] mt-0.5">{[r.organization, r.contact].filter(Boolean).join(" • ")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Education modal */}
      <Modal open={open === "edu"} onClose={close} title="Add Education" subtitle="Up to 5 schools you've attended" maxWidth="max-w-[520px]"
        footer={<><GhostButton type="button" onClick={close}>Cancel</GhostButton><PrimaryButton type="button" onClick={submit}>Add</PrimaryButton></>}>
        <div className="space-y-4">
          <Field label="Type of institution">
            <SelectMenu
              placeholder="Select institution type"
              value={f.type}
              onChange={(v) => setF({ ...f, type: v, school: "", schoolOther: "", degree: "" })}
              options={[...INSTITUTION_TYPES]}
            />
          </Field>

          {isInternational ? (
            <Field label="Institution" hint="Studied outside Nigeria — type the school's full name">
              <input className={inputClass} value={f.schoolOther} onChange={(e) => setF({ ...f, schoolOther: e.target.value })} placeholder="e.g. Massachusetts Institute of Technology" />
            </Field>
          ) : (
            <Field label="Institution" hint={f.type ? undefined : "Pick an institution type first"}>
              <SearchableSelect
                options={f.type ? [
                  ...institutionsFor(f.type).map((i) => ({ value: i.name, label: i.name, hint: i.ownership, keywords: i.acronym })),
                  { value: OTHER, label: "My institution isn't listed…" },
                ] : []}
                value={f.school}
                onChange={(v) => setF({ ...f, school: v })}
                placeholder={f.type ? "Search accredited institutions" : "Select institution type first"}
                searchPlaceholder="Search by name or acronym…"
              />
            </Field>
          )}
          {!isInternational && f.school === OTHER && (
            <Field label="Institution name">
              <input className={inputClass} value={f.schoolOther} onChange={(e) => setF({ ...f, schoolOther: e.target.value })} placeholder="Type the institution's full name" />
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Award" hint={f.type ? undefined : "Pick an institution type first"}>
              <SearchableSelect
                options={(DEGREES_BY_TYPE[f.type] ?? []).map((d) => ({ value: d, label: d }))}
                value={f.degree}
                onChange={(v) => setF({ ...f, degree: v })}
                placeholder={f.type ? "Select award" : "Select institution type first"}
                searchPlaceholder="Search awards…"
              />
            </Field>
            <Field label="Programme / field of study">
              <SearchableSelect options={PROGRAM_OPTIONS} value={f.field} onChange={(v) => setF({ ...f, field: v })} placeholder="Select programme" searchPlaceholder="Search programmes…" />
            </Field>
          </div>
          {f.field === OTHER && (
            <Field label="Programme name">
              <input className={inputClass} value={f.fieldOther} onChange={(e) => setF({ ...f, fieldOther: e.target.value })} placeholder="Type your programme" />
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start date"><DatePicker value={f.startDate} onChange={(v) => setF({ ...f, startDate: v })} placeholder="Start date" /></Field>
            {/* An end date and "currently studying" contradict each other, so
                the picker is disabled and cleared while the box is ticked. */}
            <Field label="End date">
              <DatePicker value={f.current ? "" : f.endDate} onChange={(v) => setF({ ...f, endDate: v })} placeholder={f.current ? "In progress" : "End date"} disabled={f.current} />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 text-[13px] text-[#1e1e1e] dark:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={f.current}
              onChange={(e) => setF({ ...f, current: e.target.checked, endDate: e.target.checked ? "" : f.endDate })}
              className="w-4 h-4 rounded border-[#d4d4d4] dark:border-white/20 accent-[#ffd716]"
            />
            I am currently studying here
          </label>

          <Field label="Proof of Qualification" hint="Optional — degree, transcript or certificate. PDF or image, up to 10MB.">
            <div className="flex items-center gap-3">
              <input
                ref={proofRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => { pickProof(e.target.files?.[0]); e.target.value = ""; }}
              />
              <button
                type="button"
                disabled={uploadingProof}
                onClick={() => proofRef.current?.click()}
                className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors disabled:opacity-50"
              >
                {uploadingProof ? "Uploading…" : proofName ? "Replace file" : "Browse files"}
              </button>
              <span className="text-[12.5px] text-[#9a9a9a] truncate">{proofName || "Degree, Transcript, or Certificate"}</span>
            </div>
          </Field>

          <Field label="Description" hint="Optional">
            <textarea
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value.slice(0, 500) })}
              rows={2}
              className={inputClass + " resize-none"}
              placeholder="Relevant coursework, honors, or extracurricular activities…"
            />
          </Field>
        </div>
      </Modal>

      {/* Shown only when a proof document was attached — the entry itself is
          live immediately; it is the document that waits on review. */}
      <Modal open={submitted} onClose={() => setSubmitted(false)} title="Document Submitted" maxWidth="max-w-[480px]"
        footer={<PrimaryButton type="button" onClick={() => setSubmitted(false)}>Close</PrimaryButton>}>
        <p className="text-[13.5px] leading-relaxed text-[#6b6b6b] dark:text-white/70">
          Your proof of qualification has been securely submitted for review. Approval usually takes 24-48 hours.
        </p>
      </Modal>

      {/* Reference modal */}
      <Modal open={open === "ref"} onClose={close} title="Add a reference" subtitle="A referee who can speak to your work — e.g. a lecturer or past employer." maxWidth="max-w-[520px]"
        footer={<><GhostButton type="button" onClick={close}>Cancel</GhostButton><PrimaryButton type="button" onClick={submitRef}>Add</PrimaryButton></>}>
        <div className="space-y-4">
          <Field label="Full name"><input className={inputClass} value={rf.name} onChange={(e) => setRf({ ...rf, name: e.target.value })} placeholder="Prof. Adewale Johnson" /></Field>
          <Field label="Organization"><input className={inputClass} value={rf.organization} onChange={(e) => setRf({ ...rf, organization: e.target.value })} placeholder="Obafemi Awolowo University" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
            <Field label="Contact via">
              <div className="flex rounded-lg border border-[#e3e3e3] dark:border-white/15 overflow-hidden">
                {(["email", "phone"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setRf({ ...rf, contactType: t })} className={`flex-1 py-2.5 text-[13px] font-medium capitalize transition-colors ${rf.contactType === t ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#6b6b6b] dark:text-white/60 hover:bg-[#f7f7f7] dark:hover:bg-white/5"}`}>{t}</button>
                ))}
              </div>
            </Field>
            <Field label={rf.contactType === "email" ? "Email address" : "Phone number"}>
              <input className={inputClass} value={rf.contact} onChange={(e) => setRf({ ...rf, contact: e.target.value })} placeholder={rf.contactType === "email" ? "name@org.com" : "+234 800 000 0000"} inputMode={rf.contactType === "email" ? "email" : "tel"} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
