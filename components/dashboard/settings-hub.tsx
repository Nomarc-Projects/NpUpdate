"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/theme";
import { useEffect } from "react";
import {
  Pencil, ChevronRight, UserCog, Mail, Lock, Sparkles, FileText, Bell, ShieldCheck, Sun, Moon,
  Trash2, User, GraduationCap, type LucideIcon,
} from "lucide-react";
import { saveProfile } from "@/lib/services/profile";
import { cn } from "@/lib/utils";
import { animateThemeChange } from "@/lib/theme-transition";

type Row = { label: string; sub?: string; href: string; icon: LucideIcon; danger?: boolean };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U";
}

function RowLink({ r }: { r: Row }) {
  const Icon = r.icon;
  return (
    <Link href={r.href} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#fafafa] dark:hover:bg-white/[0.03] transition-colors">
      <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", r.danger ? "bg-[#fdecec] dark:bg-[#e5484d]/10 text-[#e5484d]" : "bg-[#f5f5f5] dark:bg-white/5 text-[#6b6b6b] dark:text-white/70")}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[14px] font-medium", r.danger ? "text-[#e5484d]" : "text-[#1e1e1e] dark:text-white")}>{r.label}</p>
        {r.sub && <p className="text-[12px] text-[#9a9a9a] truncate">{r.sub}</p>}
      </div>
      <ChevronRight size={17} className="text-[#c9c9c9] flex-shrink-0" />
    </Link>
  );
}

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <p className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a]">{title}</p>
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] divide-y divide-[#f3f3f3] dark:divide-white/5 overflow-hidden">
        {rows.map((r) => <RowLink key={r.label} r={r} />)}
      </div>
    </div>
  );
}

