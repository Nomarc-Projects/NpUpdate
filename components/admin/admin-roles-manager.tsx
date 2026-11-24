"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, UserMinus, Ban, Check, ShieldAlert, Users } from "lucide-react";
import { Modal, Field, PrimaryButton, GhostButton } from "@/components/ui/modal";
import { setUserRoles, removeAdminAccess, type AdminRosterRow } from "@/lib/services/admin";
import { MANAGEABLE_ROLES, ROLE_LABELS, type ManageableRole } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

const ROLE_DESC: Record<ManageableRole, string> = {
  professional: "Portfolio, services and hiring access",
  exhibitor: "Seller tools — products, analytics and ads",
  employer: "Post jobs and use the employer dashboard",
  admin: "Manage users, verifications and content",
  super_admin: "Full control — admins, impersonation and settings",
};

const ROLE_PILL: Record<ManageableRole, string> = {
  professional: "bg-[#eef4ff] text-[#2b5cb8] dark:bg-[#2b5cb8]/20 dark:text-[#9dc0ff]",
  exhibitor: "bg-[#f2ecff] text-[#6b3fc4] dark:bg-[#6b3fc4]/20 dark:text-[#c4a8ff]",
  employer: "bg-[#eaf7f0] text-[#1a7f43] dark:bg-[#1a7f43]/20 dark:text-[#7fd6a4]",
  admin: "bg-[#fff7cc] text-[#8a7400] dark:bg-[#ffd716]/15 dark:text-[#ffd716]",
  super_admin: "bg-[#fef2f2] text-[#e5484d] dark:bg-[#e5484d]/15 dark:text-[#fca5a5]",
};

function initials(name: string, email: string) {
  const src = (name || email || "").trim();
  if (!src) return "—";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}

type Mode = { kind: "edit" | "remove"; user: AdminRosterRow } | null;

/**
 * Super-admin-only roster of privileged accounts. Each row shows every role the
 * person holds (not just the legacy scalar) and offers two destructive-ish
 * actions: replace their roles, or strip admin access entirely.
 *
 * Both actions call server actions that re-check authorization and the
 * two-super-admin floor, so the UI's guardrails are hints, not the boundary.
 * On success we `router.refresh()` to pick up fresh server-rendered data; role
 * changes take effect on the very next request because every guard reads the
 * database-backed role, not a cached client value.
 */
