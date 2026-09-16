import { notFound } from "next/navigation";
import { JobApplicants } from "@/components/dashboard/job-applicants";
import { getJobApplicants } from "@/lib/services/jobs";

export default async function JobApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getJobApplicants(id);
  if (!data) notFound();
  return <JobApplicants jobId={id} jobTitle={data.jobTitle} applicants={data.applicants} />;
}
