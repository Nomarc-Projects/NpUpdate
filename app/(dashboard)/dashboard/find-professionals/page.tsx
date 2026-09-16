import { FindProfessionals } from "@/components/dashboard/find-professionals";
import { getProfessionals } from "@/lib/services/directory";
import { getMyOpenJobs } from "@/lib/services/jobs";
import { presenceFor } from "@/lib/services/network";
import { getViewer } from "@/lib/viewer-server";
import type { Role } from "@/lib/use-dashboard-role";

export default async function FindProfessionalsPage() {
  const viewer = await getViewer();
  const pros = await getProfessionals().catch(() => []);
  const myJobs = await getMyOpenJobs().catch(() => []);
  const role: Role = viewer.activeRole === "exhibitor" ? "exhibitor" : "professional";
  const online = await presenceFor(pros.map((p) => p.id));
  return <FindProfessionals role={role} pros={pros} myOpenJobs={myJobs} online={online} />;
}
