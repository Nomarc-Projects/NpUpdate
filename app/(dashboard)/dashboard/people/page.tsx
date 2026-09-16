import { PeoplePageView } from "@/components/dashboard/directory/people-page-view";
import { ProfessionalGate } from "@/components/dashboard/onboarding/professional-gate";
import { getPeopleDirectory } from "@/lib/services/directory";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function PeoplePage() {
  const viewer = await getViewer();
  // The directory leaks contact details (email + phone) for every member, so it
  // is professional-track data like the job board — hold the professional role
  // (granted by the onboarding form) before any of it can render.
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalGate
        title="Complete your profile to see the directory"
        description="A quick headline and bio unlocks the directory — takes less than a minute."
      />
    );
  }
  const people = await getPeopleDirectory().catch(() => []);

  return <PeoplePageView people={people} />;
}