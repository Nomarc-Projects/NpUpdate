import { WalletView } from "@/components/dashboard/exhibitor/wallet-view";
import { ExhibitorGate } from "@/components/dashboard/onboarding/exhibitor-gate";
import { getWallet, getVendorPaymentAccounts } from "@/lib/services/payouts";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export const metadata = { title: "Wallet & payouts" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WalletPage() {
  const viewer = await getViewer();
  if (!can(viewer, "exhibitorDashboard")) {
    return (
      <ExhibitorGate
        title="Become an Exhibitor to unlock your wallet"
        description="Add your company name and primary industry to open your showroom — takes less than a minute."
      />
    );
  }
  const [wallet, accounts] = await Promise.all([getWallet(), getVendorPaymentAccounts()]);
  return <WalletView wallet={wallet} accounts={accounts} />;
}
