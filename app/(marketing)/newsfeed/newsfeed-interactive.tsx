"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { submitLead } from "@/lib/services/crm";
import { Pagination } from "@/components/ui/pagination";
import { NewsCover } from "@/components/newsfeed/news-cover";
import { r2Url } from "@/lib/r2-public";

export type NewsPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
};

const PER_PAGE = 3;

export function AllArticles({ posts }: { posts: NewsPost[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(posts.length / PER_PAGE);
  const start = page * PER_PAGE;
  const visible = posts.slice(start, start + PER_PAGE);

  return (
    <section className="bg-white dark:bg-[#111] py-16 px-6">
      <div className="max-w-[1180px] mx-auto">
        {/* pill */}
        <div className="flex justify-center mb-10">
          <span className="inline-flex items-center rounded-full bg-[#ffe88a] border border-[#f3d34d] px-5 py-1.5 text-sm font-medium text-[#1e1e1e]">
            All articles
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7"
          >
            {visible.map((post, i) => (
              <motion.div
                key={post.slug + start}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link href={`/newsfeed/${post.slug}`} className="group block">
                  <div className="aspect-[16/10] rounded-xl overflow-hidden mb-4 bg-[#f5f5f5] dark:bg-white/5">
                    <NewsCover
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="font-bold text-[#1e1e1e] dark:text-white text-[15px] leading-snug mb-2.5">
                    {post.title}
                  </h3>
                  <p className="text-[13px] text-[#9a9a9a] leading-relaxed mb-5 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#9a9a9a]">{post.date}</span>
                    <span className="flex items-center gap-2 font-semibold text-[#1e1e1e] dark:text-white">
                      <ArrowRight size={15} /> Read article
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* pagination */}
        <Pagination
          className="mt-14 justify-center"
          page={page + 1}
          pageCount={pageCount}
          onPageChange={(p) => setPage(p - 1)}
          totalItems={posts.length}
          pageSize={PER_PAGE}
          noun="article"
        />
      </div>
    </section>
  );
}

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      // Previously this reported success on failure too, so a rejected or
      // dropped signup still told the visitor they were subscribed.
      try { await submitLead({ name: email.split("@")[0], email, source: "newsletter" }); setDone(true); }
      catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't subscribe. Please try again."); }
    });
  };

  return (
    <section className="bg-white dark:bg-[#111] py-12 px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-[#1e1e1e] dark:ring-1 dark:ring-white/10 px-8 md:px-14 py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-cover bg-center opacity-25"
            style={{
              backgroundImage: `url(${r2Url("site/photo-1504307651254-35680f356dfd.jpg")})`,
              maskImage: "linear-gradient(to left, black, transparent)",
              WebkitMaskImage: "linear-gradient(to left, black, transparent)",
            }}
          />
          <div className="relative max-w-[540px]">
            <h2 className="text-3xl md:text-[40px] font-bold text-[#ffd716] leading-tight">
              Never miss an update
            </h2>
            <p className="mt-4 text-white/70 text-sm leading-relaxed">
              Subscribe to the news feed and get a weekly breakdown of the most important construction
              trends, platform updates, and professional insights, delivered directly to your inbox.
            </p>
            {done ? (
              <div className="mt-7 flex items-center gap-3 text-white">
                <CheckCircle size={22} className="text-[#ffd716] flex-shrink-0" />
                <p className="text-sm font-medium">You&apos;re subscribed! We&apos;ll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-7 flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@company.com"
                  className="flex-1 bg-transparent border border-white/20 text-white placeholder:text-white/40 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#ffd716] transition-colors"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 bg-[#ffd716] text-[#1e1e1e] font-semibold px-6 py-3 rounded-lg hover:bg-[#e6c114] transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  <ArrowRight size={16} /> {pending ? "Subscribing…" : "Subscribe"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
