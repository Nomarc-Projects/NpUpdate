"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { catalogueEntry } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/authz";
import { requireUserId } from "@/lib/server-user";
import type { CatalogueKind } from "@/lib/constants/catalogue-categories";

export type CatalogueEntry = {
  id: string;
  kind: CatalogueKind;
  name: string;
  acronym: string;
  category: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  about: string;
  logoUrl: string;
  published: boolean;
};

const map = (r: typeof catalogueEntry.$inferSelect): CatalogueEntry => ({
  id: r.id,
  kind: r.kind as CatalogueKind,
  name: r.name,
  acronym: r.acronym ?? "",
  category: r.category ?? "",
  location: r.location ?? "",
  email: r.email ?? "",
  phone: r.phone ?? "",
  website: r.website ?? "",
  about: r.about ?? "",
  logoUrl: r.logoUrl ?? "",
  published: r.published,
});

const bump = () => { revalidatePath("/admin/directory"); revalidatePath("/dashboard/directory"); };

/** Published catalogue entries for signed-in members, one kind at a time (the
 *  Directory splits Institutions and Ministries into their own tabs). */
export async function listCatalogue(kind: CatalogueKind): Promise<CatalogueEntry[]> {
  await requireUserId();
  const rows = await db
    .select()
    .from(catalogueEntry)
    .where(and(eq(catalogueEntry.kind, kind), eq(catalogueEntry.published, true)))
    .orderBy(asc(catalogueEntry.name));
  return rows.map(map);
}

/** Every catalogue entry (drafts included) for the admin console, alphabetical. */
export async function listCatalogueAll(): Promise<CatalogueEntry[]> {
  await requireAdmin();
  const rows = await db.select().from(catalogueEntry).orderBy(asc(catalogueEntry.name));
  return rows.map(map);
}

export type CatalogueInput = {
  kind: CatalogueKind;
  name: string;
  acronym: string;
  category: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  about: string;
  logoUrl: string;
  published: boolean;
};

export async function createCatalogueEntry(input: CatalogueInput): Promise<string> {
  await requireAdmin();
  if (!input.name.trim()) throw new Error("Name is required");
  const [row] = await db.insert(catalogueEntry).values({
    kind: input.kind,
    name: input.name.trim(),
    acronym: input.acronym.trim() || null,
    category: input.category.trim() || null,
    location: input.location.trim() || null,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    website: input.website.trim() || null,
    about: input.about.trim() || null,
    logoUrl: input.logoUrl.trim() || null,
    published: input.published,
  }).returning({ id: catalogueEntry.id });
  bump();
  return row.id;
}

export async function updateCatalogueEntry(id: string, input: CatalogueInput): Promise<void> {
  await requireAdmin();
  if (!input.name.trim()) throw new Error("Name is required");
  await db.update(catalogueEntry).set({
    kind: input.kind,
    name: input.name.trim(),
    acronym: input.acronym.trim() || null,
    category: input.category.trim() || null,
    location: input.location.trim() || null,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    website: input.website.trim() || null,
    about: input.about.trim() || null,
    logoUrl: input.logoUrl.trim() || null,
    published: input.published,
  }).where(eq(catalogueEntry.id, id));
  bump();
}

export async function deleteCatalogueEntry(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(catalogueEntry).where(eq(catalogueEntry.id, id));
  bump();
}