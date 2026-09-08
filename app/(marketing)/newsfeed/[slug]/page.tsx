import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { NewsGate } from "@/components/newsfeed/news-gate";
import { Markdown } from "@/components/newsfeed/markdown";
import { ShareButton } from "@/components/newsfeed/share-button";
import { NewsToc } from "@/components/newsfeed/news-toc";
import { getPostBySlug, getPublishedPosts } from "@/lib/services/newsfeed";
import { NewsCover } from "@/components/newsfeed/news-cover";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Article not found — Nomarc Projects" };
  return {
    title: `${post.title} — Nomarc Projects`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, images: post.coverUrl ? [post.coverUrl] : undefined, type: "article" },
  };
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "NA";
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, all] = await Promise.all([getPostBySlug(slug), getPublishedPosts()]);
  if (!post) notFound();
  const keepReading = all.filter((p) => p.slug !== slug).slice(0, 3);
  const postUrl = `https://www.nomarcprojects.com/newsfeed/${slug}`;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <article className="max-w-[1120px] mx-auto px-6 pt-10">
        {/* Hero image with overlapping title card */}
        <div className="relative">
          <NewsCover src={post.coverUrl} alt={post.title} className="w-full h-[280px] md:h-[420px] rounded-2xl" />
          <div className="relative md:absolute md:-bottom-10 md:left-10 md:right-10 -mt-10 md:mt-0">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-[0_12px_50px_rgba(0,0,0,0.10)] px-7 md:px-10 py-7">
              {post.tags.length > 0 && <p className="text-[11px] font-semibold uppercase tracking-widest text-[#caa400] mb-2">{post.tags[0]}</p>}
              <h1 className="text-2xl md:text-[32px] font-bold text-[#1e1e1e] dark:text-white leading-tight">{post.title}</h1>
            </div>
          </div>
        </div>

        {/* Author / meta row */}
        <div className="flex items-center justify-between gap-4 mt-8 md:mt-20 pb-6 border-b border-[#ececec] dark:border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1e1e1e] text-[#ffd716] flex items-center justify-center text-xs font-bold">{initials(post.author)}</div>
            <div>
              <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{post.author}</p>
              <div className="flex items-center gap-4 text-xs text-[#9a9a9a] mt-0.5">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> {post.date}</span>
                <span className="flex items-center gap-1.5"><Clock size={12} /> {post.readMinutes} min read</span>
              </div>
            </div>
          </div>
          <ShareButton title={post.title} url={postUrl} />
        </div>

        {/* Body + Table of contents / subscribe sidebar */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8 lg:gap-12">
          {/* Sidebar — above the article on mobile, sticky on desktop */}
          <aside className="lg:sticky lg:top-20 h-fit order-1">
            <NewsToc targetId="article-body" />
          </aside>

          <div className="order-2 min-w-0">
            {/* WYSIWYG posts are HTML; older posts may be markdown. */}
            <NewsGate>
              <div id="article-body" className="pb-10">
                {!post.body ? (
                  <p className="text-[#9a9a9a]">{post.excerpt}</p>
                ) : /<[a-z][\s\S]*>/i.test(post.body) ? (
                  <div className="news-prose" dangerouslySetInnerHTML={{ __html: post.body }} />
                ) : (
                  <Markdown>{post.body}</Markdown>
                )}
              </div>
            </NewsGate>

            {/* Bottom share — aligned right */}
            <div className="flex items-center justify-end gap-3 pt-4 pb-2 border-t border-[#ececec] dark:border-white/10">
              <span className="text-[13px] text-[#9a9a9a]">Enjoyed this? Share it</span>
              <ShareButton title={post.title} url={postUrl} variant="icon" />
            </div>
          </div>
        </div>
      </article>

      {/* Keep reading */}
      {keepReading.length > 0 && (
        <section className="border-t border-[#ececec] dark:border-white/10 py-16 px-6">
          <div className="max-w-[1180px] mx-auto">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-bold text-[#1e1e1e] dark:text-white">Keep reading</h2>
              <Link href="/newsfeed" className="text-sm font-medium text-[#caa400] hover:underline inline-flex items-center gap-1.5">All articles <ArrowRight size={15} /></Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {keepReading.map((a) => (
                <Link key={a.slug} href={`/newsfeed/${a.slug}`} className="group block">
                  <NewsCover src={a.coverUrl} alt={a.title} className="w-full h-44 rounded-xl" />
                  <p className="mt-3 text-xs text-[#9a9a9a]">{a.date}</p>
                  <h3 className="mt-1 text-base font-bold text-[#1e1e1e] dark:text-white leading-snug group-hover:text-[#caa400] transition-colors">{a.title}</h3>
                  <p className="mt-1.5 text-[13px] text-[#6b6b6b] dark:text-white/60 line-clamp-2">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
