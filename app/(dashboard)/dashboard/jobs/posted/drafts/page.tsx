import { PostedJobs } from "@/components/dashboard/posted-jobs";
import { getMyPostedJobs } from "@/lib/services/jobs";

/** "Draft" nav destination — Posted Jobs with the Drafts tab preselected. */
export default async function JobDraftsPage() {
  const jobs = await getMyPostedJobs();
  return <PostedJobs jobs={jobs} initialTab="drafts" />;
}
