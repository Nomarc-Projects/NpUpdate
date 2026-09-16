"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { product, productVariant, company } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { ensureCompany } from "@/lib/company-internal";
import { assertCanPublish } from "@/lib/services/exhibitor-trial";

export type ProductStatus = "active" | "draft" | "archived";
export type StockLevel = "high" | "low" | "out";

export type VariantRow = { id: string; name: string; spec: string | null; price: number | null; stock: number; sku: string | null; active: boolean };
export type SpecRow = { label: string; value: string };
export type MyProduct = {
  id: string; name: string; sku: string | null; status: ProductStatus; category: string | null; type: string | null;
  vendorName: string | null; tags: string[]; retailMin: number | null; retailMax: number | null;
  wholesaleMin: number | null; wholesaleMax: number | null; costPerItem: number | null; stock: number;
  stockLevel: StockLevel; unit: string | null; images: string[]; description: string | null;
  slug: string | null; seoTitle: string | null; seoDescription: string | null; specs: SpecRow[]; variants: VariantRow[];
  availability: string | null; companyId: string; vendorUserId: string | null; companyVerified: boolean;
  createdAt: string; updatedAt: string;
};

const bump = () => { revalidatePath("/dashboard/my-products"); revalidatePath("/dashboard/products"); };
const num = (v?: string | number | null) => { if (v == null || v === "") return null; const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const stockLevel = (n: number): StockLevel => (n <= 0 ? "out" : n < 50 ? "low" : "high");

export type ProductInput = {
  name: string; slug?: string; sku?: string; category?: string; type?: string; vendorName?: string;
  description?: string; tags?: string[]; availability?: string; coverUrl?: string; gallery?: string[];
  specs?: { label: string; value: string }[];
  retailMin?: string | number; retailMax?: string | number; wholesaleMin?: string | number; wholesaleMax?: string | number;
  costPerItem?: string | number; stock?: string | number; unit?: string; seoTitle?: string; seoDescription?: string;
  status?: ProductStatus;
};

function values(companyId: string, input: ProductInput) {
  return {
    companyId,
    name: input.name.trim(),
    slug: input.slug?.trim() || slugify(input.name),
    sku: input.sku?.trim() || null,
    category: input.category || null,
    type: input.type || null,
    vendorName: input.vendorName || null,
    description: input.description || null,
    tags: input.tags && input.tags.length ? input.tags : null,
    availability: input.availability || null,
    coverUrl: input.coverUrl || null,
    gallery: input.gallery && input.gallery.length ? input.gallery : null,
    specs: input.specs && input.specs.length ? input.specs.filter((s) => s.label.trim()) : null,
    retailMin: num(input.retailMin), retailMax: num(input.retailMax),
    wholesaleMin: num(input.wholesaleMin), wholesaleMax: num(input.wholesaleMax),
    costPerItem: num(input.costPerItem),
    stock: num(input.stock) ?? 0,
    unit: input.unit || null,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    status: input.status || "active",
    draft: (input.status || "active") === "draft",
  };
}

export async function createProduct(input: ProductInput, draft = false): Promise<string> {
  const uid = await requireUserId();
  if (!input.name?.trim()) throw new Error("Product name is required");
  const companyId = await ensureCompany(uid);
  const status = draft ? "draft" : input.status ?? "active";
  // Drafts are always free — the trial caps what's PUBLISHED, so an exhibitor
  // can keep preparing listings and publish them once they subscribe. Enforced
  // here rather than only in the UI: the action is callable directly.
  if (status !== "draft") await assertCanPublish();
  const v = values(companyId, { ...input, status });
  const [row] = await db.insert(product).values(v).returning({ id: product.id });
  bump();
  return row.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const uid = await requireUserId();
  const companyId = await ensureCompany(uid);
  const v = values(companyId, input);
  await db.update(product).set({ ...v, updatedAt: new Date() }).where(and(eq(product.id, id), eq(product.companyId, companyId)));
  bump();
}

/** The scalar fields an owner can edit, owner-gated. The signed-in user must
 *  own the company the product belongs to, so one exhibitor can never read
 *  another's draft listing data. */
export type ProductForEdit = {
  id: string; name: string; slug: string | null; sku: string | null; category: string | null; type: string | null;
  vendorName: string | null; description: string | null; tags: string[]; availability: string | null;
  coverUrl: string | null; gallery: string[]; specs: { label: string; value: string }[];
  retailMin: number | null; retailMax: number | null; wholesaleMin: number | null; wholesaleMax: number | null;
  costPerItem: number | null; stock: number; unit: string | null;
  seoTitle: string | null; seoDescription: string | null; status: ProductStatus; companyId: string;
};

export async function getOwnedProductForEdit(id: string): Promise<ProductForEdit | null> {
  const uid = await requireUserId();
  const [p] = await db.select()
    .from(product)
    .innerJoin(company, eq(product.companyId, company.id))
    .where(and(eq(product.id, id), eq(company.ownerUserId, uid)))
    .limit(1);
  if (!p) return null;
  const r = p.product;
  return {
    id: r.id, name: r.name, slug: r.slug, sku: r.sku, category: r.category, type: r.type,
    vendorName: r.vendorName, description: r.description, tags: r.tags ?? [],
    availability: r.availability, coverUrl: r.coverUrl, gallery: r.gallery ?? [],
    specs: r.specs ?? [],
    retailMin: r.retailMin, retailMax: r.retailMax, wholesaleMin: r.wholesaleMin, wholesaleMax: r.wholesaleMax,
    costPerItem: r.costPerItem, stock: r.stock ?? 0, unit: r.unit,
    seoTitle: r.seoTitle, seoDescription: r.seoDescription,
    status: (r.status as ProductStatus) ?? "active", companyId: r.companyId,
  };
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  const uid = await requireUserId();
  const companyId = await ensureCompany(uid);
  // Un-drafting is a publish. Without this the trial cap could be walked around
  // by saving drafts freely and flipping them live afterwards.
  if (status === "active") {
    const [current] = await db.select({ status: product.status }).from(product)
      .where(and(eq(product.id, id), eq(product.companyId, companyId))).limit(1);
    if (current && current.status !== "active") await assertCanPublish();
  }
  await db.update(product).set({ status, draft: status === "draft", updatedAt: new Date() }).where(and(eq(product.id, id), eq(product.companyId, companyId)));
  bump();
}

export async function deleteProduct(id: string): Promise<void> {
  const uid = await requireUserId();
  const companyId = await ensureCompany(uid);
  await db.delete(product).where(and(eq(product.id, id), eq(product.companyId, companyId)));
  bump();
}

export async function addVariant(productId: string, input: { name: string; spec?: string; price?: string | number; stock?: string | number; sku?: string }): Promise<string> {
  await requireUserId();
  const [row] = await db.insert(productVariant).values({
    productId, name: input.name.trim(), spec: input.spec || null,
    price: num(input.price), stock: num(input.stock) ?? 0, sku: input.sku || null,
  }).returning({ id: productVariant.id });
  bump();
  return row.id;
}

export async function removeVariant(id: string): Promise<void> {
  await requireUserId();
  await db.delete(productVariant).where(eq(productVariant.id, id));
  bump();
}

function mapRow(p: typeof product.$inferSelect, variants: VariantRow[], vendorUserId: string | null = null, companyVerified = false): MyProduct {
  return {
    id: p.id, name: p.name, sku: p.sku, status: (p.status as ProductStatus) ?? "active", category: p.category, type: p.type,
    vendorName: p.vendorName, tags: p.tags ?? [], retailMin: p.retailMin, retailMax: p.retailMax,
    wholesaleMin: p.wholesaleMin, wholesaleMax: p.wholesaleMax, costPerItem: p.costPerItem,
    stock: p.stock ?? 0, stockLevel: stockLevel(p.stock ?? 0), unit: p.unit,
    images: [p.coverUrl, ...(p.gallery ?? [])].filter(Boolean) as string[],
    description: p.description, slug: p.slug, seoTitle: p.seoTitle, seoDescription: p.seoDescription,
    specs: p.specs ?? [],
    variants,
    availability: p.availability, companyId: p.companyId, vendorUserId, companyVerified,
    createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
  };
}

/** The signed-in exhibitor's catalog. Resilient: returns [] pre-migration. */
export async function getMyProducts(): Promise<MyProduct[]> {
  try {
    const uid = await requireUserId();
    const [c] = await db.select({ id: company.id }).from(company).where(eq(company.ownerUserId, uid)).limit(1);
    if (!c) return [];
    const rows = await db.select().from(product).where(eq(product.companyId, c.id)).orderBy(desc(product.createdAt));
    const ids = rows.map((r) => r.id);
    const vars = ids.length ? await db.select().from(productVariant).where(eq(productVariant.productId, ids[0])).orderBy(asc(productVariant.sortOrder)) : [];
    // fetch variants per product (small N) — keep simple
    const out: MyProduct[] = [];
    for (const r of rows) {
      const vs = r.id === ids[0] ? vars : await db.select().from(productVariant).where(eq(productVariant.productId, r.id)).orderBy(asc(productVariant.sortOrder));
      out.push(mapRow(r, vs.map((v) => ({ id: v.id, name: v.name, spec: v.spec, price: v.price, stock: v.stock ?? 0, sku: v.sku, active: v.active ?? true }))));
    }
    return out;
  } catch {
    return [];
  }
}

/** A single product (owner edit or buyer view). Resilient. */
export async function getProductById(id: string): Promise<MyProduct | null> {
  try {
    const [p] = await db.select().from(product).where(eq(product.id, id)).limit(1);
    if (!p) return null;
    const vs = await db.select().from(productVariant).where(eq(productVariant.productId, id)).orderBy(asc(productVariant.sortOrder));
    const [co] = await db.select({ ownerUserId: company.ownerUserId, verified: company.verified }).from(company).where(eq(company.id, p.companyId)).limit(1);
    return mapRow(p, vs.map((v) => ({ id: v.id, name: v.name, spec: v.spec, price: v.price, stock: v.stock ?? 0, sku: v.sku, active: v.active ?? true })), co?.ownerUserId ?? null, co?.verified ?? false);
  } catch {
    return null;
  }
}
