"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Info, BadgeCheck, Pencil } from "lucide-react";
import { Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { getAccountInfo, updateBaseAccountInfo, updateExhibitorAccountInfo, updateEmployerAccountInfo } from "@/lib/services/account";
import { sendPhoneOtp, verifyPhoneOtp, beginPhoneEdit } from "@/lib/services/phone-verify";
import type { StackableRole } from "@/lib/entitlements";
import { RoleSection } from "@/components/dashboard/settings/role-section";
import { OtpModal, SuccessModal, ConfirmModal } from "@/components/dashboard/settings/verify-modal";

type RoleFields = { phone: string; phoneVerified: boolean; contactPerson: string };
type AccountInfo = Awaited<ReturnType<typeof getAccountInfo>>;

const PILL_COPY: Record<StackableRole, string> = {
  professional: "Verify your phone number to unlock the Tier 1 Trust Badge on your profile. Verified professionals stand out to employers and clients, increasing your chances of landing projects and job opportunities.",
  exhibitor: "Verify your company phone number to unlock the Tier 1 Trust Badge on your profile. Verified exhibitors build instant credibility with professionals and contractors, increasing your chances of receiving quote requests and securing product sales.",
  employer: "Verify your company phone number to unlock the Tier 1 Trust Badge on your profile, verified employers build instant trust, helping you attract better candidates and hire with confidence.",
};

export function InfoPanel({ heldRoles }: { heldRoles: StackableRole[] }) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [exhibitor, setExhibitor] = useState<RoleFields>({ phone: "", phoneVerified: false, contactPerson: "" });
  const [employer, setEmployer] = useState<RoleFields>({ phone: "", phoneVerified: false, contactPerson: "" });
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    getAccountInfo().then((d: AccountInfo) => {
      setName(d.name);
      setPhone(d.phone);
      setPhoneVerified(d.phoneVerified);
      setCompanyName(d.companyName);
      setExhibitor({ phone: d.exhibitor.phone, phoneVerified: d.exhibitor.phoneVerified, contactPerson: d.exhibitor.contactPerson });
      setEmployer({ phone: d.employer.phone, phoneVerified: d.employer.phoneVerified, contactPerson: d.employer.contactPerson });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-[#f0f0f0] dark:bg-white/5 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <AccountInfoCard
        role="professional"
        primaryLabel="Full name"
        primaryValue={name}
        onPrimaryChange={setName}
        phoneLabel="Phone Number"
        phone={phone}
        phoneVerified={phoneVerified}
        onPhoneChange={setPhone}
        onVerifiedChange={setPhoneVerified}
        previewName={name || "Your name"}
        previewSub="Open to work"
        onSave={async () => { await updateBaseAccountInfo({ name: name.trim(), phone }); }}
      />

      {heldRoles.includes("exhibitor") && (
        <RoleSection title="Exhibitor Information">
          <AccountInfoCard
            role="exhibitor"
            primaryLabel="Primary Contact Person"
            primaryValue={exhibitor.contactPerson}
            onPrimaryChange={(v) => setExhibitor((s) => ({ ...s, contactPerson: v }))}
            phoneLabel="Company Phone Number"
            phone={exhibitor.phone}
            phoneVerified={exhibitor.phoneVerified}
            onPhoneChange={(v) => setExhibitor((s) => ({ ...s, phone: v }))}
            onVerifiedChange={(v) => setExhibitor((s) => ({ ...s, phoneVerified: v }))}
            previewName={companyName || exhibitor.contactPerson || "Your company"}
            onSave={async () => { await updateExhibitorAccountInfo({ contactPerson: exhibitor.contactPerson.trim(), phone: exhibitor.phone }); }}
          />
        </RoleSection>
      )}

      {heldRoles.includes("employer") && (
        <RoleSection title="Employer Information">
          <AccountInfoCard
            role="employer"
            primaryLabel="Primary Contact Person"
            primaryValue={employer.contactPerson}
            onPrimaryChange={(v) => setEmployer((s) => ({ ...s, contactPerson: v }))}
            phoneLabel="Company Phone Number"
            phone={employer.phone}
            phoneVerified={employer.phoneVerified}
            onPhoneChange={(v) => setEmployer((s) => ({ ...s, phone: v }))}
            onVerifiedChange={(v) => setEmployer((s) => ({ ...s, phoneVerified: v }))}
            previewName={companyName || employer.contactPerson || "Your hiring profile"}
            onSave={async () => { await updateEmployerAccountInfo({ contactPerson: employer.contactPerson.trim(), phone: employer.phone }); }}
          />
        </RoleSection>
      )}
    </div>
  );
}

const VERIFY_TITLE: Record<StackableRole, string> = {
  professional: "Verify Phone Number",
  exhibitor: "Verify Company Phone Number",
  employer: "Verify Company Phone Number",
};

function AccountInfoCard({
  role, primaryLabel, primaryValue, onPrimaryChange, phoneLabel, phone, phoneVerified, onPhoneChange, onVerifiedChange, previewName, previewSub, onSave,
}: {
  role: StackableRole;
  primaryLabel: string;
  primaryValue: string;
  onPrimaryChange: (v: string) => void;
  phoneLabel: string;
  phone: string;
  phoneVerified: boolean;
  onPhoneChange: (v: string) => void;
  onVerifiedChange: (v: boolean) => void;
  previewName: string;
  previewSub?: string;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [editWarnOpen, setEditWarnOpen] = useState(false);
  const [locked, setLocked] = useState(phoneVerified);

  useEffect(() => setLocked(phoneVerified), [phoneVerified]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave()
      .then(() => toast.success("Account info updated"))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not save changes"))
      .finally(() => setSaving(false));
  }

  async function startVerify() {
    if (!phone.trim()) { toast.error("Enter a phone number first."); return; }
    const res = await sendPhoneOtp(role, phone.trim());
    if (!res.ok) { toast.error(res.error ?? "Could not send a verification code."); return; }
    if (res.devCode) toast.message(`Dev mode: your code is ${res.devCode}`);
    setOtpOpen(true);
  }

  async function verify(code: string): Promise<boolean> {
    const res = await verifyPhoneOtp(role, code);
    if (!res.ok) { toast.error(res.error ?? "That code is invalid."); return false; }
    setOtpOpen(false);
    onVerifiedChange(true);
    setLocked(true);
    setSuccessOpen(true);
    return true;
  }

  async function confirmEdit() {
    setEditWarnOpen(false);
    await beginPhoneEdit(role);
    onVerifiedChange(false);
    setLocked(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label={phoneLabel}>
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+234 901 2345 678"
            disabled={locked}
          />
          <div className="mt-1.5 relative flex items-center gap-1.5">
            {locked ? (
              <span className="inline-flex items-center gap-3 text-[12px]">
                <span className="inline-flex items-center gap-1 text-[#16a34a] font-medium"><BadgeCheck size={13} /> Verified</span>
                <button type="button" onClick={() => setEditWarnOpen(true)} className="inline-flex items-center gap-1 text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white">
                  <Pencil size={12} /> Edit
                </button>
              </span>
            ) : (
              <>
                <button type="button" onClick={() => setShowPill((s) => !s)} aria-label="Why verify?" className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white">
                  <Info size={13} />
                </button>
                <button type="button" onClick={startVerify} className="text-[12px] text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white hover:underline">
                  Verify Number
                </button>
              </>
            )}
            {showPill && !locked && (
              <div className="absolute z-10 top-6 left-0 w-[280px] rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#262626] shadow-[0_18px_50px_rgba(0,0,0,0.18)] p-3.5">
                <p className="text-[12px] text-[#6b6b6b] dark:text-white/70 leading-relaxed">
                  {PILL_COPY[role].split("Tier 1 Trust Badge").map((chunk, i, arr) => (
                    <span key={i}>{chunk}{i < arr.length - 1 && <span className="font-semibold text-[#1e1e1e] dark:text-white">Tier 1 Trust Badge</span>}</span>
                  ))}
                </p>
              </div>
            )}
          </div>
        </Field>
        <Field label={primaryLabel}>
          <input className={inputClass} value={primaryValue} onChange={(e) => onPrimaryChange(e.target.value)} placeholder={primaryLabel} />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f0f0f0] dark:border-white/10">
        <GhostButton type="reset" onClick={() => { setShowPill(false); }}>Cancel</GhostButton>
        <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</PrimaryButton>
      </div>

      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title={VERIFY_TITLE[role]}
        subtitle={`Enter the 6-digit code we just sent to ${phone.trim()}`}
        onVerify={verify}
        onResend={async () => { await sendPhoneOtp(role, phone.trim()); }}
      />

      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Number Verified"
        body={role === "professional"
          ? "Your Tier 1 Trust Badge is now live on your profile. How you appear to employers:"
          : "Your Tier 1 Trust Badge is now live on your profile. How you appear on Nomarc:"}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/5 pl-3 pr-3.5 py-1.5">
          <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{previewName}</span>
          <BadgeCheck size={14} className="text-[#16a34a]" />
          {previewSub && <span className="ml-1 rounded-full bg-[#e9f9ef] dark:bg-[#16a34a]/15 px-2 py-0.5 text-[11px] font-medium text-[#16a34a]">{previewSub}</span>}
        </div>
      </SuccessModal>

      <ConfirmModal
        open={editWarnOpen}
        onClose={() => setEditWarnOpen(false)}
        title="Edit Phone Number"
        body="Changing your phone number will remove your Tier 1 Verified Badge until the new number is verified. Continue?"
        confirmLabel="Continue"
        onConfirm={confirmEdit}
      />
    </form>
  );
}
