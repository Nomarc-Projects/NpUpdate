import { redirect } from "next/navigation";
import { AddProductForm } from "./add-product-form";
import { ExhibitorGuidelinesStep } from "./guidelines-step";
import { getViewer } from "@/lib/viewer-server";
import { getExhibitorLimitSummary, getTrialState } from "@/lib/services/exhibitor-trial";
import { getMyCompany } from "@/lib/services/company";
import { hasAcceptedExhibitorGuidelines } from "@/lib/services/exhibitor-onboarding";

export const metadata = { title: "Showcase Product" };

/**
 * Showcase Product funnel, in order: guidelines → subscription plans → the
 * Add Product form.
 *
 * - A user who has never accepted the guidelines (and doesn't hold the
 *   exhibitor role, which they could only have gotten by already accepting
 *   them during onboarding) sees the guidelines first.
 * - Accepted users without an active, unexpired plan are sent to the
 *   exhibitor plans screen; a settled purchase grants the exhibitor role
 *   (billing → setRolePlan) and the verify page routes back here.
 * - With a plan active the Add Product form renders; the user is an exhibitor.
 */
export default async function AddProductPage() {
  const viewer = await getViewer();
  const isExhibitor = viewer.heldRoles.has("exhibitor") || viewer.activeRole === "exhibitor";
  if (!isExhibitor && !(await hasAcceptedExhibitorGuidelines())) {
    return <ExhibitorGuidelinesStep />;
  }

  // Same server-side plan gate as before — createProduct/setProductStatus
  // enforce it independently, since the URL is typeable.
  const trial = await getTrialState().catch(() => null);
  if (!trial?.subscribed) redirect("/dashboard/plans/exhibitor");

  const [company, limits] = await Promise.all([
    getMyCompany().catch(() => null),
    getExhibitorLimitSummary().catch(() => null),
  ]);
  const allowedCategories = company?.data?.categories ?? [];

  return <AddProductForm allowedCategories={allowedCategories} limits={limits} />;
}
