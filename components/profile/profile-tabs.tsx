"use client";

import { useState } from "react";
import { BadgeCheck, ThumbsUp, User, Award, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react";
import { PublicProfileForm, DEFAULT_AVATAR } from "@/app/(marketing)/profile/public-profile-form";
import { QualificationsContent } from "@/app/(marketing)/profile/qualifications/qualifications-content";
import { EducationContent } from "@/app/(marketing)/profile/education/education-content";
import { KycView, VerificationLevelCard } from "@/components/dashboard/kyc-view";
import { StatusBadge } from "@/components/dashboard/kit/status-badge";
import type { ProfileData } from "@/lib/services/profile";
import type { Experience, Cert, Edu } from "@/lib/services/qualifications";
import type { PortfolioProject } from "@/lib/services/projects";
import type { KycState } from "@/lib/services/kyc";

type Named = { id: string; name: string };
type Quals = { experience: Experience[]; skills: Named[]; specializations: Named[]; certifications: Cert[]; endorsementsTotal?: number };

const TABS: { key: "public" | "qualifications" | "education" | "verification"; label: string; title: string; Icon: LucideIcon }[] = [
  { key: "public", label: "Public Profile", title: "Public profile", Icon: User },
  { key: "qualifications", label: "Qualifications", title: "Qualifications", Icon: Award },
  { key: "education", label: "Experience", title: "Experience", Icon: GraduationCap },
  { key: "verification", label: "Verification", title: "Verification", Icon: ShieldCheck },
];
type Key = (typeof TABS)[number]["key"];

/**
 * Profile section as client-side tabs: switching Public/Qualifications/Education
 * is instant and preserves each form's state (all three stay mounted, inactive
 * ones hidden). No route change / reload within the section. Deep-linkable via
 * ?tab=… for shareable links; switching tabs only updates the URL shallowly.
 */
// Stable identity — an inline `= []` default allocates a new array every render
// and re-triggers child sync-effects (see education-content/qualifications).
const NO_EDU: Edu[] = [];

export function ProfileTabs({ initial = "public", profile, quals, education = NO_EDU, projects = [], kycState }: { initial?: Key; profile?: ProfileData; quals?: Quals; education?: Edu[]; projects?: PortfolioProject[]; kycState?: KycState }) {
  /**
   * A member only counts as a professional — and so only then sees the
   * Qualifications, Education History and Verification tabs — once they have
   * SIGNALLED an interest in finding work (Availability set to "Open to work")
   * and FILLED IN the job-find basics (occupation + bio). New accounts and
   * regular users start with none of that, so they get only the Public Profile
   * ("profile update") tab. The occupation list no longer drives this: a free
   * text occupation is now the norm, and intent + completed fields is the gate.
   */
  const isProfessional =
    profile?.availability === "open_to_work" &&
    !!profile?.headline?.trim() &&
    !!profile?.bio?.trim();

  // Non-professionals land on (and can only navigate to) the Public Profile tab
  // — no deep link should strand them on a hidden tab.
  const [tab, setTab] = useState<Key>(!isProfessional ? "public" : initial);
  const active = TABS.find((t) => t.key === tab)!;
  const displayName = profile?.name || "Your profile";

  // The identity tab is the member's public profile; on a professional account
  // it reads "Professional profile" rather than "Public profile".
  const identityLabel = isProfessional ? "Professional Profile" : "Public Profile";
  const identityTitle = isProfessional ? "Professional profile" : "Public profile";
  const tabLabel = (t: Key) => (t === "public" ? identityLabel : TABS.find((x) => x.key === t)?.label ?? "");
  const tabTitle = (t: Key) => (t === "public" ? identityTitle : TABS.find((x) => x.key === t)?.title ?? "");

  // The rail shows the professional tabs only to professionals.
  const visibleTabs = isProfessional ? TABS : TABS.filter((t) => t.key === "public");

  const select = (k: Key) => {
    setTab(k);
    // keep the URL in sync without a navigation/remount
    window.history.replaceState(null, "", k === "public" ? "/dashboard/profile" : `/dashboard/profile?tab=${k}`);
  };

  return (
    <div className="min-h-full bg-white dark:bg-[#161616]">
      <div className="max-w-[1400px] mx-auto px-6 pt-12 pb-24">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* The mark needs contain + a light ground to read; an uploaded photo
              fills the circle. Mirrors the avatar row in PublicProfileForm. */}
          <img src={profile?.avatarUrl || DEFAULT_AVATAR} alt={displayName} className={`w-12 h-12 rounded-full ${profile?.avatarUrl ? "object-cover" : "object-contain p-2.5 bg-white dark:bg-white"}`} />
          <div>
            <h1 className="text-2xl md:text-[28px] font-bold leading-tight flex items-center gap-2 flex-wrap">
              <span><span className="text-[#9a9a9a]">{displayName}</span>{" "}<span className="text-[#1e1e1e] dark:text-white">/ {tabTitle(active.key)}</span></span>
              {profile?.verified && <StatusBadge tone="blue"><BadgeCheck size={13} /> Verified</StatusBadge>}
              {!!quals?.endorsementsTotal && <StatusBadge tone="yellow"><ThumbsUp size={12} /> {quals.endorsementsTotal} endorsements</StatusBadge>}
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-0.5">Highlight your skills and experience</p>
          </div>
        </div>

        {/* Verification level — professional-only */}
        {isProfessional && kycState && (
          <div className="mt-8">
            <VerificationLevelCard kycState={kycState} />
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10">
          <nav aria-label="Profile sections">
            {/* mobile: horizontal scroll */}
            <div className="md:hidden flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
              {visibleTabs.map((t) => {
                const active = t.key === tab;
                return (
                  <button key={t.key} type="button" onClick={() => select(t.key)} aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors flex-shrink-0 ${active ? "bg-[#ffd716]/15 dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white font-semibold" : "bg-white dark:bg-[#1e1e1e] text-[#6b6b6b] dark:text-white/50 hover:text-[#1e1e1e] dark:hover:text-white border border-[#e8e8e8] dark:border-white/10"}`}>
                    <t.Icon size={14} /> {tabLabel(t.key)}
                  </button>
                );
              })}
            </div>
            {/* desktop: vertical card */}
            <div className="hidden md:block bg-white dark:bg-[#1e1e1e] rounded-xl border border-[#e8e8e8] dark:border-white/10 overflow-hidden">
              {visibleTabs.map((t) => {
                const active = t.key === tab;
                return (
                  <button key={t.key} type="button" onClick={() => select(t.key)} aria-current={active ? "page" : undefined}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium transition-colors border-b border-[#f0f0f0] dark:border-white/5 last:border-0 text-left ${active ? "bg-[#ffd716]/12 dark:bg-[#ffd716]/[0.08] text-[#1e1e1e] dark:text-white font-semibold border-l-[3px] border-l-[#ffd716]" : "text-[#6b6b6b] dark:text-white/50 hover:bg-[#f7f7f7] dark:hover:bg-white/[0.04] hover:text-[#1e1e1e] dark:hover:text-white pl-[18px]"}`}>
                    <t.Icon size={15} className={active ? "text-[#caa400]" : ""} /> {tabLabel(t.key)}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="min-w-0">
            <div className={tab === "public" ? "" : "hidden"}>
              <PublicProfileForm initial={profile} />
            </div>
            <div className={tab === "qualifications" ? "" : "hidden"}>
              <EducationContent education={education} mode="education" />
              <div className="mt-8">
                <QualificationsContent mode="skills" experience={quals?.experience} skills={quals?.skills} specializations={quals?.specializations} certifications={quals?.certifications} practiceStatus={profile?.practiceStatus} />
              </div>
              <div className="mt-8">
                <EducationContent education={education} mode="references" />
              </div>
            </div>
            <div className={tab === "education" ? "" : "hidden"}>
              <QualificationsContent mode="experience" experience={quals?.experience} skills={quals?.skills} specializations={quals?.specializations} certifications={quals?.certifications} projects={projects} practiceStatus={profile?.practiceStatus} />
            </div>
            <div className={tab === "verification" ? "" : "hidden"}>{kycState && <KycView kycState={kycState} embedded />}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function ProfileTabsSkeleton() {
  const S = ({ cls = "" }: { cls?: string }) => <div className={`skeleton rounded-md ${cls}`} />;
  return (
    <div className="min-h-full bg-white dark:bg-[#161616]">
      <div className="max-w-[1400px] mx-auto px-6 pt-12 pb-24">
        <div className="flex items-center gap-4">
          <S cls="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="space-y-1.5"><S cls="h-7 w-52" /><S cls="h-3.5 w-40" /></div>
        </div>
        <div className="mt-8 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5"><S cls="h-4 w-44" /><S cls="h-3 w-64 max-w-full" /></div>
            <S cls="h-9 w-32 rounded-lg flex-shrink-0" />
          </div>
          <S cls="mt-3 h-1.5 w-full rounded-full" />
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10">
          <div className="space-y-1 rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-3 border-b border-[#f0f0f0] dark:border-white/5 last:border-0">
                <S cls="w-4 h-4 rounded flex-shrink-0" /><S cls="h-3.5 w-24" />
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, s) => (
              <div key={s} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-4">
                <S cls="h-4 w-32" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2"><S cls="h-3 w-24" /><S cls="h-10 w-full rounded-xl" /></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
