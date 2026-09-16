import { getHelmOverview } from "@/lib/services/helm-admin";
import { HelmOverviewView } from "@/components/admin/helm/helm-overview";

export const metadata = { title: "Nomabot — Admin" };

export default async function AdminHelmOverviewPage() {
  const data = await getHelmOverview();
  return <HelmOverviewView data={data} />;
}
