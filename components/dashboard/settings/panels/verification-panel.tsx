"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, FileText, Loader2 } from "lucide-react";
import { Field, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { FileUpload, type UploadItem } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/upload-client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getKycStates, submitKycDoc, type KycState } from "@/lib/services/kyc";
import { ID_TYPES } from "@/lib/constants/id-types";
import { REGISTRATION_COUNTRIES, corporateDocsFor, type CorporateDocSlot } from "@/lib/constants/corporate-docs";
import type { StackableRole } from "@/lib/entitlements";
import { RoleSection } from "@/components/dashboard/settings/role-section";
import { ConfirmModal } from "@/components/dashboard/settings/verify-modal";

const TIER_LABEL: Record<number, string> = { 1: "Tier 1 (Phone Verified)", 2: "Tier 2 (Identity Verified)", 3: "Tier 3" };

const TRUST_COPY: Record<StackableRole, { title: string; body: string; tier2Body: string; docsIntro: string }> = {
  professional: {
    title: "Trust & Verification",
    body: "Build trust with other platform users by verifying your identity.",
    tier2Body: "Unlock the Tier 2 Trust Badge. Build instant credibility and stand out to potential clients, partners, and employers across the platform.",
    docsIntro: "",
  },
  exhibitor: {
    title: "Trust & Verification",
    body: "Build trust with the Nomarc community by verifying your company's identity and legal registration.",
    tier2Body: "Unlock the Tier 2 Trust Badge. Build instant credibility and stand out to top-tier professionals, and potential clients and partners across the platform.",
    docsIntro: "Please upload all 4 documents below to securely complete your verification.\n(PNG, JPG, or PDF. Max 5MB per file.)",
  },
  employer: {
    title: "Trust & Verification",
    body: "Build trust with the Nomarc community by verifying your company's identity and legal registration.",
    tier2Body: "Unlock the Tier 2 Trust Badge. Build instant credibility and help candidates hire with confidence in your company.",
    docsIntro: "Please upload all 4 documents below to securely complete your verification.\n(PNG, JPG, or PDF. Max 5MB per file.)",
  },
};

function currentStatusLabel(state?: KycState): string {
  if (!state) return "Not started";
  if (state.tiers[1]?.status === "approved") return TIER_LABEL[2];
  if (state.tiers[0]?.status === "approved") return TIER_LABEL[1];
  return "Not started";
}

