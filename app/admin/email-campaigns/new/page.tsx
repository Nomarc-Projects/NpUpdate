import { headers } from "next/headers";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { listSegments } from "@/lib/services/segments";
import { isEmailConfigured } from "@/lib/email/mailer";
import { auth } from "@/lib/auth";

export const metadata = { title: "New Campaign" };

export default async function NewCampaignPage() {
  const [segments, session] = await Promise.all([
    listSegments().catch(() => []),
    auth.api.getSession({ headers: await headers() }),
  ]);
  const adminEmail = (session?.user as { email?: string } | undefined)?.email ?? "";

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader title="New Campaign" subtitle="Compose, preview and schedule an email blast." />
      <CampaignComposer
        campaign={null}
        segments={segments.map((s) => ({ id: s.id, name: s.name }))}
        mailConfigured={isEmailConfigured}
        defaultTestTo={adminEmail}
      />
    </div>
  );
}
