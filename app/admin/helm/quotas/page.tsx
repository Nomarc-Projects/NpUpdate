import { listHelmQuotas } from "@/lib/services/helm-admin";
import { HelmQuotasView } from "@/components/admin/helm/helm-quotas";

export const metadata = { title: "Nomabot quotas & tiers — Admin" };

export default async function AdminHelmQuotasPage() {
  const { plans, overrides, period } = await listHelmQuotas();
  return <HelmQuotasView plans={plans} overrides={overrides} period={period} />;
}
