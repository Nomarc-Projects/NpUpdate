import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TrustedClientsView } from "@/components/admin/trusted-clients-view";
import { getTrustedClients } from "@/lib/services/platform-settings-read";
import { TRUSTED_CLIENTS_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "Homepage — Trusted Clients Section" };
export const dynamic = "force-dynamic";

export default async function AdminTrustedClientsPage() {
  const current = await getTrustedClients().catch(() => TRUSTED_CLIENTS_DEFAULT);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Homepage — Trusted Clients Section"
        subtitle={"Curate the \"Trusted Clients\" marquee on the homepage: add or remove companies, edit their names, marks and links, reorder them, or hide the whole strip. This list is separate from Key Players — a company has to be added to each one on purpose."}
      />
      <TrustedClientsView current={current} />
    </div>
  );
}
