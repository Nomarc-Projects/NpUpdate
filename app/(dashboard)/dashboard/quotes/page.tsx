import { headers } from "next/headers";
import { QuotesView } from "@/components/dashboard/quotes-view";
import { getIncomingQuotes, getSentQuotes } from "@/lib/services/rfq";
import { auth } from "@/lib/auth";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

export default async function QuotesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const canReceive = (session?.user as { role?: string } | undefined)?.role === "exhibitor";
  const [incoming, sent] = await Promise.all([
    canReceive ? getIncomingQuotes().catch(() => []) : Promise.resolve([]),
    getSentQuotes().catch(() => []),
  ]);
  // Exhibitors always see incoming RFQs (their core commerce flow); the
  // basic-profile gate applies to the buyer side (requesting quotes, image 45).
  if (canReceive) return <QuotesView incoming={incoming} sent={sent} canReceive={canReceive} />;
  return (
    <FeatureGate requires="basicProfile">
      <QuotesView incoming={incoming} sent={sent} canReceive={canReceive} />
    </FeatureGate>
  );
}
