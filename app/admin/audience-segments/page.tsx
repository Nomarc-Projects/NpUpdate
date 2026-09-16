import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AudienceSegmentsView } from "@/components/admin/audience-segments-view";
import { listSegments } from "@/lib/services/segments";

export const metadata = { title: "Audience Segments" };

export default async function AudienceSegmentsPage() {
  // Degrade to an empty list rather than taking the console down if the
  // segment tables aren't migrated yet in this environment.
  const rows = await listSegments().catch(() => []);
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Audience Segments"
        subtitle="Build and maintain custom user lists to ensure your messaging reaches the right audience."
      />
      <AudienceSegmentsView rows={rows} />
    </div>
  );
}
