import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/services/newsfeed";

// nomarcprojects.com is the canonical domain since the cutover. This has to
// match robots.ts, which advertises this sitemap under that host — a sitemap
// listing URLs on a different hostname than the robots.txt that points at it is
// treated as cross-submission and largely ignored.
const BASE = "https://www.nomarcprojects.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,        lastModified: now, changeFrequency: "weekly",  priority: 1 },
    { url: `${BASE}/tools`,   lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/newsfeed`, lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/terms`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  let slugs: string[] = [];
  try { slugs = await getPublishedSlugs(); } catch { /* db unavailable at build → core only */ }
  const posts: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE}/newsfeed/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...core, ...posts];
}
