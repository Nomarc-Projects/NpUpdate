"use server";

import { headers } from "next/headers";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { blogPost } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/authz";

export type PostCard = { slug: string; title: string; excerpt: string; coverUrl: string; tags: string[]; author: string; date: string; readMinutes: number };
export type PostFull = PostCard & { body: string };
export type AdminPost = { id: string; slug: string; title: string; status: string; scheduled: boolean; date: string };

/** Only show published posts whose publish time has arrived (enables scheduling). */
const liveCondition = () => and(eq(blogPost.status, "published"), or(isNull(blogPost.publishedAt), lte(blogPost.publishedAt, new Date())));
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Sanitises author HTML before it is stored (and later rendered through
 * dangerouslySetInnerHTML on the public post page).
 *
 * Allowlist, via a real parser. This was previously a regex blocklist that
 * stripped `<script>`, `<style>`, `on*=` and quoted `javascript:` URLs — which
 * left several ways through, among them `<iframe srcdoc="…">`, an unquoted
 * `href=javascript:…`, and a `<script src=x>` with no closing tag. Posts are
 * admin-authored, so the exposure needed a compromised admin, but the people
 * served the result are the public.
 */
function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "blockquote", "pre", "code", "span", "div",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark",
      "ul", "ol", "li", "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["class"],
    },
    // No javascript:, data: or vbscript: URLs get through the parser.
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    // Anything not on the tag list has its markup dropped but its text kept, so
    // editing a post doesn't silently delete the author's words.
    disallowedTagsMode: "discard",
    // Outbound links can't reach back into the opener.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener noreferrer" }),
    },
  });
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
const fmt = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "");

async function requireAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  // Accept both admin tiers (`isAdminRole`) — the real admin console runs as
  // `super_admin`, and the old `role !== "admin"` test here locked that account
  // out of /admin/newsfeed with a "Forbidden" → "something went wrong" error.
  if (!isAdminRole((session?.user as { role?: string } | undefined)?.role)) throw new Error("Forbidden");
  return session!.user.name ?? "Nomarc";
}

/* ── public ── */
export async function getPublishedPosts(): Promise<PostCard[]> {
  const rows = await db.select().from(blogPost).where(liveCondition()).orderBy(desc(blogPost.publishedAt));
  return rows.map((p) => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt ?? "", coverUrl: p.coverUrl ?? "", tags: p.tags ?? [],
    author: p.author ?? "Nomarc", date: fmt(p.publishedAt ?? p.createdAt), readMinutes: p.readMinutes ?? 5,
  }));
}

export async function getPostBySlug(slug: string): Promise<PostFull | null> {
  const [p] = await db.select().from(blogPost).where(and(eq(blogPost.slug, slug), liveCondition())).limit(1);
  if (!p) return null;
  return {
    slug: p.slug, title: p.title, excerpt: p.excerpt ?? "", coverUrl: p.coverUrl ?? "", tags: p.tags ?? [],
    author: p.author ?? "Nomarc", date: fmt(p.publishedAt ?? p.createdAt), readMinutes: p.readMinutes ?? 5, body: p.body ?? "",
  };
}

export async function getPublishedSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: blogPost.slug }).from(blogPost).where(liveCondition());
  return rows.map((r) => r.slug);
}

/* ── admin ── */
export async function listAllPosts(): Promise<AdminPost[]> {
  await requireAdmin();
  const rows = await db.select().from(blogPost).orderBy(desc(blogPost.updatedAt));
  const now = Date.now();
  return rows.map((p) => ({
    id: p.id, slug: p.slug, title: p.title, status: p.status ?? "draft",
    scheduled: (p.status === "published") && !!p.publishedAt && new Date(p.publishedAt).getTime() > now,
    date: fmt(p.updatedAt),
  }));
}

export type PostInput = { slug?: string; title: string; excerpt?: string; body?: string; coverUrl?: string; tags?: string[]; readMinutes?: number; status?: "draft" | "published"; publishAt?: string };

export async function getPostForEdit(id: string) {
  await requireAdmin();
  const [p] = await db.select().from(blogPost).where(eq(blogPost.id, id)).limit(1);
  if (!p) return null;
  const future = p.publishedAt && new Date(p.publishedAt).getTime() > Date.now() ? toYMD(new Date(p.publishedAt)) : "";
  return { id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt ?? "", body: p.body ?? "", coverUrl: p.coverUrl ?? "", tags: p.tags ?? [], readMinutes: p.readMinutes ?? 5, status: (p.status ?? "draft") as "draft" | "published", publishAt: future };
}

export async function savePost(input: PostInput & { id?: string }) {
  const author = await requireAdmin();
  if (!input.title.trim()) throw new Error("Title is required");
  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(input.title)) || `post-${Date.now()}`;
  const status = input.status ?? "draft";
  // scheduled publish date (start of that day), else now on publish
  const scheduled = input.publishAt ? new Date(`${input.publishAt}T09:00:00`) : null;
  // `blob:` is a browser-local object URL. FileUpload emits one optimistically
  // as a preview before the real upload resolves, so saving the editor too
  // early persisted a URL that resolves for nobody — one published post shipped
  // with `blob:https://…` as its cover and rendered as a broken image for every
  // reader. Never store one; treat it as "no cover" and let the placeholder run.
  const cover = input.coverUrl?.trim();
  const coverUrl = cover && !cover.startsWith("blob:") ? cover : null;

  const fields = {
    slug, title: input.title.trim(), excerpt: input.excerpt || null, body: input.body ? sanitize(input.body) : null,
    coverUrl, tags: input.tags && input.tags.length ? input.tags : null,
    readMinutes: input.readMinutes ?? 5, status, author, updatedAt: new Date(),
  };
  if (input.id) {
    const [existing] = await db.select({ publishedAt: blogPost.publishedAt }).from(blogPost).where(eq(blogPost.id, input.id)).limit(1);
    const publishedAt = status === "published" ? (scheduled ?? existing?.publishedAt ?? new Date()) : null;
    await db.update(blogPost).set({ ...fields, publishedAt }).where(eq(blogPost.id, input.id));
  } else {
    await db.insert(blogPost).values({ ...fields, publishedAt: status === "published" ? (scheduled ?? new Date()) : null });
  }
  revalidatePath("/admin/newsfeed");
  revalidatePath("/newsfeed");
  revalidatePath(`/newsfeed/${slug}`);
  return slug;
}

export async function deletePost(id: string) {
  await requireAdmin();
  await db.delete(blogPost).where(eq(blogPost.id, id));
  revalidatePath("/admin/newsfeed");
  revalidatePath("/newsfeed");
}
