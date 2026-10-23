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
  /** Required when `availability` is "made_to_order". */
  leadTimeValue?: string | number; leadTimeUnit?: string;
};

const LEAD_TIME_UNITS = ["days", "weeks", "months"] as const;
type LeadTimeUnit = (typeof LEAD_TIME_UNITS)[number];

function parseLeadTime(input: ProductInput): { value: number | null; unit: LeadTimeUnit | null } {
  const raw = input.leadTimeValue;
  const n = raw == null || raw === "" ? null : Number(raw);
  const value = n != null && Number.isInteger(n) && n > 0 ? n : null;
  const unit = (LEAD_TIME_UNITS as readonly string[]).includes(input.leadTimeUnit ?? "")
    ? (input.leadTimeUnit as LeadTimeUnit)
    : null;
  return { value, unit };
}

function assertLeadTime(input: ProductInput): void {
  const { value, unit } = parseLeadTime(input);
  if (value == null || unit == null) {
    throw new Error("Lead time is required when availability is Made to order. Add a number and choose Days, Weeks or Months.");
  }
}

function values(companyId: string, input: ProductInput) {
  const availability = input.availability || null;
  // A lead time only makes sense for made-to-order listings, so switching to
  // any other availability always clears it.
  const leadTime = availability === "made_to_order"
    ? parseLeadTime(input)
    : { value: null, unit: null };
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
    availability,
    leadTimeValue: leadTime.value,
    leadTimeUnit: leadTime.unit,
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
    // status/draft are intentionally NOT set here: createProduct sets them, and
    // updateProduct must leave the existing status alone unless the caller
    // explicitly passes one. Defaulting here used to flip every edited draft to
    // "active", quietly publishing past the plan gate.
  };
}

/** A published listing may only sit in one of the company's registered shops.
 *  `product.category` is free text, so without this an exhibitor could sidestep
 *  the plan's category cap by inventing unlimited categories. Legacy accounts
 *  that never collected shops (categories empty) stay unrestricted. */
async function assertCategoryRegistered(companyId: string, category: string | null | undefined): Promise<void> {
  const cat = category?.trim();
  if (!cat) return;
  const [co] = await db.select({ categories: company.categories }).from(company).where(eq(company.id, companyId)).limit(1);
  const allowed = co?.categories ?? [];
  if (allowed.length === 0) return;
  if (!allowed.some((c) => c.trim().toLowerCase() === cat.toLowerCase())) {
    throw new Error(`“${cat}” isn't one of your registered shops. Your plan lists in: ${allowed.join(", ")}. Add it to your company profile first.`);
  }
}

