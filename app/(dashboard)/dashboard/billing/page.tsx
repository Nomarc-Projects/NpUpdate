import { getViewer } from "@/lib/viewer-server";
import { getMyTransactions } from "@/lib/services/billing";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";
import { PLAN_LABEL } from "@/lib/entitlements";
import { BillingView } from "@/components/dashboard/billing-view";

export default async function BillingPage() {
  const [viewer, txs, paymentPlans] = await Promise.all([
    getViewer(),
    getMyTransactions(),
    getPaymentPlans().catch(() => ({ enabled: false })),
  ]);
  return <BillingView planLabel={PLAN_LABEL[viewer.plan]} isFree={viewer.plan === "free"} txs={txs} paymentPlansEnabled={paymentPlans.enabled} />;
}
