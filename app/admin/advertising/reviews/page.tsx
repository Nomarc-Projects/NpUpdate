import { AdReviewsView } from "@/components/admin/ad-reviews-view";
import { listPendingPromotions } from "@/lib/services/promotions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default async function AdReviewsPage() {
  const rows = await listPendingPromotions();
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title="Ad Reviews" subtitle="Review and moderate pending promotional campaigns before they go live." />
      <AdReviewsView rows={rows} />
    </div>
  );
}
