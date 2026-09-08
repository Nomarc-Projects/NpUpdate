import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AboutTeamView } from "@/components/admin/about-team-view";
import { getAboutTeam } from "@/lib/services/platform-settings-read";
import { ABOUT_TEAM_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "About — Team Section" };
export const dynamic = "force-dynamic";

export default async function AdminAboutTeamPage() {
  const current = await getAboutTeam().catch(() => ABOUT_TEAM_DEFAULT);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="About — Team Section"
        subtitle={"Edit the \"The Minds Behind Nomarc\" heading, subtitle and member cards. The toggle controls whether the section appears on the public About page at all."}
      />
      <AboutTeamView current={current} />
    </div>
  );
}