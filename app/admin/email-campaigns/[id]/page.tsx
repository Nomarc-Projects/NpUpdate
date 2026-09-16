import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { getCampaign } from "@/lib/services/campaigns";
import { listSegments } from "@/lib/services/segments";
import { isEmailConfigured } from "@/lib/email/mailer";
import { auth } from "@/lib/auth";

export const metadata = { title: "Edit Campaign" };

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, segments, session] = await Promise.all([
    getCampaign(id).catch(() => null),
    listSegments().catch(() => []),
    auth.api.getSession({ headers: await headers() }),
  ]);
  if (!campaign) notFound();
  const adminEmail = (session?.user as { email?: string } | undefined)?.email ?? "";

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title={campaign.status === "sent" ? campaign.name : "Edit Campaign"}
        subtitle={campaign.status === "sent"
          ? `Sent ${campaign.sentAt ?? ""} · ${campaign.sentCount} delivered · ${campaign.openRate ?? 0}% open · ${campaign.clickRate ?? 0}% click`
          : "Compose, preview and schedule an email blast."}
      />
      <CampaignComposer
        campaign={campaign}
        segments={segments.map((s) => ({ id: s.id, name: s.name }))}
        mailConfigured={isEmailConfigured}
        defaultTestTo={adminEmail}
      />
    </div>
  );
}
