import { CustomersView } from "@/components/dashboard/exhibitor/customers-view";
import { ExhibitorGate } from "@/components/dashboard/onboarding/exhibitor-gate";
import { getMyCustomers } from "@/lib/services/customers";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const viewer = await getViewer();
  if (!can(viewer, "exhibitorDashboard")) {
    return (
      <ExhibitorGate
        title="Become an Exhibitor to view customers"
        description="Add your company name and primary industry to open your showroom — takes less than a minute."
      />
    );
  }
  const customers = await getMyCustomers();
  return <CustomersView customers={customers} />;
}
