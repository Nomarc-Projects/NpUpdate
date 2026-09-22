"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Briefcase, Sparkles, Target, Award, X, Link as LinkIcon, ShieldCheck, ImagePlus, type LucideIcon } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/upload-client";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { REGULATORY_BODIES } from "@/lib/regulatory-bodies";
import {
  addExperience, deleteExperience, addSkill, removeSkill, addCertification, deleteCertification,
  getRegistrations, addRegistration, removeRegistration, setExperiencePhotos,
  type Experience, type Cert, type Registration,
} from "@/lib/services/qualifications";

type Which = null | "work" | "skill" | "spec" | "cert" | "reg";
type Named = { id: string; name: string };
const tmp = () => `tmp_${Math.random().toString(36).slice(2)}`;
const YEAR_OPTIONS = Array.from({ length: 60 }, (_, i) => { const y = String(new Date().getFullYear() + 1 - i); return { value: y, label: y }; });

function AddRow({ Icon, label, count, onAdd }: { Icon: LucideIcon; label: string; count: string; onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} className="w-full flex items-center justify-between gap-4 rounded-xl border border-[#ececec] dark:border-white/10 px-5 py-4 text-left hover:border-[#ffd716] transition-colors">
      <span className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center"><Icon size={16} className="text-[#1e1e1e] dark:text-white" /></span>
        <span>
          <span className="block text-sm font-semibold text-[#1e1e1e] dark:text-white">{label}</span>
          <span className="block text-xs text-[#9a9a9a]">{count}</span>
        </span>
      </span>
      <span className="w-7 h-7 rounded-lg border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#1e1e1e] dark:text-white"><Plus size={15} /></span>
    </button>
  );
}
function SectionHeader({ title, className = "mt-8 mb-4" }: { title: string; className?: string }) {
  return <div className={`flex items-center justify-between ${className}`}><h2 className="text-xl font-bold text-[#1e1e1e] dark:text-white">{title}</h2></div>;
}
function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f3d34d] bg-[#fffae6] dark:bg-[#ffd716]/10 dark:border-[#ffd716]/40 px-3.5 py-1.5 text-[13px] text-[#1e1e1e] dark:text-white/90">
      {children}
      {onRemove && <button type="button" onClick={onRemove} className="text-[#9a9a9a] hover:text-[#e5484d]"><X size={13} /></button>}
    </span>
  );
}

/** Compact "browse" button that opens a hidden file input — for per-entry,
 *  multi-file uploads where a full dropzone would be overkill. */
function PhotoButton({ label, accept = "image/png,image/jpeg,image/webp", multiple = true, disabled = false, onPick }: { label: string; accept?: string; multiple?: boolean; disabled?: boolean; onPick: (files: FileList | File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => { if (e.target.files?.length) onPick(e.target.files); e.target.value = ""; }} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 px-3 py-1.5 text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70 transition-colors hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white disabled:opacity-50"
      >
        <ImagePlus size={13} /> {label}
      </button>
    </>
  );
}