export async function createProduct(input: ProductInput, draft = false): Promise<string> {
  const uid = await requireUserId();
  if (!input.name?.trim()) throw new Error("Product name is required");
  const companyId = await ensureCompany(uid);
  const status = draft ? "draft" : input.status ?? "active";
  // Drafts are always free — the plan caps what's PUBLISHED, so an exhibitor
  // can keep preparing listings and publish them once they subscribe. Enforced
  // here rather than only in the UI: the action is callable directly.
  if (status !== "draft") {
    // Total listing cap + active paid plan.
    await assertCanPublish();
    // Must be one of the plan's registered shops.
    await assertCategoryRegistered(companyId, input.category);
  }
  if (status === "active" && input.availability === "made_to_order") assertLeadTime(input);

  const v = { ...values(companyId, input), status, draft: status === "draft" };
  const [row] = await db.insert(product).values(v).returning({ id: product.id });
  bump();
  return row.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const uid = await requireUserId();
  const companyId = await ensureCompany(uid);
  const [existing] = await db
    .select({ status: product.status, category: product.category })
    .from(product)
    .where(and(eq(product.id, id), eq(product.companyId, companyId)))
    .limit(1);
  if (!existing) throw new Error("Product not found");

  const nextStatus = (input.status ?? existing.status) as ProductStatus;
  const nextCategory = input.category?.trim() || null;
  const activating = nextStatus === "active" && existing.status !== "active";
  const categoryChanged = nextCategory !== (existing.category ?? null);

  // Made-to-order listings must always carry a lead time; editing a legacy row
  // with no lead time will therefore be blocked until the exhibitor adds one.
  if (nextStatus === "active" && input.availability === "made_to_order") assertLeadTime(input);

  // Publishing, or moving a live listing into another shop, must respect the
  // plan caps exactly like create/setProductStatus — the edit form is just
  // another typeable entry point.
  if (activating) await assertCanPublish();
  if (nextStatus === "active" && (activating || categoryChanged)) {
    await assertCategoryRegistered(companyId, nextCategory);
  }

  const v = values(companyId, input);
  await db
    .update(product)
    .set({
      ...v,
      // Only touch status when the caller actually asked to change it; the edit
      // drawer omits it, so editing a draft keeps it a draft.
      ...(input.status ? { status: input.status, draft: input.status === "draft" } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(product.id, id), eq(product.companyId, companyId)));
  bump();
}

/** The scalar fields an owner can edit, owner-gated. The signed-in user must
 *  own the company the product belongs to, so one exhibitor can never read
 *  another's draft listing data. */
export type ProductForEdit = {
  id: string; name: string; slug: string | null; sku: string | null; category: string | null; type: string | null;
  vendorName: string | null; description: string | null; tags: string[]; availability: string | null;
  leadTimeValue: number | null; leadTimeUnit: string | null;
  coverUrl: string | null; gallery: string[]; specs: { label: string; value: string }[];
  retailMin: number | null; retailMax: number | null; wholesaleMin: number | null; wholesaleMax: number | null;
  costPerItem: number | null; stock: number; unit: string | null;
  seoTitle: string | null; seoDescription: string | null; status: ProductStatus; companyId: string;
  variants: VariantRow[];
  /** The company's registered shops, so the editor can constrain the category
   *  field the same way createProduct does. Empty = unrestricted (legacy). */
  categories: string[];
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
  const vs = await db.select().from(productVariant).where(eq(productVariant.productId, id)).orderBy(asc(productVariant.sortOrder));
  return {
    id: r.id, name: r.name, slug: r.slug, sku: r.sku, category: r.category, type: r.type,
    vendorName: r.vendorName, description: r.description, tags: r.tags ?? [],
    availability: r.availability, leadTimeValue: r.leadTimeValue, leadTimeUnit: r.leadTimeUnit,
    coverUrl: r.coverUrl, gallery: r.gallery ?? [],
    specs: r.specs ?? [],
    retailMin: r.retailMin, retailMax: r.retailMax, wholesaleMin: r.wholesaleMin, wholesaleMax: r.wholesaleMax,
    costPerItem: r.costPerItem, stock: r.stock ?? 0, unit: r.unit,
    seoTitle: r.seoTitle, seoDescription: r.seoDescription,
    status: (r.status as ProductStatus) ?? "active", companyId: r.companyId,
    variants: vs.map((v) => ({ id: v.id, name: v.name, spec: v.spec, price: v.price, stock: v.stock ?? 0, sku: v.sku, active: v.active ?? true })),
    categories: p.company.categories ?? [],
  };
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  const uid = await requireUserId();
  const companyId = await ensureCompany(uid);
  // Un-drafting is a publish. Without this the plan cap could be walked around
  // by saving drafts freely and flipping them live afterwards.
  if (status === "active") {
    const [current] = await db.select({
      status: product.status, category: product.category,
      availability: product.availability, leadTimeValue: product.leadTimeValue, leadTimeUnit: product.leadTimeUnit,
    }).from(product)
      .where(and(eq(product.id, id), eq(product.companyId, companyId))).limit(1);
    if (current && current.status !== "active") {
      if (current.availability === "made_to_order" && (!current.leadTimeValue || !current.leadTimeUnit)) {
        throw new Error("This made-to-order product needs a lead time before it can be published. Edit it and add one.");
      }
      await assertCanPublish();
      await assertCategoryRegistered(companyId, current.category);
    }
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

/** Every variant mutation is reached from the single product editor, which only
 *  knows the product id — so verify the product belongs to the caller's company
 *  before touching its variants. Without this any signed-in user could edit or
 *  delete another exhibitor's variants by id. */
async function assertOwnedProduct(productId: string): Promise<void> {
  const uid = await requireUserId();
  const companyId = await ensureCompany(uid);
  const [row] = await db.select({ id: product.id }).from(product)
    .where(and(eq(product.id, productId), eq(product.companyId, companyId))).limit(1);
  if (!row) throw new Error("Product not found");
}

export async function addVariant(productId: string, input: { name: string; spec?: string; price?: string | number; stock?: string | number; sku?: string }): Promise<string> {
  await assertOwnedProduct(productId);
  const [row] = await db.insert(productVariant).values({
    productId, name: input.name.trim(), spec: input.spec || null,
    price: num(input.price), stock: num(input.stock) ?? 0, sku: input.sku || null,
  }).returning({ id: productVariant.id });
  bump();
  return row.id;
}

export async function updateVariant(id: string, input: { name?: string; spec?: string; price?: string | number; stock?: string | number; sku?: string; active?: boolean }): Promise<void> {
  const [v] = await db.select({ productId: productVariant.productId }).from(productVariant).where(eq(productVariant.id, id)).limit(1);
  if (!v) throw new Error("Variant not found");
  await assertOwnedProduct(v.productId);
  await db.update(productVariant).set({
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.spec !== undefined ? { spec: input.spec || null } : {}),
    ...(input.price !== undefined ? { price: num(input.price) } : {}),
    ...(input.stock !== undefined ? { stock: num(input.stock) ?? 0 } : {}),
    ...(input.sku !== undefined ? { sku: input.sku || null } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  }).where(eq(productVariant.id, id));
  bump();
}

export async function removeVariant(id: string): Promise<void> {
  const [v] = await db.select({ productId: productVariant.productId }).from(productVariant).where(eq(productVariant.id, id)).limit(1);
  if (!v) return;
  await assertOwnedProduct(v.productId);
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
