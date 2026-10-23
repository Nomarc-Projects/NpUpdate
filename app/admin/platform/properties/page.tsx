import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PropertiesSettingsView } from "@/components/admin/properties-settings-view";
import { getProperties } from "@/lib/services/platform-settings-read";
import { PROPERTIES_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "Nomarc Projects settings" };
export const dynamic = "force-dynamic";

export default async function AdminPropertiesSettingsPage() {
  const current = await getProperties().catch(() => PROPERTIES_DEFAULT);
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Nomarc Projects"
        subtitle="Open the property marketplace, set the listing fee and FX rates, and edit the SOWR banner."
      />
      <PropertiesSettingsView current={current} />
    </div>
  );
}
