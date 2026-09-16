import { ListsTable } from "@/components/dashboard/directory/lists-table";
import { getMyLists } from "@/lib/services/lists";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

export default async function ListsPage() {
  const lists = await getMyLists();
  return (
    <FeatureGate requires="basicProfile">
      <div className="px-6 py-6 md:px-8">
        <div className="mb-5">
          <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">Lists</h1>
          <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Manage your saved professionals and companies lists.</p>
        </div>
        <ListsTable initial={lists} />
      </div>
    </FeatureGate>
  );
}