export function VerificationPanel({ heldRoles }: { heldRoles: StackableRole[] }) {
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<Partial<Record<StackableRole, KycState>>>({});

  useEffect(() => {
    getKycStates().then((s) => { setStates(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function refreshRole(role: StackableRole, next: KycState) {
    setStates((s) => ({ ...s, [role]: next }));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-[#f0f0f0] dark:bg-white/5 animate-pulse" />)}
      </div>
    );
  }

  const other = heldRoles.filter((r) => r !== "professional");

  // Unlike the other panels, everything here is per-role — with no roles
  // resolved this rendered an empty card and read as a broken tab.
  if (heldRoles.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-11 h-11 mx-auto rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]">
          <FileText size={20} />
        </div>
        <p className="mt-3 text-[14px] font-bold text-[#1e1e1e] dark:text-white">Nothing to verify yet</p>
        <p className="mt-1 text-[13px] text-[#9a9a9a] max-w-[340px] mx-auto">
          Verification is organised per profile. Set one up and its documents appear here.
        </p>
        <a
          href="/dashboard/profile"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-4 py-2 text-[13px] font-bold text-[#1e1e1e] hover:bg-[#e6c114] transition-colors"
        >
          Set up your profile
        </a>
      </div>
    );
  }

  return (
    <div>
      {heldRoles.includes("professional") && (
        <PersonalTier2 role="professional" state={states.professional} onSubmitted={(s) => refreshRole("professional", s)} />
      )}
      {other.map((role) => (
        <RoleSection key={role} title={role === "exhibitor" ? "Exhibitor Verification" : "Employer Verification"}>
          <CorporateTier2 role={role} state={states[role]} onSubmitted={(s) => refreshRole(role, s)} />
        </RoleSection>
      ))}
    </div>
  );
}

function TrustHeader({ role, state }: { role: StackableRole; state?: KycState }) {
  const copy = TRUST_COPY[role];
  return (
    <div className="mb-5">
      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{copy.title}</p>
      <p className="text-[12.5px] text-[#9a9a9a] mt-1">{copy.body}</p>
      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[#1e1e1e] dark:text-white">
        <CheckCircle2 size={14} className="text-[#16a34a] flex-shrink-0" />
        <span className="text-[#6b6b6b] dark:text-white/60">Your Current Status:</span> <span className="font-semibold">{currentStatusLabel(state)}</span>
      </p>
    </div>
  );
}

/* ── Professional: single Tier-2 personal ID doc ─────────────────────── */
function PersonalTier2({ role, state, onSubmitted }: { role: StackableRole; state?: KycState; onSubmitted: (s: KycState) => void }) {
  const copy = TRUST_COPY[role];
  const tier2 = state?.tiers[1];
  const [docType, setDocType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Re-uploading an already-approved document drops the badge until the new one
  // clears review, so it is gated behind an explicit warning rather than being
  // a plain edit.
  const [replacing, setReplacing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  async function submit() {
    if (!docType) { toast.error("Select a document type."); return; }
    if (!fileUrl) { toast.error("Upload your document."); return; }
    setSubmitting(true);
    try {
      const res = await submitKycDoc({ tier: 2, docType, fileUrl, role });
      if (!res.ok) { toast.error(res.error ?? "Could not submit for review."); return; }
      toast.success("Document submitted for review.");
      onSubmitted({
        ...(state ?? { role, overallTier: 1, isFullyVerified: false, tiers: [{ tier: 1, status: "approved", docs: [] }, tier2 ?? { tier: 2, status: "under_review", docs: [] }, { tier: 3, status: "locked", docs: [] }] }),
        tiers: (state?.tiers ?? []).map((t) => t.tier === 2 ? { ...t, status: "under_review" as const } : t),
      } as KycState);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <TrustHeader role={role} state={state} />
      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-1">Tier 2: Identity Verification</p>
      <p className="text-[12.5px] text-[#9a9a9a] mb-4">{copy.tier2Body}</p>

      {tier2?.status === "approved" && !replacing ? (
        <DocRow
          label={ID_TYPES.find((t) => t.value === tier2.docs[0]?.docType)?.label ?? "Identity document"}
          state="approved"
          note="Verified: Your identity document has been successfully reviewed and approved."
          onUpdate={() => setConfirmReplace(true)}
        />
      ) : tier2?.status === "under_review" && !replacing ? (
        <DocRow label={ID_TYPES.find((t) => t.value === tier2.docs[0]?.docType)?.label ?? "Identity document"} state="pending" note="Pending Review. Our team is securely reviewing your document. This usually takes 24-48 hours. We will email you once approved." />
      ) : (
        <>
          <Field label="Document Type">
            <SearchableSelect
              options={ID_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={docType}
              onChange={setDocType}
              placeholder="Select Document Type"
            />
          </Field>
          <div className="mt-4">
            <FileUpload
              accept="image/*,.pdf"
              maxSizeMB={5}
              label="Upload Document"
              hint="PNG, JPG or PDF (max. 5MB). Please ensure all text and photos are clearly visible"
              // Without `upload`, FileUpload only simulates progress and leaves
              // `url` as the local blob: reference — so the ID document was
              // never actually stored and the reviewer received a dead link.
              upload={(file) => uploadFile(file, "doc")}
              onChange={(items: UploadItem[]) => {
                const done = items.find((i) => i.progress >= 100 && i.url);
                if (done?.url) setFileUrl(done.url);
              }}
            />
          </div>
          <p className="mt-3 text-[11px] text-[#9a9a9a] leading-relaxed">
            Your documents are encrypted, securely stored, and only used for verification purposes. They will never be displayed publicly on your profile.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-[#f0f0f0] dark:border-white/10">
            <GhostButton type="button" onClick={() => { setDocType(""); setFileUrl(""); }}>Cancel</GhostButton>
            <PrimaryButton type="button" disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit for Review"}</PrimaryButton>
          </div>
        </>
      )}
      <ConfirmModal
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        title="Update verification document?"
        body="Updating your verification document will remove your Verified Badge until the new document is verified."
        onConfirm={() => { setConfirmReplace(false); setReplacing(true); }}
      />
    </div>
  );
}

/* ── Exhibitor / Employer: 4-slot corporate doc grid ─────────────────── */
function CorporateTier2({ role, state, onSubmitted }: { role: StackableRole; state?: KycState; onSubmitted: (s: KycState) => void }) {
  const copy = TRUST_COPY[role];
  const tier2 = state?.tiers[1];
  const [country, setCountry] = useState("Nigeria");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const slots = corporateDocsFor(country);

  async function submit() {
    const missing = slots.filter((s) => !files[s.docKey]);
    if (missing.length) { toast.error(`Upload all 4 documents (missing: ${missing.map((m) => m.label).join(", ")})`); return; }
    setSubmitting(true);
    try {
      const results = await Promise.all(slots.map((s) => submitKycDoc({ tier: 2, docType: s.docKey, fileUrl: files[s.docKey], role })));
      if (results.some((r) => !r.ok)) { toast.error("Could not submit some documents. Please try again."); return; }
      toast.success("Documents submitted for review.");
      onSubmitted({
        ...(state ?? { role, overallTier: 1, isFullyVerified: false, tiers: [{ tier: 1, status: "approved", docs: [] }, tier2 ?? { tier: 2, status: "under_review", docs: [] }, { tier: 3, status: "locked", docs: [] }] }),
        tiers: (state?.tiers ?? []).map((t) => t.tier === 2 ? { ...t, status: "under_review" as const } : t),
      } as KycState);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <TrustHeader role={role} state={state} />
      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-1">Tier 2: Identity Verification</p>
      <p className="text-[12.5px] text-[#9a9a9a] mb-4">{copy.tier2Body}</p>

      {tier2?.status === "approved" && !replacing ? (
        <div className="space-y-2.5">
          {corporateDocsFor(country).map((slot, i) => (
            <DocRow key={slot.docKey} label={slot.label} state="approved" onUpdate={i === 0 ? () => setConfirmReplace(true) : undefined} />
          ))}
          <p className="flex items-center gap-1.5 text-[12.5px] text-[#16a34a] font-medium mt-1">
            <CheckCircle2 size={14} /> Verified: Your identity document has been successfully reviewed and approved.
          </p>
        </div>
      ) : tier2?.status === "under_review" && !replacing ? (
        <div className="space-y-2.5">
          {corporateDocsFor(country).map((slot) => (
            <DocRow key={slot.docKey} label={slot.label} state="pending" />
          ))}
          <p className="flex items-center gap-1.5 text-[12.5px] text-[#9a9a9a] mt-1">
            <Clock size={13} /> Pending Review. Our team is securely reviewing your document. This usually takes 24-48 hours. We will email you once approved.
          </p>
        </div>
      ) : (
        <>
          <Field label="Required Documents">
            <SearchableSelect
              options={REGISTRATION_COUNTRIES.map((c) => ({ value: c, label: c === "Nigeria" ? "Nigeria" : "Other country" }))}
              value={country}
              onChange={setCountry}
              placeholder="Select Country of Business Registration"
            />
          </Field>
          <p className="mt-3 text-[12px] text-[#9a9a9a] leading-relaxed whitespace-pre-line">{copy.docsIntro}</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.map((slot) => (
              <DocSlotUpload key={slot.docKey} slot={slot} fileUrl={files[slot.docKey]} onUploaded={(url) => setFiles((f) => ({ ...f, [slot.docKey]: url }))} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[#9a9a9a] leading-relaxed">
            Your documents are encrypted, securely stored, and only used for verification purposes. They will never be displayed publicly on your profile.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-[#f0f0f0] dark:border-white/10">
            <GhostButton type="button" onClick={() => setFiles({})}>Cancel</GhostButton>
            <PrimaryButton type="button" disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit for Review"}</PrimaryButton>
          </div>
        </>
      )}
      <ConfirmModal
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        title="Update verification document?"
        body="Updating your verification document will remove your Verified Badge until the new document is verified."
        onConfirm={() => { setConfirmReplace(false); setReplacing(true); }}
      />
    </div>
  );
}

/**
 * Corporate document slot. Uploads to R2 and reports the PUBLIC url.
 *
 * This used to hand back `URL.createObjectURL(f)`, which is a `blob:` reference
 * scoped to the submitting tab. It looked like it worked — the row ticked green
 * — but the document never left the browser, and the reviewer opening it in the
 * admin console got "Not allowed to load local resource". Every corporate
 * verification submitted this way carried a dead link.
 */
function DocSlotUpload({ slot, fileUrl, onUploaded }: { slot: CorporateDocSlot; fileUrl?: string; onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(f: File) {
    setError(null);
    setBusy(true);
    try {
      onUploaded(await uploadFile(f, "doc"));
    } catch (e) {
      // Surface it: a silent failure here is what caused the original bug.
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="flex items-center justify-between gap-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white cursor-pointer hover:border-[#ffd716] transition-colors">
        <span className={`truncate ${!fileUrl ? "text-[#6b6b6b] dark:text-white/60" : ""}`}>{slot.label}</span>
        {busy
          ? <Loader2 size={15} className="flex-shrink-0 animate-spin text-[#9a9a9a]" />
          : fileUrl
            ? <CheckCircle2 size={15} className="text-[#16a34a] flex-shrink-0" />
            : <FileText size={15} className="text-[#9a9a9a] flex-shrink-0" />}
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="mt-1 text-[11.5px] text-[#e5484d]">{error}</p>}
    </div>
  );
}

function DocRow({ label, state, note, onUpdate }: { label: string; state: "approved" | "pending"; note?: string; onUpdate?: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-[#fafafa] dark:bg-white/5 px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white">
        <FileText size={15} className="text-[#9a9a9a] flex-shrink-0" />
        <span className="truncate">{label}</span>
        {state === "approved" ? <CheckCircle2 size={14} className="ml-auto text-[#16a34a] flex-shrink-0" /> : <Clock size={14} className="ml-auto text-[#9a9a9a] flex-shrink-0" />}
        {onUpdate && (
          <button type="button" onClick={onUpdate} className="text-[12.5px] font-medium text-[#1e1e1e] underline underline-offset-2 hover:text-[#caa400] dark:text-white flex-shrink-0">
            Update
          </button>
        )}
      </div>
      {note && (
        <p className={`mt-1.5 flex items-start gap-1.5 text-[12px] ${state === "approved" ? "text-[#16a34a] font-medium" : "text-[#9a9a9a]"}`}>
          {state === "approved" ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" /> : <Clock size={13} className="flex-shrink-0 mt-0.5" />}
          {note}
        </p>
      )}
    </div>
  );
}
