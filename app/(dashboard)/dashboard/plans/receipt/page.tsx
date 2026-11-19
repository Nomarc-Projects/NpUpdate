import { redirect } from "next/navigation";
import { getMyTransactions } from "@/lib/services/billing";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";
import { ReceiptView } from "@/components/dashboard/receipt-view";

export default async function ReceiptPage() {
  // Payment plans are paused (super-admin toggle) — receipts follow the plans
  // section off the dashboard while it's hidden. Exhibitor plans run on their
  // own commerce track, so allow exhibitor receipts even when professional
  // payment plans are paused.
  const [{ enabled }, txs] = await Promise.all([getPaymentPlans(), getMyTransactions()]);
  const latest = txs[0];
  if (!latest) redirect("/dashboard/plans");
  const isExhibitorTx = ["sme", "exhibitor", "key_player"].includes(latest.plan ?? "");
  if (!enabled && !isExhibitorTx) redirect("/dashboard/settings");
  return <ReceiptView tx={latest} />;
}
