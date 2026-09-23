"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PublicProfileForm } from "@/app/(marketing)/profile/public-profile-form";
import { QualificationsContent } from "@/app/(marketing)/profile/qualifications/qualifications-content";
import { EducationContent } from "@/app/(marketing)/profile/education/education-content";
import { CompanyProfileForm } from "@/app/(marketing)/company/company-profile-form";
import { getMyProfile, type ProfileData } from "@/lib/services/profile";
import { getMyCompany, type CompanyData } from "@/lib/services/company";
import { getQualifications, getEducationList, type Edu } from "@/lib/services/qualifications";
import { listMyProjects, type PortfolioProject } from "@/lib/services/projects";

/**
 * Thin wrappers that pull Personal Profile, Qualifications & Expertise and
 * Company Profile into Account Settings, so the nav matches the redesign's
 * nine sections.
 *
 * They fetch on mount rather than being handed server props: AccountSettings is
 * a client component that swaps sections without navigating, so the alternative
 * would be loading all three payloads on every settings visit regardless of
 * which section is opened. The underlying forms are reused unchanged — the
 * standalone /dashboard/profile and /dashboard/company routes still render the
 * same components.
 */

function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-[13px] text-[#9a9a9a]">
      <Loader2 size={15} className="animate-spin" /> Loading…
    </div>
  );
}

export function PersonalProfilePanel() {
  const [data, setData] = useState<ProfileData | null>(null);
  useEffect(() => { getMyProfile().then((r) => setData(r.data)).catch(() => setData(null)); }, []);
  if (!data) return <Loading />;
  return <PublicProfileForm initial={data} />;
}

type Quals = Awaited<ReturnType<typeof getQualifications>>;

export function QualificationsPanel() {
  const [quals, setQuals] = useState<Quals | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [edu, setEdu] = useState<Edu[]>([]);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  useEffect(() => {
    getQualifications().then(setQuals).catch(() => setQuals(null));
    getMyProfile().then((r) => setProfile(r.data)).catch(() => setProfile(null));
    getEducationList().then(setEdu).catch(() => {});
    listMyProjects().then(setProjects).catch(() => {});
  }, []);
  if (!quals) return <Loading />;
  return (
    <div className="space-y-10">
      <QualificationsContent
        experience={quals.experience}
        skills={quals.skills}
        specializations={quals.specializations}
        certifications={quals.certifications}
        projects={projects}
        practiceStatus={profile?.practiceStatus}
      />
      <EducationContent education={edu} />
    </div>
  );
}

export function CompanyProfilePanel() {
  const [data, setData] = useState<CompanyData | null>(null);
  useEffect(() => { getMyCompany().then((r) => setData(r.data)).catch(() => setData(null)); }, []);
  if (!data) return <Loading />;
  return <CompanyProfileForm initial={data} />;
}
