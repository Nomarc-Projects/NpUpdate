import { AdminFinanceView } from "@/components/admin/admin-finance";
import { getFinanceOverview, getAdminStats } from "@/lib/services/admin";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Finance — Admin" };

export default async function AdminFinancePage() {
  const session = await auth.api.getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Only admin and super_admin may view the finance page
  if (role !== "admin" && role !== "super_admin") {
    redirect("/dashboard");
  }
  const [finance, stats] = await Promise.all([getFinanceOverview(), getAdminStats()]);
  return <AdminFinanceView finance={finance} stats={stats} />;
}
