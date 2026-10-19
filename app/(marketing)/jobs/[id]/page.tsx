import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPublicJobById, getPublicJobsForBrowse } from "@/lib/services/catalog";
import { getJobPostingDetail } from "@/lib/services/jobs";
import { JOB_OVERVIEW, type SampleJob } from "@/lib/sample-jobs";
import { pageMetadata, SITE_URL } from "@/lib/og";
import { JobDetail } from "@/components/dashboard/professional/job-detail";

/**
 * Public job page — a shareable link. Unlike /dashboard/jobs/[id] this does NOT
 * require the job-board capability or a completed professional profile: the
 * posting is public, and only Apply/Message/Save prompt for an account (see
 * JobDetail). A missing or unpublished job is a 404.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await getPublicJobById(id).catch(() => null);
  if (!job) return { title: "Job not found — Nomarc Jobs" };
  return pageMetadata({
    title: `${job.title} at ${job.company}`,
    description: job.desc || `${job.title} at ${job.company} — ${job.location}. Apply on Nomarc Projects.`,
    path: `/jobs/${id}`,
  });
}

export default async function PublicJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job: SampleJob | null = await getPublicJobById(id).catch(() => null);
  if (!job) notFound();

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const signedIn = !!session?.user;

  const [pool, detail] = await Promise.all([
    getPublicJobsForBrowse().catch((): SampleJob[] => []),
    getJobPostingDetail(id).catch(() => ({ requirements: [], skills: [], benefits: [], requireResume: false, requirePortfolio: false, requireCoverLetter: false })),
  ]);

  const similar = pool.filter((j) => j.id !== job.id).slice(0, 4);
  const otherFromCompany = pool.filter((j) => j.id !== job.id && j.company === job.company).slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <JobDetail
        job={job}
        overview={JOB_OVERVIEW}
        detail={detail}
        similar={similar}
        otherFromCompany={otherFromCompany}
        signedIn={signedIn}
        signInHref={`/signup?redirect=/jobs/${id}`}
        jobsBasePath="/jobs"
        backHref={null}
        shareUrl={`${SITE_URL}/jobs/${id}`}
      />
    </div>
  );
}
