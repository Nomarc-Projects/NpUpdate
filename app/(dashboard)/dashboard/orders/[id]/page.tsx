import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/services/orders";
import { OrderDetail } from "@/components/dashboard/exhibitor/order-detail";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();
  return <OrderDetail order={order} />;
}
