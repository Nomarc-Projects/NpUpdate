import { AdminFinanceView } from "@/components/admin/admin-finance";
import { getFinanceOverview, getAdminStats } from "@/lib/services/admin";

export const metadata = { title: "Finance — Admin" };

export default async function AdminFinancePage() {
  const [finance, stats] = await Promise.all([getFinanceOverview(), getAdminStats()]);
  return <AdminFinanceView finance={finance} stats={stats} />;
}
