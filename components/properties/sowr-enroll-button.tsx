"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { joinSowr, withdrawSowr } from "@/lib/services/sowr";

export function SowrEnrollButton({ enrolled }: { enrolled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function run(action: "join" | "withdraw") {
    setBusy(true);
    startTransition(async () => {
      try {
        if (action === "join") {
          await joinSowr();
          toast.success("You're enrolled in SOWR");
        } else {
          await withdrawSowr();
          toast.success("SOWR membership withdrawn");
        }
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        setBusy(false);
      }
    });
  }

  const disabled = busy || pending;
  return enrolled ? (
    <button type="button" disabled={disabled} onClick={() => run("withdraw")} className="rounded-xl border border-white/25 px-5 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-60">
      {disabled ? "Updating…" : "Withdraw membership"}
    </button>
  ) : (
    <button type="button" disabled={disabled} onClick={() => run("join")} className="rounded-xl bg-white px-5 py-2.5 text-[12.5px] font-bold text-[#1e1e1e] disabled:opacity-60">
      {disabled ? "Joining…" : "Join SOWR"}
    </button>
  );
}
