import { headers } from "next/headers";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { listSegments } from "@/lib/services/segments";
import { isEmailConfigured } from "@/lib/email/mailer";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "New Campaign" };

export default async function NewCampaignPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Only admin and super_admin may create email campaigns
  if (role !== "admin" && role !== "super_admin") {
    redirect("/dashboard");
  }
  const [segments, session2] = await Promise.all([
    listSegments().catch(() => []),
    auth.api.getSession({ headers: await headers() }),
  ]);
  const adminEmail = (session2?.user as { email?: string } | undefined)?.email ?? "";

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
