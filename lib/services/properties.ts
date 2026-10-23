"use server";

import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { property, propertyDocument, propertyEvent, propertyListerProfile, propertyMedia } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type PropertyCard = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  category: string;
  propertyType: string | null;
  city: string | null;
  state: string | null;
  priceMinor: number;
  priceNgnMinor: number;
  currency: string;
  pricePeriod: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  sizeAcres: number | null;
  status: string;
  documentStatus: string;
  feeAmountMinor: number | null;
  feeStatus: string;
  rejectionReason: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  coverUrl: string | null;
  createdAt: string;
};

export type PropertySearch = {
  kind?: string;
  category?: string;
  state?: string;
  q?: string;
  minMinor?: number;
  maxMinor?: number;
  limit?: number;
};

const cardColumns = {
  id: property.id,
  slug: property.slug,
  title: property.title,
  kind: property.kind,
  category: property.category,
  propertyType: property.propertyType,
  city: property.city,
  state: property.state,
  priceMinor: property.priceMinor,
  priceNgnMinor: property.priceNgnMinor,
  currency: property.currency,
  pricePeriod: property.pricePeriod,
  bedrooms: property.bedrooms,
  bathrooms: property.bathrooms,
  sizeSqm: property.sizeSqm,
  sizeAcres: property.sizeAcres,
  status: property.status,
  documentStatus: property.documentStatus,
  feeAmountMinor: property.feeAmountMinor,
  feeStatus: property.feeStatus,
  rejectionReason: property.rejectionReason,
  publishedAt: property.publishedAt,
  expiresAt: property.expiresAt,
  createdAt: property.createdAt,
};

type CardRow = {
  id: string; slug: string; title: string; kind: string; category: string;
  propertyType: string | null; city: string | null; state: string | null;
  priceMinor: number; priceNgnMinor: number; currency: string; pricePeriod: string;
  bedrooms: number | null; bathrooms: number | null; sizeSqm: number | null;
  sizeAcres: number | null; status: string; documentStatus: string;
  feeAmountMinor: number | null; feeStatus: string; rejectionReason: string | null;
  publishedAt: Date | null; expiresAt: Date | null; createdAt: Date;
};

async function withCovers(rows: CardRow[]): Promise<PropertyCard[]> {
  if (!rows.length) return [];
  const media = await db
    .select({ propertyId: propertyMedia.propertyId, url: propertyMedia.url })
    .from(propertyMedia)
    .where(and(inArray(propertyMedia.propertyId, rows.map((r) => r.id)), eq(propertyMedia.kind, "image")))
    .orderBy(asc(propertyMedia.sortOrder));
  const covers = new Map<string, string>();
  for (const m of media) if (!covers.has(m.propertyId)) covers.set(m.propertyId, m.url);
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    publishedAt: r.publishedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    coverUrl: covers.get(r.id) ?? null,
  }));
}

export async function getPublicProperties(filters: PropertySearch = {}): Promise<PropertyCard[]> {
  const where = [
    eq(property.status, "published"),
    sql`(${property.expiresAt} is null or ${property.expiresAt} > now())`,
  ];
  if (filters.kind) where.push(eq(property.kind, filters.kind));
  if (filters.category) where.push(eq(property.category, filters.category));
  if (filters.state) where.push(eq(property.state, filters.state));
  if (filters.minMinor != null) where.push(gte(property.priceNgnMinor, filters.minMinor));
  if (filters.maxMinor != null) where.push(lte(property.priceNgnMinor, filters.maxMinor));
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    const match = or(
      ilike(property.title, q),
      ilike(property.city, q),
      ilike(property.state, q),
      ilike(property.address, q),
    );
    if (match) where.push(match);
  }

  const rows = await db
    .select(cardColumns)
    .from(property)
    .where(and(...where))
    .orderBy(desc(property.publishedAt), desc(property.createdAt))
    .limit(Math.min(Math.max(filters.limit ?? 60, 1), 100));
  return withCovers(rows);
}

