import { MyOrders } from "@/components/dashboard/buyer/my-orders";
import { getMyOrders } from "@/lib/services/orders";

export const metadata = { title: "My orders" };

export default async function MyOrdersPage() {
  const orders = await getMyOrders();
  return <MyOrders orders={orders} />;
}
