"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dashboard/kit";
import { resetMyAccountForTesting } from "@/lib/services/dev-reset";

/**
 * TEMPORARY — QA-only button so Tee-David can self-serve wipe his own test
 * account back to a brand-new-signup state (no roles, no profile/company/
 * jobs, tours re-armed) to walk through onboarding for each role repeatedly.
 * Remove before public launch.
 */
export function ResetAccountButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      try {
        await resetMyAccountForTesting();
        if (typeof window !== "undefined") {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("nomarc:tour:"))
            .forEach((k) => localStorage.removeItem(k));
        }
        toast.success("Account reset — reloading fresh…");
        setTimeout(() => { window.location.href = "/dashboard"; }, 600);
      } catch {
        toast.error("Reset failed. Please try again.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Reset my account (QA only)"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10 transition-colors"
      >
        <RotateCcw size={15} />
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        loading={pending}
        title="Reset your account?"
        description="Wipes your role grants, profile, company, and posted jobs so you land back on a brand-new-signup flow. Does not touch messages, orders, or other users' data. This is a QA-only tool — irreversible."
        confirmLabel="Reset account"
      />
    </>
  );
}
