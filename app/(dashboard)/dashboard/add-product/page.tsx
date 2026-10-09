import { redirect } from "next/navigation";
import { AddProductForm } from "./add-product-form";
import { ExhibitorGate } from "@/components/dashboard/onboarding/exhibitor-gate";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { getExhibitorLimitSummary, getTrialState } from "@/lib/services/exhibitor-trial";
import { getMyCompany } from "@/lib/services/company";

export const metadata = { title: "Add new product" };

export default async function AddProductPage() {
  const viewer = await getViewer();
  if (!can(viewer, "exhibitorDashboard")) {
    return (
      <ExhibitorGate
        title="Become an Exhibitor to add products"
        description="Add your company name and primary industry to open your showroom — takes less than a minute."
      />
    );
  }

  // Plan selection comes after account setup: nobody reaches the upload form
  // without an active, unexpired paid plan. The dashboard routes here as a
  // courtesy, but the URL is typeable — so the gate is enforced again on the
  // way in, and createProduct/setProductStatus enforce it independently.
  const trial = await getTrialState().catch(() => null);
  if (!trial?.subscribed) redirect("/dashboard/plans");

  const [company, limits] = await Promise.all([
    getMyCompany().catch(() => null),
    getExhibitorLimitSummary().catch(() => null),
  ]);
  const allowedCategories = company?.data?.categories ?? [];

  return <AddProductForm allowedCategories={allowedCategories} limits={limits} />;
}
