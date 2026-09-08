import { SavedProfessionals } from "@/components/dashboard/my-network";
import { ProfessionalGate } from "@/components/dashboard/onboarding/professional-gate";
import { getProfessionals } from "@/lib/services/directory";
import { getSavedIds } from "@/lib/services/saved";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

/** "Saved Profile" nav destination — just the saved professionals, no tabs. */
export default async function SavedProfilesPage() {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalGate
        title="Complete your profile to see saved profiles"
        description="Save professionals to shortlist them — a quick profile first unlocks the directory."
      />
    );
  }
  const [pros, savedIds] = await Promise.all([
    getProfessionals().catch(() => []),
    getSavedIds("professional").catch(() => []),
  ]);

  const savedSet = new Set(savedIds);
  const saved = pros.filter((p) => savedSet.has(p.id));

  return <SavedProfessionals people={saved} />;
}