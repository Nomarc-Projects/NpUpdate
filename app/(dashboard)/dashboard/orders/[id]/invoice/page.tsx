import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/services/orders";
import { OrderInvoice } from "@/components/dashboard/exhibitor/order-invoice";

export default async function OrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();
  return <OrderInvoice order={order} />;
}
