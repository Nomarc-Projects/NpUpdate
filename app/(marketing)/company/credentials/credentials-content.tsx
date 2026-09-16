"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Award, X, Link as LinkIcon } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/upload-client";
import { saveCompany, addCompanyCertification, deleteCompanyCertification, type CompanyData, type CompanyCert } from "@/lib/services/company";

const SIZES = ["1 - 10 employees", "11 - 50 employees", "51 - 200 employees", "201+ employees"];
const tmp = () => `tmp_${Math.random().toString(36).slice(2)}`;

export function CredentialsContent({ initial, certifications = [] }: { initial?: CompanyData; certifications?: CompanyCert[] }) {
  const router = useRouter();
  const [yearFounded, setYearFounded] = useState(initial?.yearFounded ?? "");
  const [companySize, setCompanySize] = useState(initial?.companySize ?? "");
  const [open, setOpen] = useState(false);
  const [cert, setCert] = useState({ name: "", issuer: "", year: "", url: "" });
  const [certs, setCerts] = useState<CompanyCert[]>(certifications);
  useEffect(() => { setCerts(certifications); }, [certifications]);
  const [pending, start] = useTransition();
  const close = () => setOpen(false);

  const bg = (action: Promise<unknown>, revert: () => void, ok?: string) => {
    if (ok) toast.success(ok);
    action.then(() => router.refresh()).catch((e) => { revert(); toast.error(e instanceof Error ? e.message : "Something went wrong"); });
  };

  function saveDetails() {
    start(async () => {
      try {
        await saveCompany({
          name: initial?.name, industry: initial?.industry, headquarters: initial?.headquarters,
          about: initial?.about, avatarUrl: initial?.avatarUrl || undefined,
          yearFounded, companySize,
        });
        toast.success("Saved"); router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    });
  }

  function addCert() {
    if (!cert.name.trim()) { toast.error("Certification name required"); return; }
    const id = tmp();
    const row: CompanyCert = { id, name: cert.name.trim(), issuer: cert.issuer || null, year: cert.year ? Number(cert.year) : null, url: cert.url || null };
    setCerts((p) => [row, ...p]);
    close();
    const payload = { name: cert.name, issuer: cert.issuer, year: cert.year ? Number(cert.year) : undefined, url: cert.url };
    setCert({ name: "", issuer: "", year: "", url: "" });
    bg(addCompanyCertification(payload), () => setCerts((p) => p.filter((x) => x.id !== id)), "Certification added");
  }
  function removeCert(id: string) {
    const prev = certs; setCerts((p) => p.filter((x) => x.id !== id));
    bg(deleteCompanyCertification(id), () => setCerts(prev), "Removed");
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Year Founded"><input className={inputClass} value={yearFounded} onChange={(e) => setYearFounded(e.target.value)} placeholder="2004" inputMode="numeric" /></Field>
        <Field label="Company Size"><SelectMenu placeholder="201+ employees" value={companySize} onChange={setCompanySize} options={SIZES} /></Field>
      </div>

      <div className="flex justify-end">
        <PrimaryButton type="button" disabled={pending} onClick={saveDetails}>Save details</PrimaryButton>
      </div>

      {/* Certifications add row */}
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-4 rounded-xl border border-[#ececec] dark:border-white/10 px-5 py-4 text-left hover:border-[#ffd716] transition-colors">
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center"><Award size={16} className="text-[#1e1e1e] dark:text-white" /></span>
          <span>
            <span className="block text-sm font-semibold text-[#1e1e1e] dark:text-white">Certifications</span>
            <span className="block text-xs text-[#9a9a9a]">({certs.length}/5)</span>
          </span>
        </span>
        <span className="w-7 h-7 rounded-lg border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#1e1e1e] dark:text-white"><Plus size={15} /></span>
      </button>

      {certs.length === 0 ? (
        <p className="text-[13px] text-[#9a9a9a]">No certifications yet — add ISO, SONCAP, CAC and other credentials.</p>
      ) : (
        <div className="space-y-4">
          {certs.map((c) => (
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
      )}

      <Modal open={open} onClose={close} title="Add Certification" subtitle="Add a company certification (max. 5)."
        footer={<><GhostButton type="button" onClick={close}>Cancel</GhostButton><PrimaryButton type="button" onClick={addCert}>Add</PrimaryButton></>}>
        <div className="space-y-4">
          <Field label="Certification name"><input className={inputClass} value={cert.name} onChange={(e) => setCert({ ...cert, name: e.target.value })} placeholder="SONCAP Certified Material" /></Field>
          <Field label="Issuing organization"><input className={inputClass} value={cert.issuer} onChange={(e) => setCert({ ...cert, issuer: e.target.value })} placeholder="Standards Organisation of Nigeria" /></Field>
          <Field label="Year"><input className={inputClass} value={cert.year} onChange={(e) => setCert({ ...cert, year: e.target.value })} placeholder="2023" inputMode="numeric" /></Field>
          <Field label="Credential link" hint="Optional"><input className={inputClass} value={cert.url} onChange={(e) => setCert({ ...cert, url: e.target.value })} placeholder="https://…" inputMode="url" /></Field>
          <Field label="Or upload the certificate (CAC, ISO…)" hint="Optional · image or PDF">
            <FileUpload accept="image/png,image/jpeg,image/webp,.pdf" maxSizeMB={10} label="Upload certificate" hint="PNG, JPG or PDF · max 10MB" upload={(f) => uploadFile(f, "doc")} onChange={(items) => { const u = items[0]?.url; if (u) setCert((c) => ({ ...c, url: u })); }} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
