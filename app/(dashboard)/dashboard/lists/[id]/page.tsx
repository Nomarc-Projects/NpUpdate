import { notFound } from "next/navigation";
import { ListDetailView } from "@/components/dashboard/directory/list-detail-view";
import { getListMembers } from "@/lib/services/lists";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getListMembers(id);
  if (!result) notFound();
  return (
    <FeatureGate requires="basicProfile">
      <div className="px-6 py-6 md:px-8">
        <ListDetailView list={result.list} members={result.members} />
      </div>
    </FeatureGate>
  );
}
