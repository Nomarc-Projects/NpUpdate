"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Download } from "lucide-react";
import { Modal, Field, inputClass, GhostButton } from "@/components/ui/modal";
import { signOut } from "@/lib/auth-client";
import { deleteMyAccount, deleteRoleProfile } from "@/lib/services/account";
import { exportMyData } from "@/lib/services/data-export";
import type { StackableRole } from "@/lib/entitlements";
import { RoleSection } from "@/components/dashboard/settings/role-section";

const ROLE_COPY: Record<StackableRole, { section: string; question: string; body: string; link: string }> = {
  professional: {
    section: "",
    question: "Are you sure you want to delete your Nomarc account?",
    body: "Deleting your account will permanently remove your public profile, portfolio projects, and active job applications. It will also permanently erase any employer or exhibitor profiles associated with your account, including all active job postings and product catalogs. You will lose access to the professional directory, and this action cannot be undone.",
    link: "I want to permanently delete my account",
  },
  exhibitor: {
    section: "Delete Exhibitor Profile",
    question: "Are you sure you want to delete your Exhibitor profile?",
    body: "Deleting your exhibitor profile will permanently remove your company profile from the Exhibition Hub. All of your listed products, catalogs, and pending quote requests will be permanently erased, and this action cannot be undone. Your primary Nomarc account, personal professional profile, and employer profile (if active) will not be affected.",
    link: "I want to permanently delete my exhibitor profile",
  },
  employer: {
    section: "Delete Employer Profile",
    question: "Are you sure you want to delete your Employer profile?",
    body: "Deleting your employer profile will permanently remove your company's hiring presence from the platform. All of your active job postings, applicant data, and recruiter messages will be permanently erased, and this action cannot be undone. Your primary Nomarc account, personal professional profile, and exhibitor profile (if active) will not be affected.",
    link: "I want to permanently delete my employer profile",
  },
};

export function DeletePanel({ heldRoles }: { heldRoles: StackableRole[] }) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [target, setTarget] = useState<StackableRole | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [pending, start] = useTransition();
  const armed = confirmText.trim().toUpperCase() === "DELETE";

  async function downloadData() {
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `nomarc-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded");
    } catch { toast.error("Could not export your data"); }
    finally { setExporting(false); }
  }

  function confirmDelete() {
    if (!armed || !target) return;
    start(async () => {
      try {
        if (target === "professional") {
          await deleteMyAccount();
          await signOut();
          toast.success("Your account has been deleted");
          router.push("/");
        } else {
          const res = await deleteRoleProfile(target);
          if (!res.ok) { toast.error(res.error ?? "Could not delete this profile"); return; }
          toast.success(`Your ${target} profile has been deleted`);
          setTarget(null);
          router.refresh();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete this profile");
      }
    });
  }

  const other = heldRoles.filter((r) => r !== "professional");

  return (
    <div>
      {/* NDPR: download a copy of your data */}
      <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[14px] font-semibold text-[#1e1e1e] dark:text-white">Download your data</p>
          <p className="text-[13px] text-[#9a9a9a] mt-0.5 max-w-[420px]">Get a JSON copy of your profile, listings, applications and activity (NDPR data portability).</p>
        </div>
        <button type="button" disabled={exporting} onClick={downloadData} className="inline-flex items-center gap-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 px-4 py-2 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors disabled:opacity-60">
          <Download size={15} /> {exporting ? "Preparing…" : "Download my data"}
        </button>
      </div>

      <DeleteBlock copy={ROLE_COPY.professional} onRequest={() => { setConfirmText(""); setTarget("professional"); }} />

      {other.map((role) => (
        <RoleSection key={role} title={ROLE_COPY[role].section}>
          <DeleteBlock copy={ROLE_COPY[role]} onRequest={() => { setConfirmText(""); setTarget(role); }} />
        </RoleSection>
      ))}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="This action is permanent"
        subtitle="Type DELETE to confirm. This data will be erased immediately — this cannot be undone."
        footer={
          <>
            <GhostButton type="button" onClick={() => setTarget(null)}>Cancel</GhostButton>
            <button
              type="button"
              disabled={!armed || pending}
              onClick={confirmDelete}
              className="rounded-lg bg-[#e5484d] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#cf3b40] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
          </>
        }
      >
        <Field label="Type DELETE to confirm">
          <input className={inputClass} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" autoFocus />
        </Field>
      </Modal>
    </div>
  );
}

function DeleteBlock({ copy, onRequest }: { copy: { question: string; body: string; link: string }; onRequest: () => void }) {
  return (
    <div>
      <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{copy.question}</h2>
      <p className="text-[13px] text-[#9a9a9a] leading-relaxed mt-2 max-w-[560px]">{copy.body}</p>
      <button
        type="button"
        onClick={onRequest}
        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#e5484d] hover:underline"
      >
        <AlertTriangle size={14} />
        {copy.link}
      </button>
    </div>
  );
}
