"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { OtpBoxes } from "@/components/dashboard/onboarding/wizard-chrome";

const OTP_LEN = 6;

/**
 * Generic 6-digit OTP entry modal shared by the Account Settings phone-verify
 * (Account Information tab) and email-verify (Change Email Address tab)
 * flows — reuses the same `OtpBoxes` box-input the exhibitor onboarding
 * wizard already built, per the plan's "don't reinvent OTP UI" instruction.
 */
export function OtpModal({
  open, onClose, title, subtitle, onVerify, onResend,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  /** Resolve true on a successful verify; the modal clears the boxes on false. */
  onVerify: (code: string) => Promise<boolean>;
  onResend: () => Promise<void>;
}) {
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(59);

  useEffect(() => {
    if (open) { setOtp(""); setSeconds(59); }
  }, [open]);

  useEffect(() => {
    if (!open || seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [open, seconds]);

  async function verify(code: string) {
    if (code.length !== OTP_LEN || pending) return;
    setPending(true);
    try {
      const ok = await onVerify(code);
      if (!ok) setOtp("");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (seconds > 0) return;
    await onResend();
    setSeconds(59);
    toast.success("A new code is on its way.");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-[420px]"
      footer={
        <>
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="button" disabled={otp.length !== OTP_LEN || pending} onClick={() => verify(otp)}>
            {pending ? "Verifying…" : "Verify"}
          </PrimaryButton>
        </>
      }
    >
      <p className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-widest mb-2">Verification code</p>
      <OtpBoxes value={otp} onChange={(v) => { setOtp(v); if (v.length === OTP_LEN) verify(v); }} disabled={pending} />
      <button type="button" disabled={seconds > 0} onClick={resend} className="mt-4 text-[12.5px] text-[#9a9a9a] disabled:cursor-not-allowed">
        Didn&apos;t receive it?{" "}
        <span className={seconds > 0 ? "" : "text-[#caa400] font-semibold hover:underline"}>
          Click to resend {seconds > 0 ? `(0:${String(seconds).padStart(2, "0")})` : ""}
        </span>
      </button>
    </Modal>
  );
}

/** Confirmation success modal — "Number Verified" / "Document Submitted" etc. */
export function SuccessModal({ open, onClose, title, body, children }: { open: boolean; onClose: () => void; title: string; body: string; children?: React.ReactNode }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-[420px]" footer={<PrimaryButton type="button" onClick={onClose}>Close</PrimaryButton>}>
      <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 mb-4">{body}</p>
      {children}
    </Modal>
  );
}

/** Cancel/Continue confirmation — "Edit Phone Number" warning etc. */
export function ConfirmModal({ open, onClose, title, body, confirmLabel = "Continue", onConfirm, danger }: {
  open: boolean; onClose: () => void; title: string; body: string; confirmLabel?: string; onConfirm: () => void; danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-[420px]"
      footer={
        <>
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${danger ? "bg-[#e5484d] text-white hover:bg-[#cf3b40]" : "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]"}`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-[#6b6b6b] dark:text-white/60">{body}</p>
    </Modal>
  );
}
