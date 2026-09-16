import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ThumbsUp } from "lucide-react";
import { AllArticles, NewsletterSignup, type NewsPost } from "./newsfeed-interactive";
import { getPublishedPosts } from "@/lib/services/newsfeed";
import { NewsCover } from "@/components/newsfeed/news-cover";
import { r2Url } from "@/lib/r2-public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News Feed — Nomarc Projects",
  description:
    "The latest construction news, platform updates, and industry opportunities, written for the professionals building Nigeria.",
};

export default async function NewsFeedPage() {
  const published = await getPublishedPosts();
  const toCard = (p: (typeof published)[number]): NewsPost => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, date: p.date, image: p.coverUrl ?? "" });
  const featured = published[0] ? toCard(published[0]) : null;
  const rest = published.slice(1).map(toCard);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      {/* Hero */}
      <section className="bg-white dark:bg-[#111] pt-20 px-6 text-center">
        <div className="max-w-[820px] mx-auto">
          <h1 className="text-4xl md:text-[52px] font-bold text-[#1e1e1e] dark:text-white leading-[1.1] tracking-tight">
            Industry insights, opportunities and platform updates.
          </h1>
          <p className="mt-5 text-[#898989] text-lg leading-relaxed max-w-[640px] mx-auto">
            The latest construction news, platform updates, and industry opportunities, written for
            the professionals building Nigeria.
          </p>
        </div>
        <div className="max-w-[1180px] mx-auto mt-12">
          <div className="relative rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r2Url("site/photo-1541888946425-d81bb19240f5.jpg")} alt="Construction site with cranes" className="w-full h-[280px] md:h-[440px] object-cover" />
          </div>
        </div>
      </section>

      {featured ? (
        <>
          {/* Editor's Pick */}
          <section className="bg-white dark:bg-[#111] py-16 px-6">
            <div className="max-w-[1180px] mx-auto">
              <div className="flex justify-center mb-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ffe88a] border border-[#f3d34d] px-4 py-1.5 text-sm font-medium text-[#1e1e1e]">
                  <ThumbsUp size={14} /> Editor&apos;s Pick
                </span>
              </div>
              <Link href={`/newsfeed/${featured.slug}`} className="group block">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 md:p-5 hover:border-[#ffd716] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all">
                  <div className="aspect-[4/3] md:aspect-auto rounded-xl overflow-hidden bg-[#f5f5f5] dark:bg-white/5">
                    <NewsCover src={featured.image} alt={featured.title} className="w-full h-full group-hover:scale-[1.03] transition-transform duration-500" />
                  </div>
                  <div className="flex flex-col justify-center md:pr-6">
                    <h2 className="text-2xl md:text-[32px] font-bold text-[#1e1e1e] dark:text-white leading-tight">{featured.title}</h2>
                    <p className="mt-4 text-sm text-[#898989] leading-relaxed line-clamp-4">{featured.excerpt}</p>
                    <div className="mt-8 flex items-center justify-between text-sm">
                      <span className="text-[#898989]">{featured.date}</span>
                      <span className="flex items-center gap-2 font-semibold text-[#1e1e1e] dark:text-white"><ArrowRight size={16} /> Read article</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {rest.length > 0 && <AllArticles posts={rest} />}
        </>
      ) : (
        <section className="py-24 px-6 text-center">
          <p className="text-base font-semibold text-[#1e1e1e] dark:text-white">No articles published yet</p>
          <p className="mt-1.5 text-sm text-[#9a9a9a]">Check back soon for construction insights and platform updates.</p>
        </section>
      )}

      <NewsletterSignup />
    </div>
  );
}
