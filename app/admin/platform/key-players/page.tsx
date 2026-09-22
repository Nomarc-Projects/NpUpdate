import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { KeyPlayersView } from "@/components/admin/key-players-view";
import { getKeyPlayers } from "@/lib/services/platform-settings-read";
import { KEY_PLAYERS_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "Homepage — Key Players Section" };
export const dynamic = "force-dynamic";

export default async function AdminKeyPlayersPage() {
  const current = await getKeyPlayers().catch(() => KEY_PLAYERS_DEFAULT);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Homepage — Key Players Section"
        subtitle={"Curate the \"Key Players and Fastest Growing Companies in the Industry\" marquee on the homepage: add or remove companies, edit their names, marks and links, reorder them, or hide the whole strip."}
      />
      <KeyPlayersView current={current} />
    </div>
  );
}