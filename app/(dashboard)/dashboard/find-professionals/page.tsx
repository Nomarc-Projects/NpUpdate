import { ProfessionalGate } from "@/components/dashboard/onboarding/professional-gate";
import { FindProfessionals } from "@/components/dashboard/find-professionals";
import { getProfessionals } from "@/lib/services/directory";
import { getMyOpenJobs } from "@/lib/services/jobs";
import { presenceFor } from "@/lib/services/network";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import type { Role } from "@/lib/use-dashboard-role";

export default async function FindProfessionalsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalGate
        title="Complete your profile to find professionals"
        description="A quick headline and bio unlocks the directory — takes less than a minute."
      />
    );
  }
  const pros = await getProfessionals().catch(() => []);
  const myJobs = await getMyOpenJobs().catch(() => []);
  const role: Role = viewer.activeRole === "exhibitor" ? "exhibitor" : "professional";
  const online = await presenceFor(pros.map((p) => p.id));
  return <FindProfessionals role={role} pros={pros} myOpenJobs={myJobs} online={online} />;
}
