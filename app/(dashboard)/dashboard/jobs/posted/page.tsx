import { PostedJobs } from "@/components/dashboard/posted-jobs";
import { getMyPostedJobs } from "@/lib/services/jobs";

export const metadata = { title: "Post Jobs" };

/** Post Jobs / Posted Jobs / Draft merged into one screen (tabs: Active, Drafts, Closed). */
export default async function PostedJobsPage() {
  const jobs = await getMyPostedJobs();
  return <PostedJobs jobs={jobs} />;
}
