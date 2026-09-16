"use client";

import { PeopleDirectory } from "@/components/dashboard/directory/people-directory";
import type { PeopleRow } from "@/lib/services/directory";

/**
 * People page — just the Directory table. The old My Network secondary view
 * (saved/contacted/following tabs) was removed; saved profiles live on their
 * own page at /dashboard/people/saved.
 */
export function PeoplePageView({ people }: { people: PeopleRow[] }) {
  return (
    <div className="px-6 py-6 md:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">People</h1>
          <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Discover, and connect with construction professionals.</p>
        </div>
      </div>

      <PeopleDirectory rows={people} />
    </div>
  );
}
