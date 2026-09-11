import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/dashboard/professional/apply-form";
import { ProfessionalGate } from "@/components/dashboard/onboarding/professional-gate";
import { getJobById } from "@/lib/services/catalog";
import { getJobPostingDetail } from "@/lib/services/jobs";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { getCurrentUserId } from "@/lib/server-user";
import { professionalOnboardingComplete } from "@/lib/services/profile-checklist";

export default async function JobApplyPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) redirect("/dashboard/jobs");
  const uid = await getCurrentUserId();
  if (!uid || !(await professionalOnboardingComplete(uid))) {
    return (
      <ProfessionalGate
        title="Complete your profile to apply"
        description="All fields must be filled before you can apply to jobs."
      />
    );
  }

  const { job } = await searchParams;
  if (!job) redirect("/dashboard/jobs");
  const j = await getJobById(job);
  if (!j) redirect("/dashboard/jobs");

  const detail = await getJobPostingDetail(j.id).catch(() => null);

  return (
    <ApplyForm
      jobId={j.id}
      jobTitle={j.title}
      jobCompany={j.company}
      jobLocation={j.location}
      required={{
        resume: detail?.requireResume ?? false,
        portfolio: detail?.requirePortfolio ?? false,
        coverLetter: detail?.requireCoverLetter ?? false,
      }}
    />
  );
}
