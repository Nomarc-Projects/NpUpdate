import { NewsfeedView } from "@/components/dashboard/newsfeed-view";
import { getIndustryFeed } from "@/lib/services/feed";

export const dynamic = "force-dynamic";

export default async function NewsfeedPage() {
  const items = await getIndustryFeed();
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[#1e1e1e] dark:text-white">Industry Feed</h1>
        <p className="text-[13px] text-[#9a9a9a] mt-1">The latest jobs, companies, people, news and events across Nomarc.</p>
      </header>
      <NewsfeedView items={items} />
    </div>
  );
}
