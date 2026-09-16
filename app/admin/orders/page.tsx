import { AdminOrdersView } from "@/components/admin/admin-orders";
import { getAdminOrders } from "@/lib/services/admin";

export const metadata = { title: "Orders — Admin" };

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  return <AdminOrdersView orders={orders} />;
}
