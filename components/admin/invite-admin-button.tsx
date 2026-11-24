"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, ShieldAlert, Check } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { assignRolesByEmail } from "@/lib/services/admin";
import { MANAGEABLE_ROLES, ROLE_LABELS, type ManageableRole } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

/** Short, user-facing description for each of the five assignable roles. */
const ROLE_DESC: Record<ManageableRole, string> = {
  professional: "Portfolio, services and hiring access",
  exhibitor: "Seller tools — products, analytics and ads",
  employer: "Post jobs and use the employer dashboard",
  admin: "Manage users, verifications and content",
  super_admin: "Full control — admins, impersonation and settings",
};

const ROLE_ICON: Record<ManageableRole, typeof ShieldCheck> = {
  professional: ShieldCheck,
  exhibitor: ShieldCheck,
  employer: ShieldCheck,
  admin: ShieldCheck,
  super_admin: ShieldAlert,
};

export function InviteAdminButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<ManageableRole[]>([]);
  const [confirmSuper, setConfirmSuper] = useState(false);
  const [sending, setSending] = useState(false);

  function reset() {
    setOpen(false);
    setEmail("");
    setRoles([]);
    setConfirmSuper(false);
  }

  function toggleRole(r: ManageableRole) {
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
    if (r !== "super_admin") setConfirmSuper(false);
  }

  const hasSuper = roles.includes("super_admin");

  async function submit() {
    if (!email.trim() || roles.length === 0) return;
    // Promoting to super admin needs an explicit second confirmation — a
    // two-click, full-platform-control change shouldn't fire from one tap.
    if (hasSuper && !confirmSuper) { setConfirmSuper(true); return; }
    setSending(true);
    try {
      const res = await assignRolesByEmail(email.trim(), roles);
      if (!res.ok) { toast.error(res.error ?? "Couldn't assign roles"); return; }
      toast.success(`${email.trim()} has been assigned ${roles.map((r) => ROLE_LABELS[r]).join(", ")}`);
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't assign roles");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">
        <UserPlus size={13} /> Add Admin
      </button>
      <Modal
        open={open}
        onClose={reset}
        title="Add an Administrator"
        subtitle="Assign one or more roles to an existing account. They'll get an email about the change."
        maxWidth="max-w-md"
      >
        <Field label="Email address" hint="Must already have a Nomarc account">
          <input
            className={inputClass}
            autoFocus
            value={email}
            onChange={(e) => { setEmail(e.target.value); setConfirmSuper(false); }}
            placeholder="teammate@company.com"
            type="email"
          />
        </Field>

        <Field label={`Roles — ${roles.length} selected`}>
          <div className="space-y-2">
            {MANAGEABLE_ROLES.map((r) => {
              const selected = roles.includes(r);
              const Icon = ROLE_ICON[r];
              const isSuper = r === "super_admin";
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    selected
                      ? isSuper
                        ? "border-[#e5484d] bg-[#fef2f2] dark:bg-[#e5484d]/10"
                        : "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]"
                      : "border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716]"
                  )}
                >
                  <Icon size={16} className={cn(
                    "mt-0.5 flex-shrink-0",
                    selected ? (isSuper ? "text-[#e5484d]" : "text-[#1a7f43]") : "text-[#9a9a9a]"
                  )} />
                  <span className="flex-1">
                    <span className={cn("block text-[13px] font-bold", isSuper ? "text-[#e5484d] dark:text-[#fca5a5]" : "text-[#1e1e1e] dark:text-white")}>{ROLE_LABELS[r]}</span>
                    <span className="block text-[11.5px] text-[#9a9a9a]">{ROLE_DESC[r]}</span>
                  </span>
                  <span className={cn(
                    "mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border",
                    selected ? "border-[#ffd716] bg-[#ffd716] text-[#1e1e1e]" : "border-[#d4d4d4] dark:border-white/25"
                  )}>
                    {selected && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        {confirmSuper && (
          <div className="rounded-xl border border-[#e5484d]/50 bg-[#fef2f2] p-3.5 dark:bg-[#e5484d]/10">
            <p className="flex items-start gap-2 text-[12.5px] font-semibold text-[#e5484d] dark:text-[#fca5a5]">
              <ShieldAlert size={15} className="mt-0.5 flex-shrink-0" />
              Super admins can manage other admins, impersonate users and change platform settings. Confirm you want to give {email || "this person"} full control? At least two super admins must always exist.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          {confirmSuper && <GhostButton onClick={() => setConfirmSuper(false)}>Back</GhostButton>}
          <GhostButton onClick={reset}>Cancel</GhostButton>
          <PrimaryButton onClick={submit} disabled={sending || !email.trim() || roles.length === 0}>
            {sending ? "Assigning…" : confirmSuper ? "Confirm & assign" : hasSuper ? "Continue" : `Assign ${roles.length} role${roles.length === 1 ? "" : "s"}`}
          </PrimaryButton>
        </div>
      </Modal>
    </>
  );
}
