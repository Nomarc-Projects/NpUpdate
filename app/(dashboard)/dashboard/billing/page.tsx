import { getViewer } from "@/lib/viewer-server";
import { getMyTransactions } from "@/lib/services/billing";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";
import { PLAN_LABEL, asExhibitorPlan } from "@/lib/entitlements";
import { BillingView } from "@/components/dashboard/billing-view";

export default async function BillingPage() {
  const [viewer, txs, paymentPlans] = await Promise.all([
    getViewer(),
    getMyTransactions(),
    getPaymentPlans().catch(() => ({ enabled: false })),
  ]);
  const isExhibitor = viewer.activeRole === "exhibitor";
  const exhibitorPlan = isExhibitor ? asExhibitorPlan(viewer.plans?.exhibitor) : null;
  return <BillingView 
    planLabel={isExhibitor && exhibitorPlan ? PLAN_LABEL[exhibitorPlan] : PLAN_LABEL[viewer.plan]} 
    isFree={isExhibitor ? exhibitorPlan === "free" : viewer.plan === "free"} 
    txs={txs} 
    paymentPlansEnabled={paymentPlans.enabled}
    isExhibitor={isExhibitor}
    exhibitorPlan={exhibitorPlan}
  />;
}
