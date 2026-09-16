"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, ShieldAlert } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { inviteAdminByEmail } from "@/lib/services/admin";
import { cn } from "@/lib/utils";

type GrantRole = "admin" | "super_admin";

const ROLE_OPTS: { value: GrantRole; label: string; desc: string; super?: boolean }[] = [
  { value: "admin", label: "Admin", desc: "User management, verifications, campaigns" },
  { value: "super_admin", label: "Super Admin", desc: "Everything above, plus admin management & impersonation", super: true },
];

export function InviteAdminButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<GrantRole>("admin");
  const [confirmSuper, setConfirmSuper] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await inviteAdminByEmail(email.trim(), role);
      if (!res.ok) { toast.error(res.error ?? "Couldn't grant the role"); return; }
      toast.success(`${email} is now ${role === "super_admin" ? "a super admin" : "an admin"}`);
      setOpen(false);
      setEmail("");
      setRole("admin");
      setConfirmSuper(false);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  function onGrant() {
    // Super-admin grants go through an explicit confirm step — a two-click,
    // full-platform-control promotion shouldn't fire from a single tap.
    if (role === "super_admin" && !confirmSuper) { setConfirmSuper(true); return; }
    send();
  }

  function pickRole(r: GrantRole) {
    setRole(r);
    if (r !== "super_admin") setConfirmSuper(false);
  }

  const isSuper = role === "super_admin";

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">
        <UserPlus size={13} /> Add Admin
      </button>
      <Modal open={open} onClose={() => { setOpen(false); setConfirmSuper(false); }} title="Add an Administrator" subtitle="Grant an existing account admin or super admin access" maxWidth="max-w-sm">
        <Field label="Email address" hint="Must already have a Nomarc account">
          <input className={inputClass} autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setConfirmSuper(false); }} placeholder="teammate@company.com" type="email" />
        </Field>

        <Field label="Access level">
          <div className="space-y-2">
            {ROLE_OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => pickRole(opt.value)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                  role === opt.value
                    ? opt.super ? "border-[#e5484d] bg-[#fef2f2] dark:bg-[#e5484d]/10" : "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]"
                    : "border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716]"
                )}
              >
                {opt.super
                  ? <ShieldAlert size={16} className={cn("mt-0.5 flex-shrink-0", role === opt.value ? "text-[#e5484d]" : "text-[#9a9a9a]")} />
                  : <ShieldCheck size={16} className={cn("mt-0.5 flex-shrink-0", role === opt.value ? "text-[#1a7f43]" : "text-[#9a9a9a]")} />}
                <span>
                  <span className={cn("block text-[13px] font-bold", opt.super ? "text-[#e5484d] dark:text-[#fca5a5]" : "text-[#1e1e1e] dark:text-white")}>{opt.label}</span>
                  <span className="block text-[11.5px] text-[#9a9a9a]">{opt.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </Field>

        {confirmSuper && (
          <div className="rounded-xl border border-[#e5484d]/50 bg-[#fef2f2] dark:bg-[#e5484d]/10 p-3.5">
            <p className="flex items-start gap-2 text-[12.5px] font-semibold text-[#e5484d] dark:text-[#fca5a5]">
              <ShieldAlert size={15} className="mt-0.5 flex-shrink-0" />
              Super admins can manage other admins, impersonate users and release campaigns. Confirm you want to give {email || "this person"} full control?
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => { setOpen(false); setConfirmSuper(false); }}>Cancel</GhostButton>
          {confirmSuper ? (
            <>
              <GhostButton onClick={() => setConfirmSuper(false)}>Back</GhostButton>
              <button onClick={send} disabled={sending || !email.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#e5484d] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#d33a3f] disabled:opacity-50">
                {sending ? "Granting…" : `Confirm ${isSuper ? "super admin" : "admin"} access`}
              </button>
            </>
          ) : (
            <PrimaryButton onClick={onGrant} disabled={sending || !email.trim()}>
              {sending ? "Granting…" : isSuper ? "Grant super admin access" : "Grant admin access"}
            </PrimaryButton>
          )}
        </div>
      </Modal>
    </>
  );
}