export function AdminRolesManager({ rows, currentUserId }: { rows: AdminRosterRow[]; currentUserId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [roles, setRoles] = useState<ManageableRole[]>([]);
  const [confirmSuper, setConfirmSuper] = useState(false);
  const [busy, setBusy] = useState(false);

  function openEdit(u: AdminRosterRow) {
    setRoles(u.roles);
    setConfirmSuper(false);
    setMode({ kind: "edit", user: u });
  }

  function toggleRole(r: ManageableRole) {
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
    if (r !== "super_admin") setConfirmSuper(false);
  }

  async function saveRoles() {
    if (!mode || roles.length === 0) return;
    const u = mode.user;
    const hadSuper = u.roles.includes("super_admin");
    const keepsSuper = roles.includes("super_admin");
    if (hadSuper && !keepsSuper && u.id !== currentUserId && !confirmSuper) {
      setConfirmSuper(true);
      return;
    }
    setBusy(true);
    try {
      const res = await setUserRoles(u.id, roles);
      if (!res.ok) { toast.error(res.error ?? "Couldn't change roles"); return; }
      toast.success(`Roles updated for ${u.name || u.email}`);
      setMode(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change roles");
    } finally {
      setBusy(false);
    }
  }

  async function doRemove() {
    if (!mode) return;
    setBusy(true);
    try {
      const res = await removeAdminAccess(mode.user.id);
      if (!res.ok) { toast.error(res.error ?? "Couldn't remove access"); return; }
      toast.success(`Admin access removed for ${mode.user.name || mode.user.email}`);
      setMode(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove access");
    } finally {
      setBusy(false);
    }
  }

  const target = mode?.user;
  const isSelf = target?.id === currentUserId;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#ececec] bg-white dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#ececec] bg-[#fafafa] text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a] dark:border-white/10 dark:bg-white/[0.02]">
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-[#f0f0f0] last:border-b-0 dark:border-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1e1e1e] text-[11px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]">
                        {initials(u.name, u.email)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
                          {u.name || "Unnamed account"}
                          {u.id === currentUserId && <span className="ml-1.5 text-[10px] font-medium text-[#9a9a9a]">(you)</span>}
                        </span>
                        <span className="block truncate text-[11.5px] text-[#9a9a9a]">{u.email}</span>
                      </span>
                      {u.banned && <span title="Suspended" className="flex-shrink-0 rounded-full bg-[#fef2f2] p-1 text-[#e5484d]"><Ban size={12} /></span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.map((r) => (
                        <span key={r} className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold capitalize", ROLE_PILL[r])}>
                          {ROLE_LABELS[r]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6b6b6b] dark:text-white/60">{u.joined || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        title="Change roles"
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                      >
                        <Pencil size={13} /> Change roles
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmSuper(false); setMode({ kind: "remove", user: u }); }}
                        disabled={u.id === currentUserId}
                        title={u.id === currentUserId ? "You can't remove your own admin access" : "Remove admin access"}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#e5484d] transition-colors hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#e5484d]/10"
                      >
                        <UserMinus size={13} /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users size={24} className="text-[#d4d4d4] dark:text-white/20" />
            <p className="text-[13px] text-[#9a9a9a]">No admin accounts yet.</p>
          </div>
        )}
      </div>

      {/* ── Change roles ─────────────────────────────────────────────────── */}
      <Modal
        open={mode?.kind === "edit"}
        onClose={() => setMode(null)}
        title="Change roles"
        subtitle={target ? `${target.name || target.email} — pick the roles they should hold.` : ""}
        maxWidth="max-w-md"
      >
        <Field label={`Roles — ${roles.length} selected`} hint="Changes take effect immediately">
          <div className="space-y-2">
            {MANAGEABLE_ROLES.map((r) => {
              const selected = roles.includes(r);
              const isSuper = r === "super_admin";
              const locked = isSuper && target?.roles.includes("super_admin") && target.id === currentUserId;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { if (!locked) toggleRole(r); }}
                  disabled={locked}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    locked && "cursor-not-allowed opacity-60",
                    selected
                      ? isSuper
                        ? "border-[#e5484d] bg-[#fef2f2] dark:bg-[#e5484d]/10"
                        : "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]"
                      : "border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716]"
                  )}
                >
                  <span className={cn(
                    "mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border",
                    selected ? "border-[#ffd716] bg-[#ffd716] text-[#1e1e1e]" : "border-[#d4d4d4] dark:border-white/25"
                  )}>
                    {selected && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="flex-1">
                    <span className={cn("block text-[13px] font-bold", isSuper ? "text-[#e5484d] dark:text-[#fca5a5]" : "text-[#1e1e1e] dark:text-white")}>
                      {ROLE_LABELS[r]}
                      {locked && <span className="ml-1.5 text-[10px] font-medium text-[#9a9a9a]">(you — locked)</span>}
                    </span>
                    <span className="block text-[11.5px] text-[#9a9a9a]">{ROLE_DESC[r]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        {(confirmSuper || (target?.roles.includes("super_admin") && !roles.includes("super_admin") && !isSelf)) && (
          <div className="mt-4 rounded-xl border border-[#e5484d]/50 bg-[#fef2f2] p-3.5 dark:bg-[#e5484d]/10">
            <p className="flex items-start gap-2 text-[12.5px] font-semibold text-[#e5484d] dark:text-[#fca5a5]">
              <ShieldAlert size={15} className="mt-0.5 flex-shrink-0" />
              At least two super admins must always exist. Removing this person's super admin role is refused if they are one of the last two. {confirmSuper && "Click Save again to confirm."}
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setMode(null)}>Cancel</GhostButton>
          <PrimaryButton onClick={saveRoles} disabled={busy || roles.length === 0}>
            {busy ? "Saving…" : confirmSuper ? "Confirm & save" : "Save roles"}
          </PrimaryButton>
        </div>
      </Modal>

      {/* ── Remove admin access ──────────────────────────────────────────── */}
      <Modal
        open={mode?.kind === "remove"}
        onClose={() => setMode(null)}
        title="Remove admin access"
        subtitle="This takes away the person's admin privileges immediately."
        maxWidth="max-w-sm"
      >
        <p className="text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/70">
          {target && (
            <>
              <strong className="text-[#1e1e1e] dark:text-white">{target.name || target.email}</strong> will lose all
              admin privileges and be returned to a regular account. Any stackable roles granted by an admin
              are revoked; roles they earned themselves are kept. They get an email about the change.
            </>
          )}
        </p>
        {target?.roles.includes("super_admin") && (
          <div className="mt-4 rounded-xl border border-[#e5484d]/50 bg-[#fef2f2] p-3.5 dark:bg-[#e5484d]/10">
            <p className="flex items-start gap-2 text-[12.5px] font-semibold text-[#e5484d] dark:text-[#fca5a5]">
              <ShieldAlert size={15} className="mt-0.5 flex-shrink-0" />
              This is a super admin. At least two super admins must always exist — the removal is refused if they are one of the last two.
            </p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setMode(null)}>Cancel</GhostButton>
          <button
            type="button"
            onClick={doRemove}
            disabled={busy}
            className="rounded-lg bg-[#e5484d] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#cf3b40] disabled:opacity-50"
          >
            {busy ? "Removing…" : "Remove access"}
          </button>
        </div>
      </Modal>
    </>
  );
}
