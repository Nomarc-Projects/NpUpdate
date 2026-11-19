import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/dashboard/professional/apply-form";
import { ApplyEmailNotice, ApplyExternalNotice } from "@/components/dashboard/professional/apply-instructions";
import { ProfessionalGate } from "@/components/dashboard/onboarding/professional-gate";
import { getJobById } from "@/lib/services/catalog";
import { getJobPostingDetail } from "@/lib/services/jobs";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { getCurrentUserId } from "@/lib/server-user";
import { professionalOnboardingComplete } from "@/lib/services/profile-checklist";

/** Poster-supplied targets are free text: only allow a safe http(s) link. */
function safeApplyUrl(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function safeApplyEmail(raw: string | null): string | null {
  const value = raw?.trim().replace(/^mailto:/i, "").trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

export default async function JobApplyPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) redirect("/dashboard/jobs");

  const { job } = await searchParams;
  if (!job) redirect("/dashboard/jobs");
  const j = await getJobById(job);
  if (!j) redirect("/dashboard/jobs");

  const header = { id: j.id, title: j.title, company: j.company, location: j.location };

  // External/email applications create no Nomarc application record, so the
  // instructions can be shown without first completing the applicant profile.
  if (j.applyMethod === "url") {
    return <ApplyExternalNotice job={header} url={safeApplyUrl(j.applyTarget)} />;
  }
  if (j.applyMethod === "email") {
    return <ApplyEmailNotice job={header} email={safeApplyEmail(j.applyTarget)} />;
  }

  const uid = await getCurrentUserId();
  if (!uid || !(await professionalOnboardingComplete(uid))) {
    return (
      <ProfessionalGate
        title="Complete your profile to apply"
        description="All fields must be filled before you can apply to jobs."
      />
    );
  }

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
