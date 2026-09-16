import { OrdersView } from "@/components/dashboard/exhibitor/orders-view";
import { ExhibitorGate } from "@/components/dashboard/onboarding/exhibitor-gate";
import { getVendorOrders } from "@/lib/services/orders";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const viewer = await getViewer();
  if (!can(viewer, "exhibitorDashboard")) {
    return (
      <ExhibitorGate
        title="Become an Exhibitor to manage orders"
        description="Add your company name and primary industry to open your showroom — takes less than a minute."
      />
    );
  }
  const orders = await getVendorOrders();
  return <OrdersView orders={orders} />;
}
