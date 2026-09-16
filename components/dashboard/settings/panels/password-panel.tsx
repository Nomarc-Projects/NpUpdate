"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { authClient } from "@/lib/auth-client";

export function PasswordPanel() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !next || !confirm) { toast.error("All fields are required"); return; }
    if (next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (next !== confirm) { toast.error("New passwords don't match"); return; }
    start(async () => {
      try {
        // @ts-ignore — Better Auth client proxy exposes changePassword via path-to-method
        const res = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
        if ((res as { error?: { message?: string } })?.error) {
          toast.error((res as { error?: { message?: string } }).error?.message ?? "Could not change password");
        } else {
          toast.success("Password changed successfully. Other sessions have been signed out.");
          setCurrent(""); setNext(""); setConfirm("");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not change password");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Current Password">
        <input type="password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="enter your current password" autoComplete="current-password" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="New Password" hint="Min. 8 characters">
          <input type="password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} placeholder="enter your new password" autoComplete="new-password" />
        </Field>
        <Field label="Confirm New Password">
          <input type="password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="confirm your new password" autoComplete="new-password" />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f0f0f0] dark:border-white/10 mt-2">
        <GhostButton type="reset">Cancel</GhostButton>
        <PrimaryButton type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit"}</PrimaryButton>
      </div>
    </form>
  );
}
