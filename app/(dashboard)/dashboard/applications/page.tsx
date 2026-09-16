import { Applications } from "@/components/dashboard/professional/applications";
import { getMyApplications } from "@/lib/services/applications";

export default async function ApplicationsPage() {
  const rows = await getMyApplications(false);
  return <Applications rows={rows} />;
}
