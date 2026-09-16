import { headers } from "next/headers";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmailCampaignsView } from "@/components/admin/email-campaigns-view";
import { MailThroughputCard } from "@/components/admin/mail-throughput-card";
import { listCampaigns } from "@/lib/services/campaigns";
import { isEmailConfigured } from "@/lib/email/mailer";
import { auth } from "@/lib/auth";

export const metadata = { title: "Email Campaigns" };

export default async function EmailCampaignsPage() {
  const rows = await listCampaigns().catch(() => []);
  // Only a super admin may release a blast. The menu reflects that, but the
  // real enforcement is server-side in lib/services/campaigns.ts.
  const session = await auth.api.getSession({ headers: await headers() });
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Email Campaigns"
        subtitle="Create, schedule, and track the performance of platform-wide broadcasts and targeted emails."
      />
      {/* The sending rate lives here rather than on /admin/settings, which stays
          deliberately unlinked because it is still placeholder UI. This is where
          someone watching a blast go out would look for it. Super admins only,
          matching who can release a campaign in the first place. */}
      {isSuperAdmin && (
        <div className="mb-5">
          <MailThroughputCard />
        </div>
      )}
      <EmailCampaignsView rows={rows} mailConfigured={isEmailConfigured} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
