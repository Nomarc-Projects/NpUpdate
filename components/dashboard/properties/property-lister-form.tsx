"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Clock3, XCircle } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { LISTER_TYPES } from "@/lib/constants/property";
import { uploadPrivateFile } from "@/lib/upload-client";
import { saveListerProfile, submitListerVerification } from "@/lib/services/property-listers";
import { cn } from "@/lib/utils";

export type ListerInitial = {
  listerType: string;
  displayName: string | null;
  companyName: string | null;
  cacNumber: string | null;
  phone: string | null;
  email: string | null;
  cacDocumentKey: string | null;
  idDocumentKey: string | null;
  verificationStatus: string;
  verificationNote: string | null;
} | null;

const STATUS = {
  verified: { label: "Verified lister", icon: BadgeCheck, className: "bg-[#eef7f0] text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]" },
  pending: { label: "Verification pending", icon: Clock3, className: "bg-[#fff8e6] text-[#8a6100] dark:bg-amber-500/10 dark:text-amber-300" },
  rejected: { label: "Verification rejected", icon: XCircle, className: "bg-[#fdecec] text-[#b4232a] dark:bg-red-500/10 dark:text-red-300" },
  unverified: { label: "Not verified", icon: Clock3, className: "bg-[#f4f4f4] text-[#6b6b6b] dark:bg-white/5 dark:text-white/60" },
} as const;

export function PropertyListerForm({ initial }: { initial: ListerInitial }) {
  const router = useRouter();
  const [listerType, setListerType] = useState(initial?.listerType ?? "homeowner");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [cacNumber, setCacNumber] = useState(initial?.cacNumber ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [cacDocumentKey, setCacDocumentKey] = useState(initial?.cacDocumentKey ?? "");
  const [idDocumentKey, setIdDocumentKey] = useState(initial?.idDocumentKey ?? "");
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);

  const status = initial?.verificationStatus ?? "unverified";
  const meta = STATUS[status as keyof typeof STATUS] ?? STATUS.unverified;
  const isRealtor = listerType === "realtor";

  async function run(submit: boolean) {
    setBusy(submit ? "submit" : "save");
    try {
      const input = {
        listerType,
        displayName,
        companyName,
        cacNumber,
        phone,
        email,
        cacDocumentKey: cacDocumentKey || undefined,
        idDocumentKey: idDocumentKey || undefined,
      };
      if (submit) {
        await submitListerVerification(input);
        toast.success("Submitted — we'll notify you when verification is done");
      } else {
        await saveListerProfile(input);
        toast.success("Lister profile saved");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your details");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className={cn("flex items-start gap-2 rounded-2xl p-4 text-[12.5px]", meta.className)}>
        <meta.icon size={16} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold">{meta.label}</p>
          <p className="mt-0.5 opacity-80">
            {status === "verified"
              ? "Buyers can see that your lister profile is verified."
              : status === "pending"
                ? "An admin is reviewing your details and documents."
                : status === "rejected"
                  ? initial?.verificationNote || "Update your details and resubmit."
                  : "Verify your identity to build buyer trust. You can still list while unverified."}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="I am a">
            <select className={inputClass} value={listerType} onChange={(e) => setListerType(e.target.value)}>
              {LISTER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Display name">
            <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Name buyers will see" />
          </Field>
          <Field label="Agency / company name">
            <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={isRealtor ? "Required for realtors" : "Optional"} />
          </Field>
          <Field label="CAC registration number">
            <input className={inputClass} value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} placeholder={isRealtor ? "RC number" : "Optional"} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" inputMode="tel" />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" />
          </Field>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11.5px] font-semibold text-[#6b6b6b] dark:text-white/60">CAC certificate {isRealtor ? "(required)" : "(optional)"}</p>
            {cacDocumentKey && !initial?.cacDocumentKey ? null : initial?.cacDocumentKey ? (
              <p className="mb-2 text-[11px] font-semibold text-[#1f7a3d] dark:text-[#4ade80]">Document on file</p>
            ) : null}
            <FileUpload
              accept="image/*,application/pdf"
              maxSizeMB={15}
              maxItems={1}
              label="Upload CAC certificate"
              hint="PDF or image"
              upload={(f) => uploadPrivateFile(f, "property_doc")}
              onChange={(items) => {
                const up = items.find((i) => !i.error && i.url && !i.url.startsWith("blob:"));
                setCacDocumentKey(up?.url || initial?.cacDocumentKey || "");
              }}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11.5px] font-semibold text-[#6b6b6b] dark:text-white/60">Government-issued ID (required)</p>
            {initial?.idDocumentKey ? <p className="mb-2 text-[11px] font-semibold text-[#1f7a3d] dark:text-[#4ade80]">Document on file</p> : null}
            <FileUpload
              accept="image/*,application/pdf"
              maxSizeMB={15}
              maxItems={1}
              label="Upload ID"
              hint="PDF or image"
              upload={(f) => uploadPrivateFile(f, "property_doc")}
              onChange={(items) => {
                const up = items.find((i) => !i.error && i.url && !i.url.startsWith("blob:"));
                setIdDocumentKey(up?.url || initial?.idDocumentKey || "");
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0f0f0] pt-4 dark:border-white/10">
          <button type="button" disabled={!!busy} onClick={() => run(false)} className="rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[12.5px] font-semibold text-[#1e1e1e] disabled:opacity-60 dark:border-white/15 dark:text-white">
            {busy === "save" ? "Saving…" : "Save details"}
          </button>
          {status !== "verified" && status !== "pending" && (
            <button type="button" disabled={!!busy} onClick={() => run(true)} className="rounded-xl bg-[#1e1e1e] px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60 dark:bg-white dark:text-[#1e1e1e]">
              {busy === "submit" ? "Submitting…" : "Submit for verification"}
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#9a9a9a]">Documents are stored privately. Only admins reviewing your verification can read them.</p>
      </div>
    </div>
  );
}
