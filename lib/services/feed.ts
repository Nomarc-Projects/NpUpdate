"use server";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUserId } from "@/lib/server-user";

/**
 * Construction industry newsfeed — the Phase 1 MVP "everyday industry
 * platform" surface. Aggregates the newest activity across the network into
 * one stream: job postings, newly listed companies, professionals joining,
 * published articles and upcoming events. Admin-curated sources only (no
 * free-form UGC), so nothing new enters the moderation queue.
 *
 * Each source contributes its latest rows; we merge and sort by time here
 * rather than in SQL so every source keeps its own index-friendly LIMIT.
 */

export type FeedKind = "job" | "company" | "professional" | "article" | "event";

export type FeedItem = {
  id: string;
  kind: FeedKind;
  title: string;
  body: string | null;
  href: string;
  actor: string | null;   // who posted / company name / author
  image: string | null;
  createdAt: string;      // ISO — display sort key
};

type RawRow = {
  id: string; kind: FeedKind; title: string; body: string | null;
  href: string; actor: string | null; image: string | null; created_at: Date | string;
};

const SOURCES = 15;

export async function getIndustryFeed(limit = 40): Promise<FeedItem[]> {
  await requireUserId();
  const { rows } = await db.execute(sql`
    SELECT * FROM (
      (SELECT j.id::text AS id, 'job'::text AS kind, j.title,
              NULLIF(j.location, '') || CASE WHEN NULLIF(j.location,'') IS NOT NULL AND NULLIF(j.employment_type,'') IS NOT NULL THEN ' · ' ELSE '' END || COALESCE(NULLIF(j.employment_type,''),'') AS body,
        '/dashboard/jobs/' || j.id AS href,
        COALESCE(NULLIF(j.company,''), 'A member') AS actor,
        c.avatar_url AS image,
        j.created_at
       FROM job j LEFT JOIN company c ON c.owner_user_id = j.owner_user_id
       WHERE j.draft = false AND j.status = 'open'
       ORDER BY j.created_at DESC LIMIT ${SOURCES})
      UNION ALL
      (SELECT c.id::text, 'company', c.name, COALESCE(NULLIF(c.tagline,''), NULLIF(c.industry,'')),
        '/dashboard/companies/' || c.id, c.name, c.avatar_url, c.created_at
       FROM company c ORDER BY c.created_at DESC LIMIT ${SOURCES})
      UNION ALL
      (SELECT p.user_id, 'professional', u.name, COALESCE(NULLIF(p.headline,''), NULLIF(p.discipline,'')),
        '/dashboard/people', u.name, p.avatar_url, p.created_at
       FROM profile p JOIN "user" u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT ${SOURCES})
      UNION ALL
      (SELECT b.id::text, 'article', b.title, b.excerpt,
        '/newsfeed/' || b.slug, b.author, b.cover_url,
        COALESCE(b.published_at, b.created_at)
       FROM blog_post b WHERE b.status = 'published'
       ORDER BY COALESCE(b.published_at, b.created_at) DESC LIMIT ${SOURCES})
      UNION ALL
      (SELECT e.id::text, 'event', e.title,
        CASE WHEN e.format = 'online' THEN 'Online event' ELSE COALESCE(NULLIF(e.location,''), 'Industry event') END,
        '/dashboard/events', e.organizer, e.image_url, e.starts_at
       FROM event e WHERE e.published = true
       ORDER BY e.starts_at ASC LIMIT ${SOURCES})
    ) feed
    ORDER BY created_at DESC
    LIMIT ${limit}`);
  return rows.map((r) => {
    const row = r as unknown as RawRow;
    return {
      id: `${row.kind}:${row.id}`,
      kind: row.kind,
      title: row.title ?? "",
      body: row.body || null,
      href: row.href,
      actor: row.actor,
      image: row.image,
      createdAt: new Date(row.created_at).toISOString(),
    };
  });
}
