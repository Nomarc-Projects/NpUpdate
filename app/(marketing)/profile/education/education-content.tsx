"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, GraduationCap, X, UserCheck, ImagePlus, FileCheck2 } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SelectMenu } from "@/components/ui/select-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { uploadFile } from "@/lib/upload-client";
import { INSTITUTION_TYPES, institutionsFor } from "@/lib/data/nigeria-institutions";
import { DEGREES_BY_TYPE, STUDY_PROGRAMS } from "@/lib/data/study-programs";
import {
  addEducation, deleteEducation, getReferences, addReference, removeReference, setEducationCertificates,
  type Edu, type Reference, type CertDoc,
} from "@/lib/services/qualifications";

const tmp = () => `tmp_${Math.random().toString(36).slice(2)}`;
/** Sentinel for "not in the list" — reveals a free-text box so anyone who
 *  studied abroad (or at a school we don't carry) can still enter it. */
const OTHER = "__other__";
const INTERNATIONAL = "Other / International";
const blankEdu = { type: "", typeCustom: "", school: "", schoolOther: "", degree: "", field: "", fieldOther: "", startDate: "", endDate: "", current: false, description: "" };
const PROGRAM_OPTIONS = [
  ...STUDY_PROGRAMS.map((p) => ({ value: p, label: p })),
  { value: OTHER, label: "My programme isn't listed…" },
];
const yearOf = (iso: string) => (iso ? Number(iso.slice(0, 4)) : undefined);

// Stable identity — an inline `= []` default allocates a new array every render
// and re-triggers the sync-effect below until React hits max update depth.
const NO_EDU: Edu[] = [];

