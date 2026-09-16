import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PaymentPlansView } from "@/components/admin/payment-plans-view";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";
import { PAYMENT_PLANS_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "Payment Plans" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentPlansPage() {
  const current = await getPaymentPlans().catch(() => PAYMENT_PLANS_DEFAULT);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Payment Plans"
        subtitle="Toggle the 'Plans & upgrades' entry under Account Settings. Hidden while paused, relit from here when the next phase of the project ships."
      />
      <PaymentPlansView current={current} />
    </div>
  );
}