export function SettingsHub({ name, email, avatarUrl, availability, planLabel, role, paymentPlansEnabled = true }: {
  name: string; email: string; avatarUrl: string; availability: string; planLabel: string; role: "professional" | "exhibitor"; paymentPlansEnabled?: boolean;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const onValue = role === "exhibitor" ? "hiring" : "open_to_work";
  const [available, setAvailable] = useState(!!availability && availability !== "none");
  const [busy, setBusy] = useState(false);
  function toggleAvail() {
    const next = !available;
    setAvailable(next); setBusy(true);
    saveProfile({ availability: next ? onValue : "none" })
      .then(() => toast.success(next ? "You're now visible as available" : "Availability turned off"))
      .catch(() => { setAvailable(!next); toast.error("Couldn't update"); })
      .finally(() => setBusy(false));
  }

  /**
   * This is the only settings list on mobile, so it lists everything.
   *
   * It used to be a partial index: five of its rows deep-linked into a SECOND
   * list at /dashboard/settings/account, whose own sections then opened as an
   * accordion — three levels to reach one field. Four sections (Personal
   * Profile, Qualifications, Company Profile, Billing & Subscriptions) were
   * reachable only from that nested list and so were effectively hidden here.
   *
   * Identity rows point at /dashboard/profile, which is the single editor for
   * public identity; account rows open their settings section directly.
   */
  const profileRows: Row[] = [
    { label: "Personal profile", sub: "Photo, bio, occupation", href: "/dashboard/profile", icon: User },
    { label: "Qualifications & expertise", sub: "Experience, skills, education", href: "/dashboard/profile?tab=qualifications", icon: GraduationCap },
    { label: "Verification", sub: "Identity & business documents", href: "/dashboard/profile?tab=verification", icon: ShieldCheck },
  ];
  const account: Row[] = [
    { label: "Account information", sub: "Name, phone, contact person", href: "/dashboard/settings/account?tab=info", icon: UserCog },
    { label: "Change email", sub: email, href: "/dashboard/settings/account?tab=email", icon: Mail },
    { label: "Change password", href: "/dashboard/settings/account?tab=password", icon: Lock },
  ];
  const membership: Row[] = [
    // "Plans & upgrades" is hidden while payment plans are paused (super-admin
    // toggle); Billing & invoices (past charges) stays.
    ...(paymentPlansEnabled
      ? [{ label: "Plans & upgrades", sub: `Current: ${planLabel}`, href: "/dashboard/plans", icon: Sparkles }]
      : []),
    { label: "Billing & invoices", sub: "Payment method, receipts", href: "/dashboard/billing", icon: FileText },
  ];
  // One notifications row, not two. "Email notifications" here and "Email
  // Notifications" inside account settings were the same preferences.
  const prefs: Row[] = [
    { label: "Notifications", sub: "Email & in-app alerts", href: "/dashboard/settings/account?tab=notifications", icon: Bell },
  ];
  const danger: Row[] = [
    { label: "Delete account", href: "/dashboard/settings/account?tab=delete", icon: Trash2, danger: true },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[760px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white mb-5">Settings</h1>

      {/* profile header */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-lg flex-shrink-0">{initials(name)}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-[#1e1e1e] dark:text-white truncate">{name || "Your profile"}</p>
            <p className="text-[13px] text-[#9a9a9a] truncate">{email}</p>
          </div>
          <Link href="/dashboard/profile" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors flex-shrink-0"><Pencil size={14} /> <span className="hidden sm:inline">Edit</span></Link>
        </div>

        {/* availability */}
        <div className="mt-4 pt-4 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">Availability</p>
            <p className="text-[12px] text-[#9a9a9a]">{available ? (role === "exhibitor" ? "Open for business" : "Open to work") : "Not available"}</p>
          </div>
          <button type="button" role="switch" aria-checked={available} disabled={busy} onClick={toggleAvail} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-60", available ? "bg-[#16a34a]" : "bg-[#e3e3e3] dark:bg-white/20")}>
            <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200", available ? "translate-x-[22px]" : "translate-x-[2px]")} />
          </button>
        </div>
      </div>

      {/* grouped rows */}
      <div className="mt-6 space-y-6">
        <Group title="Profile" rows={profileRows} />
        <Group title="Account" rows={account} />
        <Group title="Membership" rows={membership} />
        <Group title="Preferences" rows={prefs} />

        {/* appearance */}
        <div>
          <p className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a]">Appearance</p>
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3">
            <div className="flex items-center bg-[#f0f0f0] dark:bg-white/5 rounded-full p-1 gap-1">
              <button type="button" onClick={(e) => animateThemeChange("light", setTheme, { x: e.clientX, y: e.clientY })} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] font-medium transition-all", !isDark ? "bg-white text-[#1e1e1e] shadow-sm" : "text-[#9a9a9a]")}><Sun size={15} /> Light</button>
              <button type="button" onClick={(e) => animateThemeChange("dark", setTheme, { x: e.clientX, y: e.clientY })} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] font-medium transition-all", isDark ? "bg-[#1e1e1e] text-white shadow-sm ring-1 ring-white/10" : "text-[#9a9a9a]")}><Moon size={15} /> Dark</button>
            </div>
          </div>
        </div>

        <Group title="Danger zone" rows={danger} />
      </div>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function SettingsSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[760px] mx-auto space-y-4">
      <S cls="h-7 w-28 mb-1" />
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <S cls="w-14 h-14 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <S cls="h-4 w-36" />
            <S cls="h-3 w-44 max-w-full" />
          </div>
          <S cls="h-9 w-16 rounded-lg flex-shrink-0" />
        </div>
        <div className="mt-4 pt-4 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between gap-3">
          <div className="space-y-1"><S cls="h-3.5 w-24" /><S cls="h-3 w-32" /></div>
          <S cls="h-6 w-11 rounded-full" />
        </div>
      </div>
      <div className="rounded-2xl bg-[#1e1e1e] dark:bg-[#262626] p-4 sm:p-5 flex items-center gap-4">
        <S cls="w-11 h-11 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.1)" }} />
        <div className="flex-1 space-y-1.5">
          <S cls="h-3.5 w-40" style={{ background: "rgba(255,255,255,0.1)" }} />
          <S cls="h-3 w-56 max-w-full" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>
        <S cls="w-5 h-5 rounded" style={{ background: "rgba(255,255,255,0.1)" }} />
      </div>
      {[["Account", 4], ["Membership", 3], ["Preferences", 3]].map(([label, count]) => (
        <div key={label as string}>
          <S cls="h-3 w-20 mb-2 mx-1" />
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] divide-y divide-[#f3f3f3] dark:divide-white/5 overflow-hidden">
            {Array.from({ length: count as number }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                <S cls="w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1"><S cls="h-3.5 w-32" /><S cls="h-3 w-24" /></div>
                <S cls="w-4 h-4 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <S cls="h-3 w-24 mb-2 mx-1" />
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3">
          <S cls="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
