import { headers } from "next/headers";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmailCampaignsView } from "@/components/admin/email-campaigns-view";
import { MailThroughputCard } from "@/components/admin/mail-throughput-card";
import { listCampaigns } from "@/lib/services/campaigns";
import { isEmailConfigured } from "@/lib/email/mailer";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Email Campaigns" };

export default async function EmailCampaignsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Only admin and super_admin may view the Email Campaigns page
  if (role !== "admin" && role !== "super_admin") {
    redirect("/dashboard");
  }
  const isSuperAdmin = role === "super_admin";
  const rows = await listCampaigns().catch(() => []);
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
