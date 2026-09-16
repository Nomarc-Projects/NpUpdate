"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, X } from "lucide-react";
import { useViewer } from "@/lib/use-viewer";
import { getActiveAnnouncement, type Announcement } from "@/lib/services/announcements";

/** Thin, dismissible banner showing the latest active announcement. Marketing
 *  pages only — the dashboard/admin use fixed full-height layouts. */
export function AnnouncementBanner() {
  const { role } = useViewer();
  const pathname = usePathname();
  const inApp = pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname === "/suspended";
  const [a, setA] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (inApp) return;
    let alive = true;
    getActiveAnnouncement(role).then((res) => {
      if (!alive) return;
      setA(res);
      if (res) setDismissed(localStorage.getItem(`nm-ann-${res.id}`) === "1");
    }).catch(() => {});
    return () => { alive = false; };
  }, [role, inApp]);

  if (inApp || !a || dismissed) return null;

  const inner = (
    <div className="flex items-center gap-2 min-w-0">
      <Megaphone size={15} className="flex-shrink-0 text-[#1e1e1e] dark:text-white" />
      <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{a.title}</span>
      {a.body && <span className="hidden sm:inline text-[13px] text-[#1e1e1e]/70 dark:text-white/70 truncate">— {a.body}</span>}
    </div>
  );

  return (
    <div className="relative z-[60] bg-[#ffd716] dark:bg-[#1e1e1e] dark:border-b dark:border-white/10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        {a.href ? <Link href={a.href} className="min-w-0 hover:underline">{inner}</Link> : inner}
        <button onClick={() => { localStorage.setItem(`nm-ann-${a.id}`, "1"); setDismissed(true); }} aria-label="Dismiss" className="flex-shrink-0 text-[#1e1e1e]/60 hover:text-[#1e1e1e] dark:text-white/50 dark:hover:text-white"><X size={16} /></button>
      </div>
    </div>
  );
}
