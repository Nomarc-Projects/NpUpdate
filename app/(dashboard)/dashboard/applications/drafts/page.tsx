import { ApplicationDrafts } from "@/components/dashboard/professional/application-drafts";
import { getMyApplications } from "@/lib/services/applications";

export default async function ApplicationDraftsPage() {
  const rows = await getMyApplications(true);
  return <ApplicationDrafts rows={rows} />;
}
