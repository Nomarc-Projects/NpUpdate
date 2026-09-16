import { SupportInboxView } from "@/components/admin/support-inbox-view";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminTickets } from "@/lib/services/support";

export default async function SupportInboxPage() {
  const tickets = await getAdminTickets();
  return (
    <div className="flex h-full flex-col px-6 pt-6 md:px-8">
      <AdminPageHeader title="Support Inbox" subtitle="Manage user inquiries, resolve platform issues, and oversee active support tickets." />
      <div className="min-h-0 flex-1">
        <SupportInboxView initial={tickets} />
      </div>
    </div>
  );
}
