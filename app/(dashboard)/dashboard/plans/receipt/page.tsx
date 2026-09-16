import { redirect } from "next/navigation";
import { getMyTransactions } from "@/lib/services/billing";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";
import { ReceiptView } from "@/components/dashboard/receipt-view";

export default async function ReceiptPage() {
  // Payment plans are paused (super-admin toggle) — receipts follow the plans
  // section off the dashboard while it's hidden.
  const { enabled } = await getPaymentPlans();
  if (!enabled) redirect("/dashboard/settings");
  const txs = await getMyTransactions();
  const latest = txs[0];
  if (!latest) redirect("/dashboard/plans");
  return <ReceiptView tx={latest} />;
}
