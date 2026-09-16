import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ExhibitionHubView } from "@/components/admin/exhibition-hub-view";
import { getExhibitionHub } from "@/lib/services/platform-settings-read";
import { EXHIBITION_HUB_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "Exhibition Hub" };
export const dynamic = "force-dynamic";

export default async function AdminExhibitionHubPage() {
  // getExhibitionHub already falls back internally, but keep the console standing
  // even if the platform_setting table isn't migrated in this environment yet.
  const current = await getExhibitionHub().catch(() => EXHIBITION_HUB_DEFAULT);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Exhibition Hub"
        subtitle="Open the marketplace to everyone, or keep it locked to the Coming Soon screen. Admins can always preview it either way."
      />
      <ExhibitionHubView current={current} />
    </div>
  );
}
