import { redirect } from "next/navigation";
import { AddProductForm } from "./add-product-form";
import { ExhibitorGuidelinesStep } from "./guidelines-step";
import { getViewer } from "@/lib/viewer-server";
import { getExhibitorLimitSummary, getTrialState } from "@/lib/services/exhibitor-trial";
import { getMyCompany } from "@/lib/services/company";
import { hasAcceptedExhibitorGuidelines } from "@/lib/services/exhibitor-onboarding";
import { ExhibitorGate } from "@/components/dashboard/onboarding/exhibitor-gate";

export const metadata = { title: "Showcase Product" };

/**
 * Showcase Product funnel, in order: guidelines → exhibitor registration →
 * subscription plans/trial → the Add Product form.
 *
 * - A user who has never accepted the guidelines and is not yet an exhibitor
 *   sees the guidelines first.
 * - Non-exhibitor users must complete exhibitor registration (company/profile
 *   setup, which grants the exhibitor role) before they can start a 14-day
 *   trial or subscribe to a plan.
 * - Registered exhibitors without an active, unexpired plan or 14-day trial are
 *   sent to the exhibitor plans screen.
 * - With a plan or trial active the Add Product form renders.
 */
export default async function AddProductPage() {
  const viewer = await getViewer();
  const isExhibitor = viewer.heldRoles.has("exhibitor") || viewer.activeRole === "exhibitor";

  if (!isExhibitor) {
    const accepted = await hasAcceptedExhibitorGuidelines();
    if (!accepted) return <ExhibitorGuidelinesStep />;
    // New users must be registered as exhibitors before they can apply for a
    // 14-day trial or subscribe. Show the exhibitor registration/onboarding form.
    return <ExhibitorGate />;
  }

  // createProduct/setProductStatus enforce this independently, since the URL is
  // typeable. An active trial is a valid entitlement and must not be paywalled.
  const trial = await getTrialState().catch(() => null);
  if (!trial?.hasActivePlan) redirect("/dashboard/plans/exhibitor");

  const [company, limits] = await Promise.all([
    getMyCompany().catch(() => null),
    getExhibitorLimitSummary().catch(() => null),
  ]);
  const allowedCategories = company?.data?.categories ?? [];

  return <AddProductForm allowedCategories={allowedCategories} limits={limits} />;
}
