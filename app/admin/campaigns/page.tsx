import { headers } from "next/headers";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CampaignTrackingView } from "@/components/admin/campaign-tracking-view";
import { listCampaigns } from "@/lib/services/campaigns";
import { isEmailConfigured } from "@/lib/email/mailer";
import { auth } from "@/lib/auth";

export const metadata = { title: "Campaign Tracking" };

export default async function CampaignTrackingPage() {
  const rows = await listCampaigns().catch(() => []);
  const session = await auth.api.getSession({ headers: await headers() });
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Campaign Tracking"
        subtitle="Watch campaigns go out in real time, and audit who received, opened or clicked each one."
      />
      <CampaignTrackingView rows={rows} mailConfigured={isEmailConfigured} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
