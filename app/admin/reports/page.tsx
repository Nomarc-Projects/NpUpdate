import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminReports } from "@/components/admin/admin-reports";
import { getReports } from "@/lib/services/admin";
import { auth } from "@/lib/auth";

export const metadata = { title: "Admin Reports" };

export default async function AdminReportsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Only admin and super_admin may view admin reports
  if (role !== "admin" && role !== "super_admin") {
    redirect("/dashboard");
  }
  const reports = await getReports();
  return <AdminReports reports={reports} />;
}
