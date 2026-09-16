import { ServicesManager } from "@/components/dashboard/services-manager";
import { ProfessionalGate } from "@/components/dashboard/onboarding/professional-gate";
import { getMyServices } from "@/lib/services/services";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function ServicesPage() {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalGate
        title="Complete your profile to list services"
        description="A quick headline and bio unlocks service listings and the rest of the professional track — takes less than a minute."
      />
    );
  }
  const services = await getMyServices();
  return <ServicesManager services={services} />;
}
