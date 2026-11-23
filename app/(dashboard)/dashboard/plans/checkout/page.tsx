import { redirect } from "next/navigation";
import { CheckoutView, type CheckoutPlan } from "@/components/dashboard/checkout-view";
import { activeProvider, configuredProviders } from "@/lib/payments";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";
import type { BillingCycle } from "@/lib/entitlements";

/** Professional Premium is excluded — it is still coming soon (see startCheckout). */
const BUYABLE = ["plus", "pro", "sme", "exhibitor", "key_player"] as const;
/** Exhibitor plans are always purchasable — they run on their own commerce track
 *  and don't depend on the global "payment-plans" feature flag (which gates
 *  professional/plus/pro/premium). */
const EXHIBITOR_PLANS = ["sme", "exhibitor", "key_player"] as const;

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; billing?: string }> }) {
  const { plan, billing } = await searchParams;
  const isExhibitorPlan = (EXHIBITOR_PLANS as readonly string[]).includes(plan ?? "");

  // Professional plans are gated by the super-admin "payment-plans" toggle.
  // Exhibitor plans are always on — exhibitors run their own paid tier ladder.
  if (!isExhibitorPlan) {
    const { enabled } = await getPaymentPlans();
    if (!enabled) redirect("/dashboard/settings");
  }

  if (!(BUYABLE as readonly string[]).includes(plan ?? "")) redirect("/dashboard/plans");
  const cycle: BillingCycle = ["monthly", "biannual", "annual"].includes(billing ?? "") ? (billing as BillingCycle) : "monthly";
  // No gateway keys + explicit local opt-in = the server grants the plan in
  // demo mode. Tell the client so it doesn't disable the button for a payment
  // that never goes to a gateway (see startCheckout's demo branch).
  const demoMode = activeProvider() === null && process.env.ALLOW_DEMO_PAYMENTS === "true";
  return <CheckoutView plan={plan as CheckoutPlan} initialCycle={cycle} available={configuredProviders()} demoMode={demoMode} />;
}
