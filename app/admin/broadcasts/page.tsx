import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminBroadcasts } from "@/components/admin/admin-broadcasts";
import { listBroadcasts } from "@/lib/services/broadcasts";
import { isEmailConfigured } from "@/lib/email/mailer";

export const metadata = { title: "Send Email" };

/** A 2000-recipient blast is ~20 batch calls (~30–60s wall clock), so the
 *  server action needs a longer window than the function default. Matches the
 *  campaign drain route's ceiling. */
export const maxDuration = 300;

export default async function BroadcastsPage() {
  const history = await listBroadcasts();
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Send Email"
        subtitle="Send a direct email to your whole audience, a segment, a single user, or any external addresses."
      />
      <AdminBroadcasts history={history} mailConfigured={isEmailConfigured} />
    </div>
  );
}
