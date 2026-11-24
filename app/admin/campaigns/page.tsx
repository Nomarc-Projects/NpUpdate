import { headers } from "next/headers";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CampaignTrackingView } from "@/components/admin/campaign-tracking-view";
import { listCampaigns } from "@/lib/services/campaigns";
import { isEmailConfigured } from "@/lib/email/mailer";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Campaign Tracking" };

export default async function CampaignTrackingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Only super_admin may view campaign tracking
  if (role !== "admin" && role !== "super_admin") {
    redirect("/dashboard");
  }
  const isSuperAdmin = role === "super_admin";
  const rows = await listCampaigns().catch(() => []);
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
