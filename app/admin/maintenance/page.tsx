import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MaintenanceView } from "@/components/admin/maintenance-view";
import { getMaintenance } from "@/lib/services/platform-settings-read";
import { MAINTENANCE_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "Maintenance Mode" };
export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
  // getMaintenance already falls back internally, but keep the console standing
  // even if the platform_setting table isn't migrated in this environment yet.
  const current = await getMaintenance().catch(() => MAINTENANCE_DEFAULT);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Maintenance Mode"
        subtitle="Take the platform offline for everyone but admins. Sign-in stays open, so admins can always get back in."
      />
      <MaintenanceView current={current} />
    </div>
  );
}
