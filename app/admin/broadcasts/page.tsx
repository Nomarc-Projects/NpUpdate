import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminBroadcasts } from "@/components/admin/admin-broadcasts";
import { listBroadcasts } from "@/lib/services/broadcasts";
import { isEmailConfigured } from "@/lib/email/mailer";

export const metadata = { title: "Send Email" };

export default async function BroadcastsPage() {
  const history = await listBroadcasts();
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Send Email"
        subtitle="Send a direct email to your whole audience, a segment, or a single user."
      />
      <AdminBroadcasts history={history} mailConfigured={isEmailConfigured} />
    </div>
  );
}
