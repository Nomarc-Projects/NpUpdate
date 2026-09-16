"use server";

import { headers } from "next/headers";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { advert } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";

export type Advert = {
  id: string;
  heading: string;
  subheading: string | null;
  body: string | null;
  badge: string | null;
  promotedName: string | null;
  promotedMeta: string | null;
  avatarUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaLabel2: string | null;
  ctaHref2: string | null;
  imageUrl: string | null;
  accent: string;
  active: boolean;
  sortOrder: number;
  date: string;
  /** Set only for self-serve campaigns — house adverts have no metrics. */
  promotionId?: string | null;
};

async function requireAdmin(): Promise<string> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "super_admin") throw new Error("Forbidden");
  return uid;
}

const map = (r: typeof advert.$inferSelect): Advert => ({
  id: r.id,
  heading: r.heading,
  subheading: r.subheading,
  body: r.body,
  badge: r.badge,
  promotedName: r.promotedName,
  promotedMeta: r.promotedMeta,
  avatarUrl: r.avatarUrl,
  ctaLabel: r.ctaLabel,
  ctaHref: r.ctaHref,
  ctaLabel2: r.ctaLabel2,
  ctaHref2: r.ctaHref2,
  imageUrl: r.imageUrl,
  accent: r.accent ?? "#ffd716",
  active: !!r.active,
  sortOrder: r.sortOrder ?? 0,
  date: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
});

const bump = () => { revalidatePath("/admin/adverts"); revalidatePath("/"); };

/** Admin: every advert, newest first. Resilient if the table isn't migrated yet. */
export async function listAdverts(): Promise<Advert[]> {
  await requireAdmin();
  try {
    const rows = await db.select().from(advert).orderBy(asc(advert.sortOrder), desc(advert.createdAt));
    return rows.map(map);
  } catch {
    return [];
  }
}

/**
 * Public: what actually appears in the promoted slots.
 *
 * Two sources, deliberately unified here rather than in the component:
 *
 *  - `advert` — house/admin-curated cards, ordered by sortOrder.
 *  - `promotion` — self-serve campaigns bought through the Ads Board.
 *
 * Approved promotions previously reached no public surface at all: approval
 * only flipped `status` to 'active', while every promoted slot read `advert`.
 * Since promotions are a paid product, that meant selling a placement that was
 * never rendered. Admin cards keep priority; paid campaigns follow, newest
 * first.
 */
export async function getActiveAdverts(): Promise<Advert[]> {
  // Retire campaigns past their end date before reading. Lazy, like the
  // exhibitor trial sweep — there is no cron, and this is the moment it
  // matters, since an expired ad must not render.
  const { sweepExpiredPromotions } = await import("@/lib/services/promotion-checkout");
  await sweepExpiredPromotions();

  const [house, paid] = await Promise.all([
    db.select().from(advert).where(eq(advert.active, true)).orderBy(asc(advert.sortOrder), desc(advert.createdAt)).limit(10).catch(() => []),
    activePromotionCards().catch(() => []),
  ]);
  return [...house.map(map), ...paid].slice(0, 10);
}

/** Live self-serve campaigns, shaped as promoted cards. */
async function activePromotionCards(): Promise<Advert[]> {
  const res = await db.execute(sql`
    SELECT pr.id, pr.kind, pr.ref_id, pr.headline, pr.description, pr.banner_image_url,
           u.name AS owner_name,
           COALESCE(p.avatar_url, u.image) AS owner_avatar,
           p.headline AS owner_headline, p.location AS owner_location,
           c.name AS company_name, c.industry AS company_industry, c.headquarters AS company_hq
    FROM promotion pr
    JOIN "user" u ON u.id = pr.owner_user_id
    LEFT JOIN profile p ON p.user_id = pr.owner_user_id
    LEFT JOIN company c ON c.owner_user_id = pr.owner_user_id
    WHERE pr.status = 'active'
    ORDER BY pr.created_at DESC
    LIMIT 10
  `);

  return (res.rows as Record<string, unknown>[]).map((r) => {
    const kind = String(r.kind);
    const isCompany = !!r.company_name;
    // A product ad speaks for the company; profile and project ads speak for
    // the person. Meta mirrors the "Role • Location" line in the design.
    const name = kind === "product" && isCompany ? String(r.company_name) : String(r.owner_name ?? "");
    const meta = kind === "product" && isCompany
      ? [r.company_industry, r.company_hq].filter(Boolean).join(" • ")
      : [r.owner_headline, r.owner_location].filter(Boolean).join(" • ");
    const href =
      kind === "product" && r.ref_id ? `/exhibition-hub/${String(r.ref_id)}`
      : kind === "profile" ? `/dashboard/people`
      : `/dashboard/projects`;
    const primaryLabel = kind === "product" ? "View Product" : kind === "project" ? "View Project" : "View Profile";

    return {
      id: String(r.id),
      heading: String(r.headline ?? ""),
      subheading: null,
      body: r.description ? String(r.description) : null,
      badge: "Promoted",
      promotedName: name,
      promotedMeta: meta || null,
      avatarUrl: r.owner_avatar ? String(r.owner_avatar) : null,
      ctaLabel: primaryLabel,
      ctaHref: href,
      ctaLabel2: kind === "product" ? "Request Quote" : "Message Professional",
      ctaHref2: "/dashboard/messages",
      imageUrl: r.banner_image_url ? String(r.banner_image_url) : null,
      accent: "#ffd716",
      active: true,
      sortOrder: 0,
      date: "",
      promotionId: String(r.id),
    } satisfies Advert;
  });
}

export type AdvertInput = {
  heading: string; body?: string; badge?: string;
  promotedName?: string; promotedMeta?: string; avatarUrl?: string;
  ctaLabel?: string; ctaHref?: string; ctaLabel2?: string; ctaHref2?: string;
  imageUrl?: string; accent?: string; sortOrder?: number;
};

const values = (input: AdvertInput) => ({
  heading: input.heading.trim(),
  body: input.body?.trim() || null,
  badge: input.badge?.trim() || null,
  promotedName: input.promotedName?.trim() || null,
  promotedMeta: input.promotedMeta?.trim() || null,
  avatarUrl: input.avatarUrl?.trim() || null,
  ctaLabel: input.ctaLabel?.trim() || null,
  ctaHref: input.ctaHref?.trim() || null,
  ctaLabel2: input.ctaLabel2?.trim() || null,
  ctaHref2: input.ctaHref2?.trim() || null,
  imageUrl: input.imageUrl?.trim() || null,
  accent: input.accent || "#ffd716",
  sortOrder: input.sortOrder ?? 0,
});

export async function createAdvert(input: AdvertInput) {
  await requireAdmin();
  if (!input.heading.trim()) throw new Error("Heading is required");
  await db.insert(advert).values(values(input));
  bump();
}

export async function updateAdvert(id: string, input: AdvertInput) {
  await requireAdmin();
  if (!input.heading.trim()) throw new Error("Heading is required");
  await db.update(advert).set(values(input)).where(eq(advert.id, id));
  bump();
}

export async function toggleAdvertActive(id: string, active: boolean) {
  await requireAdmin();
  await db.update(advert).set({ active }).where(eq(advert.id, id));
  bump();
}

export async function deleteAdvert(id: string) {
  await requireAdmin();
  await db.delete(advert).where(eq(advert.id, id));
  bump();
}
