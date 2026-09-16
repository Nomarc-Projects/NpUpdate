"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { authClient, useSession } from "@/lib/auth-client";
import { getAccountInfo, updateExhibitorEmail, updateEmployerEmail } from "@/lib/services/account";
import type { StackableRole } from "@/lib/entitlements";
import { RoleSection } from "@/components/dashboard/settings/role-section";
import { OtpModal } from "@/components/dashboard/settings/verify-modal";

async function sendOtp(email: string) {
  const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
  if (error) throw new Error(error.message || "Could not send a verification code.");
}

async function verifyOtp(email: string, otp: string) {
  const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
  if (error) throw new Error(error.message || "That code is invalid or has expired.");
}

export function EmailPanel({ heldRoles }: { heldRoles: StackableRole[] }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [exhibitorEmail, setExhibitorEmail] = useState("");
  const [employerEmail, setEmployerEmail] = useState("");
  const currentEmail = (session?.user as { email?: string } | undefined)?.email ?? "";

  useEffect(() => {
    getAccountInfo().then((d) => {
      setExhibitorEmail(d.exhibitor.email);
      setEmployerEmail(d.employer.email);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <EmailSection
        title="Current Email Address"
        newLabel="New Email Address"
        current={currentEmail}
        modalTitle="Verify Email Address"
        onVerified={async (newEmail) => {
          // @ts-ignore — Better Auth client proxy exposes changeEmail via path-to-method
          const res = await authClient.changeEmail({ newEmail });
          if ((res as { error?: { message?: string } })?.error) {
            throw new Error((res as { error?: { message?: string } }).error?.message ?? "Could not update email");
          }
        }}
      />

      {!loading && heldRoles.includes("exhibitor") && (
        <RoleSection title="Exhibitor Email Address">
          <EmailSection
            title="Current Email Address"
            newLabel="New Email Address"
            current={exhibitorEmail}
            currentPlaceholder="enter current company email address"
            newPlaceholder="enter new company email address"
            modalTitle="Verify Email Address"
            onVerified={async (newEmail) => { await updateExhibitorEmail(newEmail); setExhibitorEmail(newEmail); }}
          />
        </RoleSection>
      )}

      {!loading && heldRoles.includes("employer") && (
        <RoleSection title="Employer Email Address">
          <EmailSection
            title="Current Email Address"
            newLabel="New Email Address"
            current={employerEmail}
            currentPlaceholder="enter current company email address"
            newPlaceholder="enter new company email address"
            modalTitle="Verify Email Address"
            onVerified={async (newEmail) => { await updateEmployerEmail(newEmail); setEmployerEmail(newEmail); }}
          />
        </RoleSection>
      )}
    </div>
  );
}

function EmailSection({
  current, currentPlaceholder = "enter current email address", newPlaceholder = "enter new email address", modalTitle, onVerified,
}: {
  title: string;
  newLabel: string;
  current: string;
  currentPlaceholder?: string;
  newPlaceholder?: string;
  modalTitle: string;
  onVerified: (newEmail: string) => Promise<void>;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);

  async function startVerify() {
    const email = newEmail.trim();
    if (!email || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    if (email === current) { toast.error("That is already the current email"); return; }
    setPending(true);
    try {
      await sendOtp(email);
      setOtpOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send a verification code.");
    } finally {
      setPending(false);
    }
  }

  async function verify(code: string): Promise<boolean> {
    const email = newEmail.trim();
    try {
      await verifyOtp(email, code);
      await onVerified(email);
      toast.success("Email updated successfully");
      setNewEmail("");
      setOtpOpen(false);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code is invalid or has expired.");
      return false;
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Current Email Address">
          <input className={inputClass} value={current} disabled readOnly placeholder={currentPlaceholder} />
        </Field>
        <Field label="New Email Address">
          <input type="email" className={inputClass} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={newPlaceholder} autoComplete="off" />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#f0f0f0] dark:border-white/10">
        <GhostButton type="button" onClick={() => setNewEmail("")}>Cancel</GhostButton>
        <PrimaryButton type="button" disabled={pending} onClick={startVerify}>{pending ? "Sending…" : "Verify"}</PrimaryButton>
      </div>

      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title={modalTitle}
        subtitle={`Enter the 6-digit code we just sent to ${newEmail.trim()}`}
        onVerify={verify}
        onResend={async () => { await sendOtp(newEmail.trim()); }}
      />
    </div>
  );
}
