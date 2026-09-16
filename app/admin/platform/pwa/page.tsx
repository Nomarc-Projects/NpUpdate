import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PwaView } from "@/components/admin/pwa-view";
import { getPwa } from "@/lib/services/platform-settings-read";
import { PWA_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "PWA Config" };
export const dynamic = "force-dynamic";

export default async function AdminPwaPage() {
  const current = await getPwa().catch(() => PWA_DEFAULT);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="PWA (Progressive Web App)"
        subtitle="Turn the install-to-home-screen experience on or off for all visitors. When on, the service worker registers and the install prompt shows; when off, neither happens."
      />
      <PwaView current={current} />
    </div>
  );
}