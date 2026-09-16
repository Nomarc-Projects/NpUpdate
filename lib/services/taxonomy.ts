"use server";

import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { taxonomyTerm } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import type { TaxonomyKind } from "@/lib/taxonomy-kinds";

export type Term = { id: string; name: string; imageUrl: string; active: boolean };

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "super_admin") throw new Error("Forbidden");
}

/** `image_url` is read and written on its own statement: it sits outside the
 *  generated Drizzle model, and a database that hasn't taken
 *  drizzle/0028_taxonomy_term_image.sql yet must still be able to list terms. */
async function imagesByTermId(kind: TaxonomyKind): Promise<Map<string, string>> {
  try {
    const rows = (await db.execute(
      sql`SELECT id, image_url FROM taxonomy_term WHERE kind = ${kind} AND image_url IS NOT NULL`,
    )).rows as { id: string; image_url: string | null }[];
    return new Map(rows.map((r) => [String(r.id), r.image_url ?? ""]));
  } catch {
    return new Map();
  }
}

/** Public: active term names for a kind (ordered). */
export async function getTaxonomy(kind: TaxonomyKind): Promise<string[]> {
  const rows = await db.select({ name: taxonomyTerm.name }).from(taxonomyTerm)
    .where(and(eq(taxonomyTerm.kind, kind), eq(taxonomyTerm.active, true)))
    .orderBy(asc(taxonomyTerm.sortOrder), asc(taxonomyTerm.name));
  return rows.map((r) => r.name);
}

/** Public: the Exhibition Hub's category rail — active product categories with
 *  whatever artwork an admin gave each one. An empty image means the storefront
 *  falls back to a photo from a product genuinely in that category. */
export async function getProductCategories(): Promise<{ name: string; imageUrl: string }[]> {
  try {
    const rows = (await db.execute(
      sql`SELECT name, image_url FROM taxonomy_term
          WHERE kind = 'product_category' AND active = true
          ORDER BY sort_order, name`,
    )).rows as { name: string; image_url: string | null }[];
    return rows.map((r) => ({ name: r.name, imageUrl: r.image_url ?? "" }));
  } catch {
    const names = await getTaxonomy("product_category");
    return names.map((name) => ({ name, imageUrl: "" }));
  }
}

/** Admin: all terms (incl. inactive) for a kind. */
export async function listTaxonomy(kind: TaxonomyKind): Promise<Term[]> {
  await requireAdmin();
  const [rows, images] = await Promise.all([
    db.select().from(taxonomyTerm)
      .where(eq(taxonomyTerm.kind, kind))
      .orderBy(asc(taxonomyTerm.sortOrder), asc(taxonomyTerm.name)),
    imagesByTermId(kind),
  ]);
  return rows.map((r) => ({ id: r.id, name: r.name, imageUrl: images.get(r.id) ?? "", active: !!r.active }));
}

export async function addTerm(kind: TaxonomyKind, name: string) {
  await requireAdmin();
  if (!name.trim()) throw new Error("Name required");
  const [{ n }] = (await db.execute(sql`SELECT count(*) AS n FROM taxonomy_term WHERE kind = ${kind}`)).rows as { n: number }[];
  await db.insert(taxonomyTerm).values({ kind, name: name.trim(), sortOrder: Number(n ?? 0) });
  revalidatePath("/admin/taxonomy");
}

/** Admin: rename a term and set the image its storefront card carries. Both
 *  land in one action because the category card is edited as one thing.
 *  The image write is deliberately not swallowed — a silent failure would leave
 *  an admin believing artwork they can't see on the hub is live. */
export async function updateTerm(id: string, name: string, imageUrl: string) {
  await requireAdmin();
  const n = name.trim();
  if (!n) throw new Error("Name required");
  await db.update(taxonomyTerm).set({ name: n }).where(eq(taxonomyTerm.id, id));
  await db.execute(sql`UPDATE taxonomy_term SET image_url = ${imageUrl.trim() || null} WHERE id = ${id}`);
  revalidatePath("/admin/taxonomy");
  revalidatePath("/exhibition-hub");
}

export async function toggleTerm(id: string, active: boolean) {
  await requireAdmin();
  await db.update(taxonomyTerm).set({ active }).where(eq(taxonomyTerm.id, id));
  revalidatePath("/admin/taxonomy");
}

export async function deleteTerm(id: string) {
  await requireAdmin();
  await db.delete(taxonomyTerm).where(eq(taxonomyTerm.id, id));
  revalidatePath("/admin/taxonomy");
}
