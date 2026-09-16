"use client";
import { useState } from "react";
import { UserPlus, Crown, User, Eye, Trash2 } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import type { PmMember } from "@/lib/services/pm/types";
import { cn } from "@/lib/utils";

type Role = "owner" | "member" | "viewer";

const ROLE_META: Record<Role, { label: string; icon: typeof Crown; color: string }> = {
  owner:  { label: "Owner",  icon: Crown,     color: "text-[#caa400] bg-[#fff7cc]" },
  member: { label: "Member", icon: User,      color: "text-[#6366f1] bg-[#ede9fe]" },
  viewer: { label: "Viewer", icon: Eye,       color: "text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 dark:text-white/50" },
};

const ROLES: Role[] = ["owner", "member", "viewer"];

interface Props {
  open: boolean;
  onClose: () => void;
  members: PmMember[];
  projectName: string;
}

export function TeamModal({ open, onClose, members, projectName }: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("Member");
  const [invited, setInvited] = useState(false);

  function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInvited(true);
    setTimeout(() => { setInvited(false); setInviteEmail(""); }, 3000);
  }

  function getRole(m: PmMember): Role {
    const r = (m as PmMember & { role?: string }).role as string | undefined;
    if (r === "owner") return "owner";
    if (r === "viewer") return "viewer";
    return "member";
  }

  return (
    <Modal open={open} onClose={onClose} title="Team" subtitle={`Manage access for "${projectName}"`}
      maxWidth="max-w-[520px]"
      footer={<GhostButton onClick={onClose}>Close</GhostButton>}>
      <div className="space-y-5">

        {/* Current members */}
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9a9a9a] mb-3">Members ({members.length})</p>
          <div className="divide-y divide-[#f5f5f5] dark:divide-white/5 rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
            {members.map((m) => {
              const role = getRole(m);
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1e1e1e] hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-[11px] flex-shrink-0">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate">{m.name}</p>
                    {(m as PmMember & { email?: string }).email && (
                      <p className="text-[11px] text-[#9a9a9a] truncate">{(m as PmMember & { email?: string }).email}</p>
                    )}
                  </div>
                  {/* Role badge */}
                  <span className={cn("flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", meta.color)}>
                    <Icon size={10} /> {meta.label}
                  </span>
                  {/* Remove (owners can't be removed) */}
                  {role !== "owner" && (
                    <button className="text-[#c3c3c3] hover:text-[#e5484d] transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite new member */}
        <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-4 bg-[#fafafa] dark:bg-white/[0.02]">
          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-3 flex items-center gap-1.5">
            <UserPlus size={14} className="text-[#caa400]" /> Invite a member
          </p>
          {invited ? (
            <div className="flex items-center gap-2 text-[13px] text-[#16803c] bg-[#dcfce7] rounded-lg px-4 py-3">
              <span className="w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center text-white text-[9px] font-bold">✓</span>
              Invite sent to <strong>{inviteEmail}</strong>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Email address">
                <input type="email" className={inputClass} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                  placeholder="colleague@example.com" />
              </Field>
              <Field label="Role">
                <SelectMenu value={inviteRole} onChange={setInviteRole} options={ROLES.map((r) => ROLE_META[r].label)} placeholder="Select role" />
              </Field>
              <PrimaryButton onClick={sendInvite} disabled={!inviteEmail.trim()} className="w-full justify-center">
                Send invite
              </PrimaryButton>
            </div>
          )}
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((r) => {
            const meta = ROLE_META[r];
            return (
              <div key={r} className="rounded-lg border border-[#ececec] dark:border-white/10 p-3 text-center">
                <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1">{meta.label}</p>
                <p className="text-[11px] text-[#9a9a9a]">
                  {r === "owner" ? "Full control" : r === "member" ? "Edit tasks" : "View only"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
