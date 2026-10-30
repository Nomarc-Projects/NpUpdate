import { FindProfessionals } from "@/components/dashboard/find-professionals";
import { getProfessionals } from "@/lib/services/directory";
import { getMyOpenJobs } from "@/lib/services/jobs";
import { getSavedIds } from "@/lib/services/saved";
import { getMyListedItemIds } from "@/lib/services/lists";
import { presenceFor } from "@/lib/services/network";
import { getViewer } from "@/lib/viewer-server";
import type { Role } from "@/lib/use-dashboard-role";

export default async function FindProfessionalsPage() {
  const viewer = await getViewer();
  const pros = await getProfessionals().catch(() => []);
  const myJobs = await getMyOpenJobs().catch(() => []);
  const role: Role = viewer.activeRole === "exhibitor" ? "exhibitor" : "professional";
  // Saved profiles come from both bookmark mechanisms — saved_item (People
  // directory bookmarks) and the custom lists the Find Professionals page
  // writes — so a first save through either reveals the Saved tab.
  const [online, bookmarkIds, listedIds] = await Promise.all([
    presenceFor(pros.map((p) => p.id)),
    getSavedIds("professional").catch(() => []),
    getMyListedItemIds("professional").catch(() => []),
  ]);
  const savedIds = Array.from(new Set([...bookmarkIds, ...listedIds]));
  return <FindProfessionals role={role} pros={pros} myOpenJobs={myJobs} online={online} savedIds={savedIds} />;
}
