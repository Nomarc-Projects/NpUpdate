import { ExhibitionHubModeration } from "@/components/admin/exhibition-hub-moderation";
import { getAdminProducts } from "@/lib/services/admin";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default async function AdminExhibitionHubPage() {
  const products = await getAdminProducts();
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title="Exhibition Hub" subtitle="Manage product catalogs and handle suspended items." />
      <ExhibitionHubModeration rows={products} />
    </div>
  );
}
