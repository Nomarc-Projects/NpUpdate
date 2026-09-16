import { redirect } from "next/navigation";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { EmployerProfileShell } from "@/components/profile/employer-profile-shell";
import { getMyProfile } from "@/lib/services/profile";
import { getQualifications, getEducationList } from "@/lib/services/qualifications";
import { getKycState } from "@/lib/services/kyc";
import { getEmployerProfile } from "@/lib/services/employer";
import { getViewer } from "@/lib/viewer-server";

/**
 * The profile belongs to whichever role is active.
 *
 * This always mounted the PROFESSIONAL profile, so an employer or exhibitor was
 * shown "Highlight your skills and experience" over Occupation, Professional
 * practice status, work experience, skills and education — none of which their
 * role has any use for — and a completeness score measured against that list,
 * which is why an onboarded employer read "0% complete".
 *
 * Exhibitors already have a purpose-built storefront editor at /dashboard/company,
 * so they are sent there rather than given a second one here.
 */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const viewer = await getViewer().catch(() => null);
  const activeRole = viewer?.activeRole;

  if (activeRole === "exhibitor") {
    redirect(tab === "verification" ? "/dashboard/company?tab=credentials" : "/dashboard/company");
  }

  if (activeRole === "employer") {
    const [employer, kycState] = await Promise.all([
      getEmployerProfile().catch(() => null),
      getKycState().catch(() => undefined),
    ]);
    if (!employer) redirect("/dashboard");
    return <EmployerProfileShell employer={employer} kycState={kycState} initialTab={tab === "verification" ? "verification" : "profile"} />;
  }

  const initial = tab === "qualifications" || tab === "education" || tab === "verification" ? tab : "public";
  const [data, quals, education, kycState] = await Promise.all([
    // Logged, not swallowed silently: this exact `.catch` is what turned a hard
    // "column does not exist" error into a blank form that looked like a saving
    // bug, and kept it invisible for weeks.
    getMyProfile()
      .then((r) => r.data)
      .catch((e) => {
        console.error("[profile] getMyProfile failed:", e);
        return undefined;
      }),
    getQualifications().catch(() => undefined),
    getEducationList().catch(() => undefined),
    getKycState().catch(() => undefined),
  ]);
  return <ProfileTabs initial={initial} profile={data} quals={quals} education={education} kycState={kycState} />;
}
