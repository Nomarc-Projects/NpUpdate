import { PostedJobs } from "@/components/dashboard/posted-jobs";
import { getMyPostedJobs } from "@/lib/services/jobs";

export default async function PostedJobsPage() {
  const jobs = await getMyPostedJobs();
  return <PostedJobs jobs={jobs} />;
}