export function EducationContent({ education = NO_EDU, mode = "full" }: { education?: Edu[]; mode?: "full" | "education" | "references" }) {
  const showEducation = mode !== "references";
  const showReferences = mode !== "education";
  const router = useRouter();
  const [open, setOpen] = useState<null | "edu" | "ref">(null);
  const close = () => setOpen(null);
  const [f, setF] = useState(blankEdu);
  // Certificate/proof documents picked in the Add-Education modal (one or more).
  const [certFiles, setCertFiles] = useState<{ url: string; name: string }[]>([]);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [list, setList] = useState<Edu[]>(education);
  useEffect(() => { setList(education); }, [education]);

  const statusClass = (s: CertDoc["status"]) => (
    s === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
    : s === "rejected" ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
    : "bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/15"
  );
  const proofLabel = (s: CertDoc["status"]) => (s === "approved" ? "Verified" : s === "rejected" ? "Rejected" : "Under review");

  // per-row certificate attachment (existing entries) — multi-select
  const rowProofRef = useRef<HTMLInputElement>(null);
  const modalProofRef = useRef<HTMLInputElement>(null);
  const [proofRowId, setProofRowId] = useState<string | null>(null);
  async function addRowCerts(id: string, files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploadingProof(true);
    try {
      const urls = await Promise.all(arr.map((file) => uploadFile(file, "doc")));
      const prev = list.find((x) => x.id === id)?.certificates ?? [];
      const fresh = urls.filter((u) => !prev.some((c) => c.url === u));
      const newDocs: CertDoc[] = fresh.map((url) => ({ url, status: "pending", submittedAt: new Date().toISOString() }));
      const next = [...prev, ...newDocs];
      setList((p) => p.map((e) => (e.id === id ? { ...e, certificates: next } : e)));
      bg(setEducationCertificates(id, next), () => setList((p) => p.map((e) => (e.id === id ? { ...e, certificates: prev } : e))), newDocs.length === 1 ? "Certificate submitted for review" : `${newDocs.length} certificates submitted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploadingProof(false); }
  }
  function removeRowCert(id: string, url: string) {
    const prev = list.find((x) => x.id === id)?.certificates ?? [];
    const next = prev.filter((c) => c.url !== url);
    setList((p) => p.map((e) => (e.id === id ? { ...e, certificates: next } : e)));
    bg(setEducationCertificates(id, next), () => setList((p) => p.map((e) => (e.id === id ? { ...e, certificates: prev } : e))), "Certificate removed");
  }

  // references (client-fetched)
  const [refs, setRefs] = useState<Reference[]>([]);
  const [rf, setRf] = useState<{ name: string; contactType: "email" | "phone"; contact: string; organization: string }>({ name: "", contactType: "email", contact: "", organization: "" });
  useEffect(() => { getReferences().then(setRefs).catch(() => {}); }, []);

  async function pickProofs(files: FileList | File[] | undefined) {
    const arr = Array.from(files ?? []);
    if (!arr.length) return;
    const oversized = arr.some((file) => file.size > 10 * 1024 * 1024);
    if (oversized) { toast.error("One or more files are too large (max 10MB each)."); return; }
    setUploadingProof(true);
    try {
      const urls = await Promise.all(arr.map((file) => uploadFile(file, "doc")));
      setCertFiles((p) => [...p, ...urls.map((url, i) => ({ url, name: arr[i].name }))]);
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
    const hasProof = certFiles.length > 0;
    const docs: CertDoc[] = certFiles.map((c) => ({ url: c.url, status: "pending", submittedAt: new Date().toISOString() }));
    const row: Edu = {
      id, school, degree: f.degree || null, field: field || null,
      startYear: startYear ?? null, endYear: endYear ?? null,
      current: f.current, description: f.description || null,
      certificates: docs,
    };
    setList((p) => [row, ...p]);
    close();
    const payload = { school, degree: f.degree, field, startYear, endYear, current: f.current, description: f.description, certificates: certFiles.map((c) => c.url) };
    setF(blankEdu); setCertFiles([]);
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
      {/* Education */}
      {showEducation && (
        <>
          <h2 className="text-xl font-bold text-[#1e1e1e] dark:text-white mb-4">Education</h2>
          <button type="button" onClick={() => setOpen("edu")}
            className="w-full flex items-center justify-between gap-4 rounded-xl border border-[#ececec] dark:border-white/10 px-5 py-4 text-left hover:border-[#ffd716] transition-colors">
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center"><GraduationCap size={16} className="text-[#1e1e1e] dark:text-white" /></span>
              <span><span className="block text-sm font-semibold text-[#1e1e1e] dark:text-white">Add Education</span><span className="block text-xs text-[#9a9a9a]">({list.length}/5)</span></span>
            </span>
            <span className="w-7 h-7 rounded-lg border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#1e1e1e] dark:text-white"><Plus size={15} /></span>
          </button>
          {list.length === 0 ? (
            <p className="text-[13px] text-[#9a9a9a] mt-5">No education added yet.</p>
          ) : (
            <div className="space-y-5">
              {list.map((e) => (
                <div key={e.id} className="group relative">
                  <button onClick={() => remove(e.id)} className="absolute right-0 top-0 text-[#b3b3b3] hover:text-[#e5484d] opacity-0 group-hover:opacity-100"><X size={15} /></button>
                  <p className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white">{e.school}</p>
                  <p className="text-[13px] text-[#9a9a9a] mt-0.5">
                    {[[e.degree, e.field].filter(Boolean).join(" - "), [e.startYear, e.endYear].filter(Boolean).join(" - ")].filter(Boolean).join(" • ")}
                  </p>
                  {e.description && <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed mt-2 max-w-[560px]">{e.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {e.certificates.length > 0 && (
                      <div className="flex flex-wrap gap-2.5">
                        {e.certificates.map((c) => (
                          <span key={c.url} className="group/cert inline-flex items-center gap-1.5 rounded-lg border border-[#ececec] dark:border-white/10 px-3 py-1.5">
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1e9df5] transition-colors hover:underline">
                              <FileCheck2 size={13} /> View certificate
                            </a>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${statusClass(c.status)}`}>{proofLabel(c.status)}</span>
                            <button
                              type="button"
                              onClick={() => removeRowCert(e.id, c.url)}
                              title="Remove certificate"
                              className="text-[#b3b3b3] hover:text-[#e5484d]"
                            ><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setProofRowId(e.id); rowProofRef.current?.click(); }}
                      disabled={uploadingProof}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 px-3 py-1.5 text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70 transition-colors hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white disabled:opacity-50"
                    >
                      <ImagePlus size={13} /> {e.certificates.length ? "Add more certificates" : "Upload certificate"}
                    </button>
                    <input ref={rowProofRef} type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { if (proofRowId) addRowCerts(proofRowId, e.target.files ?? []); e.target.value = ""; }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* References */}
      {showReferences && (
        <div className={showEducation ? "mt-8" : ""}>
          <h2 className="text-xl font-bold text-[#1e1e1e] dark:text-white mb-4">References</h2>
          <button type="button" onClick={() => setOpen("ref")}
            className="w-full flex items-center justify-between gap-4 rounded-xl border border-[#ececec] dark:border-white/10 px-5 py-4 text-left hover:border-[#ffd716] transition-colors">
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center"><UserCheck size={16} className="text-[#1e1e1e] dark:text-white" /></span>
              <span><span className="block text-sm font-semibold text-[#1e1e1e] dark:text-white">Add Reference</span><span className="block text-xs text-[#9a9a9a]">Referees who can vouch for you — e.g. a lecturer ({refs.length}/5)</span></span>
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
      )}

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

          {isInternational && (
            <Field label="Type of institution" hint="Not one of the types above — type it below">
              <input className={inputClass} value={f.typeCustom} onChange={(e) => setF({ ...f, typeCustom: e.target.value })} placeholder="e.g. Medical School, Institute of Technology" />
            </Field>
          )}

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

          <Field label="Proof of Qualification" hint="Optional — one or more documents: degree, transcript or certificate. PDF or image, up to 10MB each.">
            <div className="flex items-center gap-3">
              <input
                ref={modalProofRef}
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => { pickProofs(e.target.files ?? []); e.target.value = ""; }}
              />
              <button
                type="button"
                disabled={uploadingProof}
                onClick={() => modalProofRef.current?.click()}
                className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors disabled:opacity-50"
              >
                {uploadingProof ? "Uploading…" : certFiles.length ? "Add more files" : "Browse files"}
              </button>
              <span className="text-[12.5px] text-[#9a9a9a] truncate">{certFiles.length ? `${certFiles.length} file${certFiles.length === 1 ? "" : "s"} attached` : "Degree, Transcript, or Certificate"}</span>
            </div>
            {certFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {certFiles.map((c) => (
                  <span key={c.url} className="inline-flex items-center gap-1.5 rounded-lg border border-[#ececec] dark:border-white/10 px-2.5 py-1 text-[12px] text-[#6b6b6b] dark:text-white/70">
                    {c.name}
                    <button type="button" onClick={() => setCertFiles((p) => p.filter((x) => x.url !== c.url))} className="text-[#b3b3b3] hover:text-[#e5484d]"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
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
