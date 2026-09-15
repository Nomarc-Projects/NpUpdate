"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { setPwa } from "@/lib/services/platform-settings";
import type { PwaSetting } from "@/lib/services/platform-settings-shared";
import { cn } from "@/lib/utils";

export function PwaView({ current }: { current: PwaSetting }) {
  const [enabled, setEnabled] = useState(current.enabled);
  const [pending, start] = useTransition();

  function toggle(v: boolean) {
    setEnabled(v);
    start(async () => {
      try {
        await setPwa({ enabled: v });
        toast.success(v ? "PWA is enabled — visitors can install the app" : "PWA is disabled — install prompt and service worker are off");
      } catch {
        setEnabled(!v);
        toast.error("Couldn't save. Check you're still signed in as an admin.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div
        className={cn(
          "rounded-2xl border bg-white p-5 transition-colors dark:bg-[#1e1e1e]",
          enabled
            ? "border-[#22c55e]/50 bg-[#f4fbf5] dark:border-[#22c55e]/30 dark:bg-[#22c55e]/[0.04]"
            : "border-[#ececec] dark:border-white/10",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div
              className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                enabled ? "bg-[#22c55e] text-white" : "bg-[#f5f5f5] text-[#9a9a9a] dark:bg-white/5",
              )}
            >
              <Smartphone size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">
                PWA (Progressive Web App)
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9a9a9a]">
                {enabled
                  ? "Visitors can install Nomarc to their home screen and get offline support via the service worker."
                  : "Installability is off — the install prompt will not show and the service worker will not register."}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggle(!enabled)}
            disabled={pending}
            aria-label={enabled ? "Disable the PWA" : "Enable the PWA"}
            className={cn(
              "relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors disabled:opacity-60",
              enabled ? "bg-[#22c55e]" : "bg-[#e3e3e3] dark:bg-white/10",
            )}
          >
            <div
              className={cn(
                "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all",
                enabled ? "left-[22px]" : "left-[3px]",
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}