import { AdminInsightsView } from "@/components/admin/admin-insights";
import { getInsightsData } from "@/lib/services/admin";

export const metadata = { title: "Insights — Admin" };

export default async function AdminInsightsPage() {
  const data = await getInsightsData();
  return <AdminInsightsView data={data} />;
}
