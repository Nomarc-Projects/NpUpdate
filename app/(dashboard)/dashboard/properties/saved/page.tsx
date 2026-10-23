import Link from "next/link";
import { Bookmark } from "lucide-react";
import { getSavedIds } from "@/lib/services/saved";
import { getPublicPropertiesByIds } from "@/lib/services/properties";
import { PropertyCard } from "@/components/properties/property-card";

export const metadata = { title: "Saved properties" };
export const dynamic = "force-dynamic";

export default async function SavedPropertiesPage() {
  const ids = await getSavedIds("property").catch(() => []);
  const items = await getPublicPropertiesByIds(ids).catch(() => []);
  return (
    <div className="px-5 py-6 md:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">Saved properties</h1>
      <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">Properties you bookmarked while browsing.</p>

      {items.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => <PropertyCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[#dcdcdc] bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-[#1a1a1a]">
          <Bookmark className="mx-auto text-[#9a9a9a]" size={24} />
          <p className="mt-3 text-[14px] font-bold text-[#1e1e1e] dark:text-white">Nothing saved yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-[#9a9a9a]">Tap the save button on a property to keep it here. Saved listings that are no longer published are hidden.</p>
          <Link href="/properties" className="mt-4 inline-flex rounded-lg border border-[#e3e3e3] px-4 py-2 text-[12px] font-semibold dark:border-white/15">Browse properties</Link>
        </div>
      )}
    </div>
  );
}
