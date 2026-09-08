import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublishedPosts } from "@/lib/services/newsfeed";
import { NewsCover } from "@/components/newsfeed/news-cover";
import { FadeUp } from "./fade-up";

/**
 * The three latest published posts, read from the same source `/newsfeed` uses.
 *
 * These cards used to be three hardcoded slugs with one shared placeholder
 * excerpt; only one slug matched a real post, so two of the three linked
 * straight to a 404. Nothing that isn't a real published post should be linked
 * at all, so an empty or failed read omits the section rather than rendering
 * dead cards. The homepage revalidates hourly (see `page.tsx`) so newly
 * published posts appear without a redeploy.
 */
export async function InsightsSection() {
  let posts: Awaited<ReturnType<typeof getPublishedPosts>> = [];
  try {
    posts = await getPublishedPosts();
  } catch {
    posts = [];
  }

  const articles = posts.slice(0, 3);
  if (!articles.length) return null;

  return (
    <FadeUp>
      <section className="bg-white dark:bg-[#111] py-16 px-6 md:px-10 lg:px-14">
        <div className="border-t border-[#e5e5e5] dark:border-white/10 pt-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <h2 className="text-3xl md:text-[38px] font-bold text-[#1e1e1e] dark:text-white tracking-tight leading-[1.1] max-w-[520px]">
              Industry insights, opportunities and platform updates.
            </h2>
            <Link href="/newsfeed" className="text-[#898989] text-sm hover:text-[#1e1e1e] dark:hover:text-white transition-colors whitespace-nowrap">
              View all articles
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {articles.map((a) => (
              <Link key={a.slug} href={`/newsfeed/${a.slug}`} className="group block">
                <div className="aspect-[16/10] rounded-xl overflow-hidden mb-4 bg-[#f4f4f4] dark:bg-white/5">
                  <NewsCover
                    src={a.coverUrl}
                    alt={a.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="font-bold text-[#1e1e1e] dark:text-white text-[15px] leading-snug mb-3 line-clamp-2 group-hover:text-[#ffd716] transition-colors">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-[13px] text-[#9a9a9a] leading-relaxed mb-5 line-clamp-3">{a.excerpt}</p>
                )}
                <div className="flex items-center gap-6 text-[13px]">
                  <span className="text-[#9a9a9a]">{a.date}</span>
                  <span className="flex items-center gap-2 font-semibold text-[#1e1e1e] dark:text-white">
                    <ArrowRight size={15} className="text-[#1e1e1e] dark:text-white" /> Read article
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="border-b border-[#e5e5e5] dark:border-white/10 mt-14" />
        </div>
      </section>
    </FadeUp>
  );
}