function WorkGallery({ entry, onRemove }: { entry: Experience; onRemove: (url: string) => void }) {
  if (!entry.workPhotos.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {entry.workPhotos.map((p) => (
        <div key={p} className="group/photo relative">
          <img src={p} alt={`${entry.title} — work photo`} className="h-20 w-28 rounded-lg border border-[#ececec] bg-white object-cover dark:border-white/10" />
          <button
            type="button"
            onClick={() => onRemove(p)}
            title="Remove photo"
            className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-[#ececec] bg-white text-[#b3b3b3] shadow-sm hover:text-[#e5484d] group-hover/photo:flex dark:border-white/10"
          ><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}

function fmtRange(s: string | null, e: string | null, current: boolean) {
  const f = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", year: "numeric" }) : "");
  if (!s && !e) return "";
  return `${f(s)} – ${current ? "Present" : f(e) || "—"}`;
}

// Stable identities for the "no data" case: inline `= []` defaults allocated a
// fresh array every render, so the sync-effects below saw a new dependency on
// every pass and setState looped until React gave up.
const NO_EXPERIENCE: Experience[] = [];
const NO_NAMED: Named[] = [];
const NO_CERTS: Cert[] = [];

export function QualificationsContent({
  experience = NO_EXPERIENCE, skills = NO_NAMED, specializations = NO_NAMED, certifications = NO_CERTS, practiceStatus = "",
  mode = "full",
}: {
  experience?: Experience[]; skills?: Named[]; specializations?: Named[]; certifications?: Cert[]; practiceStatus?: string;
  /** Which sections to render. "full" = everything; "experience" = work
   *  experience + specializations; "skills" = skills/specializations skipped,
   *  i.e. skills, certifications and registrations only. */
  mode?: "full" | "experience" | "skills";
}) {
  const showWork = mode !== "skills";
  const showSkillsAndCerts = mode !== "experience";
  const showSpecs = mode !== "skills";
  const router = useRouter();
  const [open, setOpen] = useState<Which>(null);
  const close = () => setOpen(null);

  // Certifications and professional registrations only apply to registered or
  // licensed professionals — mirroring the onboarding gate. Everyone else keeps
  // experience/skills/specializations but not the credential sections.
  const canEditCredentials = practiceStatus === "registered" || practiceStatus === "licensed";

  // ── optimistic local lists (seeded from props, reconciled after server refresh) ──
  const [exp, setExp] = useState<Experience[]>(experience);
  const [sk, setSk] = useState<Named[]>(skills);
  const [sp, setSp] = useState<Named[]>(specializations);
  const [ce, setCe] = useState<Cert[]>(certifications);
  useEffect(() => { setExp(experience); }, [experience]);
  useEffect(() => { setSk(skills); }, [skills]);
  useEffect(() => { setSp(specializations); }, [specializations]);
  useEffect(() => { setCe(certifications); }, [certifications]);

  /** Fire a server action in the background; revert + toast on failure. */
  const bg = (action: Promise<unknown>, revert: () => void, ok?: string) => {
    if (ok) toast.success(ok);
    action.then(() => router.refresh()).catch((e) => { revert(); toast.error(e instanceof Error ? e.message : "Something went wrong"); });
  };

  // work modal fields
  const [w, setW] = useState({ title: "", company: "", description: "", location: "", workplaceType: "", current: false, workPhotos: [] as string[] });
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [uploadingWork, setUploadingWork] = useState(false);
  const [skillText, setSkillText] = useState("");
  const [specText, setSpecText] = useState("");
  const [cert, setCert] = useState({ name: "", issuer: "", year: "", url: "" });

  // professional registrations (client-fetched) + searchable option sources
  const [regs, setRegs] = useState<Registration[]>([]);
  const [reg, setReg] = useState({ body: "", number: "" });
  const [bodyOptions, setBodyOptions] = useState(REGULATORY_BODIES);
  useEffect(() => {
    getRegistrations().then(setRegs).catch(() => {});
    getTaxonomy("regulatory_body").then((extra) => {
      const have = new Set(REGULATORY_BODIES.map((b) => b.value));
      const merged = [...REGULATORY_BODIES, ...extra.filter((e) => !have.has(e)).map((e) => ({ value: e, label: e, hint: "Custom" }))];
      setBodyOptions(merged);
    }).catch(() => {});
  }, []);
  const bodyLabel = (v: string) => bodyOptions.find((b) => b.value === v)?.label ?? v;

  // ── optimistic handlers ──
  function submitExperience() {
    if (!w.title.trim()) { toast.error("Role is required"); return; }
    const id = tmp();
    const row: Experience = { id, title: w.title.trim(), company: w.company.trim(), description: w.description || null, location: w.location || null, workplaceType: w.workplaceType || null, startDate: expStart || null, endDate: w.current ? null : expEnd || null, current: w.current, workPhotos: w.workPhotos };
    setExp((p) => [row, ...p]);
    close();
    const payload = { ...w, startDate: expStart, endDate: expEnd };
    setW({ title: "", company: "", description: "", location: "", workplaceType: "", current: false, workPhotos: [] }); setExpStart(""); setExpEnd("");
    bg(addExperience(payload), () => setExp((p) => p.filter((x) => x.id !== id)), "Experience added");
  }
  function removeExperience(id: string) {
    const prev = exp; setExp((p) => p.filter((x) => x.id !== id));
    bg(deleteExperience(id), () => setExp(prev), "Removed");
  }
  /** Upload one or more photos onto an existing experience row. */
  async function addRowWorkPhotos(id: string, files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploadingWork(true);
    try {
      const urls = await Promise.all(arr.map((f) => uploadFile(f, "project")));
      const prev = exp.find((x) => x.id === id)?.workPhotos ?? [];
      const next = [...prev, ...urls.filter((u) => !prev.includes(u))];
      setExp((p) => p.map((x) => (x.id === id ? { ...x, workPhotos: next } : x)));
      bg(setExperiencePhotos(id, next), () => setExp((p) => p.map((x) => (x.id === id ? { ...x, workPhotos: prev } : x))), urls.length === 1 ? "Photo added" : `${urls.length} photos added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploadingWork(false); }
  }
  function removeRowWorkPhoto(id: string, url: string) {
    const prev = exp.find((x) => x.id === id)?.workPhotos ?? [];
    const next = prev.filter((u) => u !== url);
    setExp((p) => p.map((x) => (x.id === id ? { ...x, workPhotos: next } : x)));
    bg(setExperiencePhotos(id, next), () => setExp((p) => p.map((x) => (x.id === id ? { ...x, workPhotos: prev } : x))), "Photo removed");
  }
  function submitSkills(kind: "skill" | "specialization") {
    const raw = kind === "skill" ? skillText : specText;
    const set = kind === "skill" ? setSk : setSp;
    const clearText = kind === "skill" ? setSkillText : setSpecText;
    const existing = (kind === "skill" ? sk : sp).map((x) => x.name.toLowerCase());
    const toAdd = raw.split(/[,\n]/).map((n) => n.trim()).filter((n) => n && !existing.includes(n.toLowerCase()));
    if (!toAdd.length) { close(); return; }
    const rows = toAdd.map((name) => ({ id: tmp(), name: name.trim() }));
    set((p) => [...p, ...rows]);
    close(); clearText("");
    rows.forEach((r) => bg(addSkill(r.name, kind), () => set((p) => p.filter((x) => x.id !== r.id))));
    toast.success(kind === "skill" ? "Skills added" : "Specializations added");
  }
  function submitReg() {
    if (!reg.body.trim()) { toast.error("Select a regulatory body"); return; }
    const id = tmp();
    const row: Registration = { id, body: reg.body, registrationNumber: reg.number || null };
    setRegs((p) => [...p, row]);
    close(); const payload = { body: reg.body, registrationNumber: reg.number };
    setReg({ body: "", number: "" });
    bg(addRegistration(payload), () => setRegs((p) => p.filter((x) => x.id !== id)), "Registration added");
  }
  function removeReg(id: string) {
    const prev = regs; setRegs((p) => p.filter((x) => x.id !== id));
    bg(removeRegistration(id), () => setRegs(prev), "Removed");
  }
  function removeSkillLocal(id: string, kind: "skill" | "specialization") {
    const set = kind === "skill" ? setSk : setSp; const list = kind === "skill" ? sk : sp;
    const prev = list; set((p) => p.filter((x) => x.id !== id));
    bg(removeSkill(id), () => set(prev), "Removed");
  }
  function submitCert() {
    if (!cert.name.trim()) { toast.error("Certification name required"); return; }
    const id = tmp();
    const row: Cert = { id, name: cert.name.trim(), issuer: cert.issuer || null, year: cert.year ? Number(cert.year) : null, url: cert.url || null };
    setCe((p) => [row, ...p]);
    close(); const payload = { name: cert.name, issuer: cert.issuer, year: cert.year ? Number(cert.year) : undefined, url: cert.url };
    setCert({ name: "", issuer: "", year: "", url: "" });
    bg(addCertification(payload), () => setCe((p) => p.filter((x) => x.id !== id)), "Certification added");
  }
  function removeCert(id: string) {
    const prev = ce; setCe((p) => p.filter((x) => x.id !== id));
    bg(deleteCertification(id), () => setCe(prev), "Removed");
  }

  return (
    <div>
      {/* Work experience */}
      {showWork && (
        <>
          <SectionHeader title="Work experience" className="mb-4" />
          <AddRow Icon={Briefcase} label="Add Most recent work experiences" count={`(${exp.length}/5)`} onAdd={() => setOpen("work")} />
          {exp.length === 0 ? <p className="text-[13px] text-[#9a9a9a] mt-5">No work experience yet — add your most recent roles.</p> : (
            <div className="space-y-5">
              {exp.map((x) => (
                <div key={x.id} className="group relative">
                  <button onClick={() => removeExperience(x.id)} className="absolute right-0 top-0 text-[#b3b3b3] hover:text-[#e5484d] opacity-0 group-hover:opacity-100"><X size={15} /></button>
                  <p className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white">{x.title}{x.company ? ` • ${x.company}` : ""}</p>
                  <p className="text-[13px] text-[#9a9a9a] mt-0.5">{fmtRange(x.startDate, x.endDate, x.current)}</p>
                  {(x.location || x.workplaceType) && <p className="text-[13px] text-[#9a9a9a]">{[x.location, x.workplaceType].filter(Boolean).join(" • ")}</p>}
                  {x.description && <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed mt-3 max-w-[560px]">{x.description}</p>}
                  <WorkGallery entry={x} onRemove={(u) => removeRowWorkPhoto(x.id, u)} />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <PhotoButton label={x.workPhotos.length ? "Add more photos" : "Upload work photos"} disabled={uploadingWork} onPick={(files) => addRowWorkPhotos(x.id, files)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Skills */}
      {showSkillsAndCerts && (
        <div className={showWork ? "mt-8" : ""}>
          <SectionHeader title="Skills" />
          <AddRow Icon={Sparkles} label="Add Skills" count={`(${sk.length}/10)`} onAdd={() => setOpen("skill")} />
          <div className="flex flex-wrap gap-2.5 mt-5">{sk.map((s) => <Chip key={s.id} onRemove={() => removeSkillLocal(s.id, "skill")}>{s.name}</Chip>)}</div>
        </div>
      )}

      {/* Specializations */}
      {showSpecs && (
        <div className={showWork || showSkillsAndCerts ? "mt-8" : ""}>
          <SectionHeader title="Specializations" />
          <AddRow Icon={Target} label="Area of Specialization" count={`(${sp.length}/5)`} onAdd={() => setOpen("spec")} />
          <div className="flex flex-wrap gap-2.5 mt-5">{sp.map((s) => <Chip key={s.id} onRemove={() => removeSkillLocal(s.id, "specialization")}>{s.name}</Chip>)}</div>
        </div>
      )}

      {/* Certifications — registered / licensed professionals only */}
      {showSkillsAndCerts && canEditCredentials && (
        <div className="mt-8">
          <SectionHeader title="Certifications" />
          <AddRow Icon={Award} label="Add Certification" count={`(${ce.length}/5)`} onAdd={() => setOpen("cert")} />
          <div className="mt-5 space-y-4">
            {ce.map((c) => (
              <div key={c.id} className="group relative">
                <button onClick={() => removeCert(c.id)} className="absolute right-0 top-0 text-[#b3b3b3] hover:text-[#e5484d] opacity-0 group-hover:opacity-100"><X size={15} /></button>
                <p className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1.5">
                  {c.name}
                  {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#1e9df5] hover:underline" title="View credential"><LinkIcon size={13} /></a>}
                </p>
                <p className="text-[13px] text-[#9a9a9a]">{[c.issuer, c.year].filter(Boolean).join(" • ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Professional registration — registered / licensed professionals only */}
      {showSkillsAndCerts && canEditCredentials && (
        <div className="mt-8">
          <SectionHeader title="Professional registration" />
          <AddRow Icon={ShieldCheck} label="Add Registration" count={`(${regs.length})`} onAdd={() => setOpen("reg")} />
          <div className="mt-5 space-y-3">
            {regs.map((r) => (
              <div key={r.id} className="group relative flex items-start gap-3 rounded-xl border border-[#ececec] dark:border-white/10 p-4">
                <span className="w-9 h-9 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] flex-shrink-0"><ShieldCheck size={17} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1e1e1e] dark:text-white">{bodyLabel(r.body)}</p>
                  {r.registrationNumber && <p className="text-[13px] text-[#9a9a9a]">Reg. no: {r.registrationNumber}</p>}
                </div>
                <button onClick={() => removeReg(r.id)} className="text-[#b3b3b3] hover:text-[#e5484d] opacity-0 group-hover:opacity-100"><X size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <Modal open={open === "work"} onClose={close} title="Add Work Experience" subtitle="Up to 5 of your most recent roles" maxWidth="max-w-[520px]"
        footer={<><GhostButton type="button" onClick={close}>Cancel</GhostButton><PrimaryButton type="button" onClick={submitExperience}>Add</PrimaryButton></>}>
        <div className="space-y-4">
          <Field label="Role / Job title"><input className={inputClass} value={w.title} onChange={(e) => setW({ ...w, title: e.target.value })} placeholder="Architect" /></Field>
          <Field label="Company Name" hint="Optional"><input className={inputClass} value={w.company} onChange={(e) => setW({ ...w, company: e.target.value })} placeholder="Company name" /></Field>
          <Field label="Description"><input className={inputClass} value={w.description} onChange={(e) => setW({ ...w, description: e.target.value })} placeholder="What did you do?" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Location"><input className={inputClass} value={w.location} onChange={(e) => setW({ ...w, location: e.target.value })} placeholder="City, State" /></Field>
            <Field label="Workplace type"><SelectMenu placeholder="Remote" value={w.workplaceType} onChange={(v) => setW({ ...w, workplaceType: v })} options={["Remote", "On-site", "Hybrid"]} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start date"><DatePicker value={expStart} onChange={setExpStart} placeholder="Start date" /></Field>
            <Field label="End date"><DatePicker value={expEnd} onChange={setExpEnd} placeholder="End date" /></Field>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60"><input type="checkbox" checked={w.current} onChange={(e) => setW({ ...w, current: e.target.checked })} className="accent-[#ffd716]" /> I am currently working in this role</label>
          <Field label="Work photos" hint="Optional — add one or more photos of the work this role delivered">
            <FileUpload multiple accept="image/png,image/jpeg,image/webp" maxSizeMB={5} label="Upload work photos" upload={(f) => uploadFile(f, "project")} onChange={(items) => setW({ ...w, workPhotos: items.map((i) => i.url!).filter(Boolean) })} />
          </Field>
        </div>
      </Modal>

      <Modal open={open === "skill"} onClose={close} title="Add Skills" subtitle="Type your skills, separated by commas (max. 10)."
        footer={<><GhostButton type="button" onClick={close}>Cancel</GhostButton><PrimaryButton type="button" onClick={() => submitSkills("skill")}>Add</PrimaryButton></>}>
        <Field label="Skills" hint="Comma-separated"><input className={inputClass} value={skillText} onChange={(e) => setSkillText(e.target.value)} placeholder="e.g. AutoCAD, Project Management, Rendering" /></Field>
      </Modal>

      <Modal open={open === "spec"} onClose={close} title="Add Specialization" subtitle="Type your specializations, separated by commas (max. 5)."
        footer={<><GhostButton type="button" onClick={close}>Cancel</GhostButton><PrimaryButton type="button" onClick={() => submitSkills("specialization")}>Add</PrimaryButton></>}>
        <Field label="Specializations" hint="Comma-separated"><input className={inputClass} value={specText} onChange={(e) => setSpecText(e.target.value)} placeholder="e.g. Residential Design, Urban Planning" /></Field>
      </Modal>

      <Modal open={open === "reg"} onClose={close} title="Add professional registration" subtitle="Select your regulatory / professional body and enter your registration number." maxWidth="max-w-[520px]"
        footer={<><GhostButton type="button" onClick={close}>Cancel</GhostButton><PrimaryButton type="button" onClick={submitReg}>Add</PrimaryButton></>}>
        <div className="space-y-4">
          <Field label="Regulatory / professional body"><SearchableSelect options={bodyOptions} value={reg.body} onChange={(v) => setReg({ ...reg, body: v })} placeholder="Select a body" searchPlaceholder="Search bodies (ARCON, COREN…)" /></Field>
          <Field label="Registration number" hint="Optional"><input className={inputClass} value={reg.number} onChange={(e) => setReg({ ...reg, number: e.target.value })} placeholder="e.g. ARC/2021/12345" /></Field>
        </div>
      </Modal>

      <Modal open={open === "cert"} onClose={close} title="Add Certification" subtitle="Add a professional certification (max. 5)."
        footer={<><GhostButton type="button" onClick={close}>Cancel</GhostButton><PrimaryButton type="button" onClick={submitCert}>Add</PrimaryButton></>}>
        <div className="space-y-4">
          <Field label="Certification name"><input className={inputClass} value={cert.name} onChange={(e) => setCert({ ...cert, name: e.target.value })} placeholder="LEED AP" /></Field>
          <Field label="Issuing organization"><input className={inputClass} value={cert.issuer} onChange={(e) => setCert({ ...cert, issuer: e.target.value })} placeholder="USGBC" /></Field>
          <Field label="Year"><SearchableSelect options={YEAR_OPTIONS} value={cert.year} onChange={(v) => setCert({ ...cert, year: v })} placeholder="Select year" searchPlaceholder="Year…" /></Field>
          <Field label="Credential link" hint="Optional"><input className={inputClass} value={cert.url} onChange={(e) => setCert({ ...cert, url: e.target.value })} placeholder="https://credential.net/…" inputMode="url" /></Field>
          <Field label="Or upload the certificate" hint="Optional · image or PDF">
            <FileUpload accept="image/png,image/jpeg,image/webp,.pdf" maxSizeMB={10} label="Upload certificate" hint="PNG, JPG or PDF · max 10MB" upload={(f) => uploadFile(f, "doc")} onChange={(items) => { const u = items[0]?.url; if (u) setCert((c) => ({ ...c, url: u })); }} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