export async function getPublicPropertiesByIds(ids: string[]): Promise<PropertyCard[]> {
  if (!ids.length) return [];
  const rows = await db
    .select(cardColumns)
    .from(property)
    .where(and(
      inArray(property.id, ids),
      eq(property.status, "published"),
      sql`(${property.expiresAt} is null or ${property.expiresAt} > now())`,
    ))
    .orderBy(desc(property.publishedAt), desc(property.createdAt));
  return withCovers(rows);
}

export async function getPublicProperty(slug: string) {
  const [row] = await db
    .select()
    .from(property)
    .where(and(
      eq(property.slug, slug),
      eq(property.status, "published"),
      sql`(${property.expiresAt} is null or ${property.expiresAt} > now())`,
    ))
    .limit(1);
  if (!row) return null;

  const [media, docs, lister] = await Promise.all([
    db.select().from(propertyMedia).where(eq(propertyMedia.propertyId, row.id)).orderBy(asc(propertyMedia.sortOrder)),
    db
      .select({ docType: propertyDocument.docType, status: propertyDocument.status })
      .from(propertyDocument)
      .where(eq(propertyDocument.propertyId, row.id)),
    row.listerProfileId
      ? db
          .select({
            displayName: propertyListerProfile.displayName,
            companyName: propertyListerProfile.companyName,
            listerType: propertyListerProfile.listerType,
            verificationStatus: propertyListerProfile.verificationStatus,
          })
          .from(propertyListerProfile)
          .where(eq(propertyListerProfile.id, row.listerProfileId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return { ...row, createdAt: row.createdAt.toISOString(), media, docs, lister: lister[0] ?? null };
}

export async function getOwnedProperties(): Promise<PropertyCard[]> {
  const uid = await requireUserId();
  const rows = await db
    .select(cardColumns)
    .from(property)
    .where(eq(property.ownerUserId, uid))
    .orderBy(desc(property.updatedAt));
  return withCovers(rows);
}

export async function getOwnedProperty(id: string) {
  const uid = await requireUserId();
  const [row] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, id), eq(property.ownerUserId, uid)))
    .limit(1);
  if (!row) return null;
  const [media, docs] = await Promise.all([
    db.select().from(propertyMedia).where(eq(propertyMedia.propertyId, id)).orderBy(asc(propertyMedia.sortOrder)),
    db.select().from(propertyDocument).where(eq(propertyDocument.propertyId, id)),
  ]);
  return { ...row, createdAt: row.createdAt.toISOString(), media, docs };
}

export async function getOwnerPropertyStats() {
  const uid = await requireUserId();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      live: sql<number>`count(*) filter (where status = 'published')::int`,
      pending: sql<number>`count(*) filter (where status = 'pending_approval')::int`,
      drafts: sql<number>`count(*) filter (where status = 'draft')::int`,
      views: sql<number>`coalesce(sum(view_count), 0)::int`,
    })
    .from(property)
    .where(eq(property.ownerUserId, uid));
  return row ?? { total: 0, live: 0, pending: 0, drafts: 0, views: 0 };
}


export async function getPublishedPropertySitemap() {
  const rows = await db
    .select({ slug: property.slug, updatedAt: property.updatedAt })
    .from(property)
    .where(and(eq(property.status, "published"), sql`(${property.expiresAt} is null or ${property.expiresAt} > now())`))
    .orderBy(desc(property.publishedAt))
    .limit(5000);
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt }));
}

export async function recordPropertyView(propertyId: string) {
  const [row] = await db
    .select({ id: property.id })
    .from(property)
    .where(and(
      eq(property.id, propertyId),
      eq(property.status, "published"),
      sql`(${property.expiresAt} is null or ${property.expiresAt} > now())`,
    ))
    .limit(1);
  if (!row) return;
  await Promise.all([
    db.update(property).set({ viewCount: sql`${property.viewCount} + 1` }).where(eq(property.id, propertyId)),
    db.insert(propertyEvent).values({ propertyId, eventType: "view" }),
  ]).catch(() => {});
}
