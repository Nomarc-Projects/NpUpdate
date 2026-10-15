import { PlansView } from "@/components/dashboard/plans-view";
import { activeProvider } from "@/lib/payments";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";

export default async function PlansPage() {
  // Professional plans are gated by the super-admin "payment-plans" toggle.
  // When it's off the professional ladder renders disabled, but a user who also
  // holds the exhibitor role still sees (and can buy) their exhibitor plans —
  // this page is the upgrade target for every role, so it must never dead-end
  // an exhibitor on a disabled professional page.
  const { enabled } = await getPaymentPlans();

  // Demo mode is the opt-in no-gateway path (ALLOW_DEMO_PAYMENTS) where
  // subscribing grants the tier without a charge. The page has to say so —
  // telling an exhibitor a ₦500,000 tier "isn't charged yet" would be badly
  // wrong once a provider is live.
  const demoMode = activeProvider() === null && process.env.ALLOW_DEMO_PAYMENTS === "true";
  return <PlansView demoMode={demoMode} unavailable={activeProvider() === null && !demoMode} professionalEnabled={enabled} />;
}
