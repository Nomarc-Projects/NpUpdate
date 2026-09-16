import { AdminReports } from "@/components/admin/admin-reports";
import { getReports } from "@/lib/services/admin";

export default async function AdminReportsPage() {
  const reports = await getReports();
  return <AdminReports reports={reports} />;
}
