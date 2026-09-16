import { ActiveCampaignsView } from "@/components/admin/active-campaigns-view";
import { listAllPromotions } from "@/lib/services/promotions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default async function ActiveCampaignsPage() {
  const rows = await listAllPromotions();
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title="Active Campaigns" subtitle="Monitor live promotions, track performance metrics, and manage active ad spending." />
      <ActiveCampaignsView rows={rows} />
    </div>
  );
}
