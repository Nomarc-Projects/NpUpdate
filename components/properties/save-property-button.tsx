"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import { toggleSaved } from "@/lib/services/saved";
import { cn } from "@/lib/utils";

export function SavePropertyButton({ id, initialSaved, signedIn }: { id: string; initialSaved: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <a href="/login" className="mt-2 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#e3e3e3] text-[12.5px] font-semibold text-[#1e1e1e] dark:border-white/15 dark:text-white">
        <Bookmark size={13} /> Sign in to save
      </a>
    );
  }

  function toggle() {
    start(async () => {
      try {
        const next = await toggleSaved("property", id);
        setSaved(next);
        toast.success(next ? "Saved to your properties" : "Removed from saved");
        router.refresh();
      } catch {
        toast.error("Couldn't update your saved properties");
      }
    });
  }

  return (
    <button onClick={toggle} disabled={pending} className={cn("mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-[12.5px] font-semibold disabled:opacity-60", saved ? "border-[#22c55e] bg-[#f4fbf5] text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]" : "border-[#e3e3e3] text-[#1e1e1e] dark:border-white/15 dark:text-white")}>
      <Bookmark size={13} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save property"}
    </button>
  );
}
