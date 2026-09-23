import { AddProductForm } from "./add-product-form";
import { ExhibitorGate } from "@/components/dashboard/onboarding/exhibitor-gate";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { getTrialState } from "@/lib/services/exhibitor-trial";
import { TrialExhausted } from "@/components/dashboard/exhibitor/trial-exhausted";
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

  // The dashboard raises a modal before sending anyone here, but the URL is
  // typeable — so the allowance is checked again on the way in. Drafting is
  // still permitted when the allowance is spent; only publishing is blocked,
  // which createProduct enforces independently.
  const trial = await getTrialState().catch(() => null);
  if (trial && !trial.canPublish) {
    return <TrialExhausted expired={trial.reason === "trial_expired"} daysLeft={trial.daysLeft} />;
  }

  const company = await getMyCompany().catch(() => null);
  const allowedCategories = company?.data?.categories ?? [];

  return <AddProductForm allowedCategories={allowedCategories} />;
}
