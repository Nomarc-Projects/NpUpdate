"use client";

import { useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { useImpersonation } from "@/lib/impersonation-context";
import { stopImpersonation } from "@/lib/services/impersonation";

export function ImpersonationBanner() {
  const { impersonating, target } = useImpersonation();
  const [exiting, setExiting] = useState(false);
  if (!impersonating || !target) return null;

  async function exit() {
    setExiting(true);
    try { await stopImpersonation(); } catch { /* ignore */ }
    window.location.href = "/admin/users"; // hard reload restores the admin session everywhere
  }

  return (
    <div className="sticky top-14 lg:top-0 z-30 bg-[#e5484d] text-white">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2 max-w-full">
        <span className="inline-flex items-center gap-2 text-[13px] min-w-0">
          <ShieldAlert size={15} className="flex-shrink-0" />
          <span className="truncate">Impersonating <strong>{target.email}</strong> — you&apos;re acting as this user.</span>
        </span>
        <button onClick={exit} disabled={exiting} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-[13px] font-semibold flex-shrink-0 transition-colors disabled:opacity-60">
          <X size={14} /> {exiting ? "Exiting…" : "Exit"}
        </button>
      </div>
    </div>
  );
}
