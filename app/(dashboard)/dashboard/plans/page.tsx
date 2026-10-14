import { redirect } from "next/navigation";
import { PlansView } from "@/components/dashboard/plans-view";
import { activeProvider } from "@/lib/payments";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";
import { getViewer } from "@/lib/viewer-server";

export default async function PlansPage() {
  const viewer = await getViewer();

  // If user is an exhibitor, always show exhibitor plans (they have their own commerce track)
  if (viewer.activeRole === "exhibitor") {
    redirect("/dashboard/plans/exhibitor");
  }

  // Professional plans are gated by the super-admin "payment-plans" toggle
  const { enabled } = await getPaymentPlans();
  if (!enabled) {
    // Show a friendly message instead of redirecting to settings
    return (
      <div className="px-5 sm:px-8 py-12 max-w-[600px] mx-auto text-center">
        <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white mb-3">Professional Plans</h1>
        <p className="text-[#9a9a9a] mb-6">Professional plan upgrades are currently unavailable. Please check back later.</p>
        <a href="/dashboard" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] font-semibold hover:bg-[#e6c114] transition-colors">
          Back to Dashboard
        </a>
      </div>
    );
  }

  // Demo mode is the opt-in no-gateway path (ALLOW_DEMO_PAYMENTS) where
  // subscribing grants the tier without a charge. The page has to say so —
  // telling an exhibitor a ₦500,000 tier "isn't charged yet" would be badly
  // wrong once a provider is live.
  const demoMode = activeProvider() === null && process.env.ALLOW_DEMO_PAYMENTS === "true";
  return <PlansView demoMode={demoMode} unavailable={activeProvider() === null && !demoMode} />;
}
