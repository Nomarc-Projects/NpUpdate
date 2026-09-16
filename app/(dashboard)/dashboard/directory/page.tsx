import { DirectoryHub } from "@/components/dashboard/directory/directory-hub";
import { ProfessionalGate } from "@/components/dashboard/onboarding/professional-gate";
import { getPeopleDirectory } from "@/lib/services/directory";
import { getCompaniesForDirectory } from "@/lib/services/company";
import { listCatalogue } from "@/lib/services/directory-catalogue";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await getViewer();
  // The People tab leaks contact details (email + phone) for every member, so the
  // whole Directory is professional-track data like /dashboard/people — hold the
  // professional role (granted by the onboarding form) before any tab renders.
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalGate
        title="Complete your profile to see the directory"
        description="A quick headline and bio unlocks the directory — takes less than a minute."
      />
    );
  }

  const { tab } = await searchParams;
  const [people, companies, institutions, ministries] = await Promise.all([
    getPeopleDirectory().catch(() => []),
    getCompaniesForDirectory().catch(() => []),
    listCatalogue("institution").catch(() => []),
    listCatalogue("ministry").catch(() => []),
  ]);

  return (
    <DirectoryHub
      people={people}
      companies={companies}
      institutions={institutions}
      ministries={ministries}
      initialTab={tab}
    />
  );
}