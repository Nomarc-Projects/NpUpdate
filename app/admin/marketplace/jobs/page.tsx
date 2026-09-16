import { JobBoardModeration } from "@/components/admin/job-board-moderation";
import { getAdminJobs } from "@/lib/services/admin";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default async function AdminJobBoardPage() {
  const jobs = await getAdminJobs();
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title="Job Board" subtitle="Manage job listings, monitor hiring activity, and handle suspended jobs." />
      <JobBoardModeration rows={jobs} />
    </div>
  );
}
