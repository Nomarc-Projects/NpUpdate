import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminOrdersView } from "@/components/admin/admin-orders";
import { getAdminOrders } from "@/lib/services/admin";
import { auth } from "@/lib/auth";

export const metadata = { title: "Orders — Admin" };

export default async function AdminOrdersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Only admin and super_admin may view admin orders
  if (role !== "admin" && role !== "super_admin") {
    redirect("/dashboard");
  }
  const orders = await getAdminOrders();
  return <AdminOrdersView orders={orders} />;
}
