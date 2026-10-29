"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { product, productVariant, company } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { ensureCompany } from "@/lib/company-internal";
import { assertCanPublish } from "@/lib/services/exhibitor-trial";
import { isDeliveryMode, NIGERIAN_STATES, type DeliveryMode } from "@/lib/product-delivery";

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
  deliveryMode: DeliveryMode | null; deliveryStates: string[];
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
  deliveryMode?: DeliveryMode | null; deliveryStates?: string[];
};

const LEAD_TIME_UNITS = ["days", "weeks", "months"] as const;
type LeadTimeUnit = (typeof LEAD_TIME_UNITS)[number];
const LEAD_TIME_MIGRATION_ERROR = "The product database needs an update before made-to-order products can be saved. Please contact support.";
const DELIVERY_MIGRATION_ERROR = "Product delivery options need a database update. Please contact support before saving this product.";

function isMissingLeadTimeColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message, cause } = error as { code?: unknown; message?: unknown; cause?: unknown };
  const text = typeof message === "string" ? message : "";
  if (/lead_time_(?:value|unit)/i.test(text)
    && (code === "42703" || /does not exist|undefined column|unknown column/i.test(text))) return true;
  return cause !== error && isMissingLeadTimeColumns(cause);
}

function withoutLeadTime<T extends { leadTimeValue: unknown; leadTimeUnit: unknown }>(values: T) {
  const { leadTimeValue: _leadTimeValue, leadTimeUnit: _leadTimeUnit, ...compatible } = values;
  return compatible;
}

function isMissingDeliveryColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message, cause } = error as { code?: unknown; message?: unknown; cause?: unknown };
  const text = typeof message === "string" ? message : "";
  if (/delivery_(?:mode|states)/i.test(text)
    && (code === "42703" || /does not exist|undefined column|unknown column/i.test(text))) return true;
  return cause !== error && isMissingDeliveryColumns(cause);
}

function assertDelivery(input: ProductInput): void {
  if (!isDeliveryMode(input.deliveryMode)) {
    throw new Error("Choose a delivery option for this product.");
  }
  if (input.deliveryMode !== "selected_states") return;
  const states = [...new Set((input.deliveryStates ?? []).map((state) => state.trim()).filter(Boolean))];
  if (!states.length) throw new Error("Select at least one state for delivery.");
  const invalid = states.filter((state) => !NIGERIAN_STATES.includes(state));
  if (invalid.length) throw new Error(`Unknown delivery state${invalid.length === 1 ? "" : "s"}: ${invalid.join(", ")}`);
}

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
  const selectedDeliveryStates = new Set((input.deliveryStates ?? []).map((state) => state.trim()));
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
    deliveryMode: input.deliveryMode || null,
    deliveryStates: input.deliveryMode === "selected_states" ? NIGERIAN_STATES.filter((state) => selectedDeliveryStates.has(state)) : null,
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
  assertDelivery(input);
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
  let productId: string;
  try {
    const [row] = await db.insert(product).values(v).returning({ id: product.id });
    productId = row.id;
  } catch (error) {
    if (isMissingDeliveryColumns(error)) throw new Error(DELIVERY_MIGRATION_ERROR);
    if (!isMissingLeadTimeColumns(error)) throw error;
    if (input.availability === "made_to_order") throw new Error(LEAD_TIME_MIGRATION_ERROR);
    try {
      const [row] = await db.insert(product).values(withoutLeadTime(v)).returning({ id: product.id });
      productId = row.id;
    } catch (fallbackError) {
      if (isMissingDeliveryColumns(fallbackError)) throw new Error(DELIVERY_MIGRATION_ERROR);
      throw fallbackError;
    }
  }
  bump();
  return productId;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const uid = await requireUserId();
  assertDelivery(input);
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
  const patch = {
    ...v,
    // Only touch status when the caller actually asked to change it; the edit
    // drawer omits it, so editing a draft keeps it a draft.
    ...(input.status ? { status: input.status, draft: input.status === "draft" } : {}),
    updatedAt: new Date(),
  };
  try {
    await db.update(product).set(patch).where(and(eq(product.id, id), eq(product.companyId, companyId)));
  } catch (error) {
    if (isMissingDeliveryColumns(error)) throw new Error(DELIVERY_MIGRATION_ERROR);
    if (!isMissingLeadTimeColumns(error)) throw error;
    if (input.availability === "made_to_order") throw new Error(LEAD_TIME_MIGRATION_ERROR);
    try {
      await db.update(product).set(withoutLeadTime(patch)).where(and(eq(product.id, id), eq(product.companyId, companyId)));
    } catch (fallbackError) {
      if (isMissingDeliveryColumns(fallbackError)) throw new Error(DELIVERY_MIGRATION_ERROR);
      throw fallbackError;
    }
  }
  bump();
}

/** The scalar fields an owner can edit, owner-gated. The signed-in user must
 *  own the company the product belongs to, so one exhibitor can never read
 *  another's draft listing data. */
export type ProductForEdit = {
  id: string; name: string; slug: string | null; sku: string | null; category: string | null; type: string | null;
  vendorName: string | null; description: string | null; tags: string[]; availability: string | null;
  leadTimeValue: number | null; leadTimeUnit: string | null;
  deliveryMode: DeliveryMode | null; deliveryStates: string[];
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
  const [p] = await db.select({
    id: product.id, name: product.name, slug: product.slug, sku: product.sku,
    category: product.category, type: product.type, vendorName: product.vendorName,
    description: product.description, tags: product.tags, availability: product.availability,
    coverUrl: product.coverUrl, gallery: product.gallery, specs: product.specs,
    retailMin: product.retailMin, retailMax: product.retailMax,
    wholesaleMin: product.wholesaleMin, wholesaleMax: product.wholesaleMax,
    costPerItem: product.costPerItem, stock: product.stock, unit: product.unit,
    seoTitle: product.seoTitle, seoDescription: product.seoDescription,
    status: product.status, companyId: product.companyId, categories: company.categories,
  })
    .from(product)
    .innerJoin(company, eq(product.companyId, company.id))
    .where(and(eq(product.id, id), eq(company.ownerUserId, uid)))
    .limit(1);
  if (!p) return null;
  // Lead-time columns were added in a later migration. Let older production
  // databases continue to load the editor, treating absent values as unset.
  let leadTimeValue: number | null = null;
  let leadTimeUnit: string | null = null;
  let deliveryMode: DeliveryMode | null = null;
  let deliveryStates: string[] = [];
  try {
    const [leadTime] = await db.select({
      value: product.leadTimeValue, unit: product.leadTimeUnit,
    }).from(product).where(eq(product.id, id)).limit(1);
    leadTimeValue = leadTime?.value ?? null;
    leadTimeUnit = leadTime?.unit ?? null;
  } catch { /* optional columns are absent before migration 0064 */ }
  try {
    const [delivery] = await db.select({
      mode: product.deliveryMode, states: product.deliveryStates,
    }).from(product).where(eq(product.id, id)).limit(1);
    deliveryMode = isDeliveryMode(delivery?.mode) ? delivery.mode : null;
    deliveryStates = delivery?.states ?? [];
  } catch { /* optional delivery columns are absent before migration 0066 */ }
  const vs = await db.select().from(productVariant).where(eq(productVariant.productId, id)).orderBy(asc(productVariant.sortOrder));
  return {
    id: p.id, name: p.name, slug: p.slug, sku: p.sku, category: p.category, type: p.type,
    vendorName: p.vendorName, description: p.description, tags: p.tags ?? [],
    availability: p.availability, leadTimeValue, leadTimeUnit,
    deliveryMode, deliveryStates,
    coverUrl: p.coverUrl, gallery: p.gallery ?? [],
    specs: p.specs ?? [],
    retailMin: p.retailMin, retailMax: p.retailMax, wholesaleMin: p.wholesaleMin, wholesaleMax: p.wholesaleMax,
    costPerItem: p.costPerItem, stock: p.stock ?? 0, unit: p.unit,
    seoTitle: p.seoTitle, seoDescription: p.seoDescription,
    status: (p.status as ProductStatus) ?? "active", companyId: p.companyId,
    variants: vs.map((v) => ({ id: v.id, name: v.name, spec: v.spec, price: v.price, stock: v.stock ?? 0, sku: v.sku, active: v.active ?? true })),
    categories: p.categories ?? [],
  };
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  const uid = await requireUserId();
  const companyId = await ensureCompany(uid);
  // Un-drafting is a publish. Without this the plan cap could be walked around
  // by saving drafts freely and flipping them live afterwards.
  if (status === "active") {
    const [current] = await db.select({
      status: product.status, category: product.category, availability: product.availability,
    }).from(product)
      .where(and(eq(product.id, id), eq(product.companyId, companyId))).limit(1);
    if (current && current.status !== "active") {
      if (current.availability === "made_to_order") {
        let leadTime: { value: number | null; unit: string | null } | undefined;
        try {
          [leadTime] = await db.select({
            value: product.leadTimeValue, unit: product.leadTimeUnit,
          }).from(product).where(eq(product.id, id)).limit(1);
        } catch (error) {
          if (isMissingLeadTimeColumns(error)) throw new Error(LEAD_TIME_MIGRATION_ERROR);
          throw error;
        }
        if (!leadTime?.value || !leadTime.unit) {
          throw new Error("This made-to-order product needs a lead time before it can be published. Edit it and add one.");
        }
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

type DashboardProductRow = Pick<typeof product.$inferSelect,
  | "id" | "name" | "sku" | "status" | "category" | "type" | "vendorName" | "tags"
  | "retailMin" | "retailMax" | "wholesaleMin" | "wholesaleMax" | "costPerItem"
  | "stock" | "unit" | "coverUrl" | "gallery" | "description" | "slug"
  | "seoTitle" | "seoDescription" | "specs" | "availability" | "companyId"
  | "createdAt" | "updatedAt"
>;

function mapRow(
  p: DashboardProductRow,
  variants: VariantRow[],
  vendorUserId: string | null = null,
  companyVerified = false,
  deliveryMode: DeliveryMode | null = null,
  deliveryStates: string[] = [],
): MyProduct {
  return {
    id: p.id, name: p.name, sku: p.sku, status: (p.status as ProductStatus) ?? "active", category: p.category, type: p.type,
    vendorName: p.vendorName, tags: p.tags ?? [], retailMin: p.retailMin, retailMax: p.retailMax,
    wholesaleMin: p.wholesaleMin, wholesaleMax: p.wholesaleMax, costPerItem: p.costPerItem,
    stock: p.stock ?? 0, stockLevel: stockLevel(p.stock ?? 0), unit: p.unit,
    images: [p.coverUrl, ...(p.gallery ?? [])].filter(Boolean) as string[],
    description: p.description, slug: p.slug, seoTitle: p.seoTitle, seoDescription: p.seoDescription,
    specs: p.specs ?? [],
    variants,
    deliveryMode,
    deliveryStates,
    availability: p.availability, companyId: p.companyId, vendorUserId, companyVerified,
    createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
  };
}

type ProductDelivery = { mode: DeliveryMode | null; states: string[] };

async function getProductDeliveryMap(ids: string[]): Promise<Map<string, ProductDelivery>> {
  if (!ids.length) return new Map();
  try {
    const rows = await db.select({
      id: product.id, mode: product.deliveryMode, states: product.deliveryStates,
    }).from(product).where(inArray(product.id, ids));
    return new Map(rows.map((row) => [row.id, {
      mode: isDeliveryMode(row.mode) ? row.mode : null,
      states: row.states ?? [],
    }]));
  } catch {
    // Before migration 0066 existing products have no delivery information.
    return new Map();
  }
}

/** The signed-in exhibitor's catalog. Resilient: returns [] pre-migration. */
export async function getMyProducts(): Promise<MyProduct[]> {
  try {
    const uid = await requireUserId();
    const [c] = await db.select({ id: company.id }).from(company).where(eq(company.ownerUserId, uid)).limit(1);
    if (!c) return [];
    // Avoid SELECT *: older production databases may not have the optional
    // lead-time columns, which are not needed to render the exhibitor catalog.
    const rows = await db.select({
      id: product.id, name: product.name, sku: product.sku, status: product.status,
      category: product.category, type: product.type, vendorName: product.vendorName,
      tags: product.tags, retailMin: product.retailMin, retailMax: product.retailMax,
      wholesaleMin: product.wholesaleMin, wholesaleMax: product.wholesaleMax,
      costPerItem: product.costPerItem, stock: product.stock, unit: product.unit,
      coverUrl: product.coverUrl, gallery: product.gallery, description: product.description,
      slug: product.slug, seoTitle: product.seoTitle, seoDescription: product.seoDescription,
      specs: product.specs, availability: product.availability, companyId: product.companyId,
      createdAt: product.createdAt, updatedAt: product.updatedAt,
    }).from(product).where(eq(product.companyId, c.id)).orderBy(desc(product.createdAt));
    const ids = rows.map((r) => r.id);
    const deliveries = await getProductDeliveryMap(ids);
    const vars = ids.length ? await db.select().from(productVariant).where(eq(productVariant.productId, ids[0])).orderBy(asc(productVariant.sortOrder)) : [];
    // fetch variants per product (small N) — keep simple
    const out: MyProduct[] = [];
    for (const r of rows) {
      const vs = r.id === ids[0] ? vars : await db.select().from(productVariant).where(eq(productVariant.productId, r.id)).orderBy(asc(productVariant.sortOrder));
      const delivery = deliveries.get(r.id);
      out.push(mapRow(
        r,
        vs.map((v) => ({ id: v.id, name: v.name, spec: v.spec, price: v.price, stock: v.stock ?? 0, sku: v.sku, active: v.active ?? true })),
        null,
        false,
        delivery?.mode ?? null,
        delivery?.states ?? [],
      ));
    }
    return out;
  } catch {
    return [];
  }
}

/** A single product (owner edit or buyer view). Resilient. */
export async function getProductById(id: string): Promise<MyProduct | null> {
  try {
    const [p] = await db.select({
      id: product.id, name: product.name, sku: product.sku, status: product.status,
      category: product.category, type: product.type, vendorName: product.vendorName,
      tags: product.tags, retailMin: product.retailMin, retailMax: product.retailMax,
      wholesaleMin: product.wholesaleMin, wholesaleMax: product.wholesaleMax,
      costPerItem: product.costPerItem, stock: product.stock, unit: product.unit,
      coverUrl: product.coverUrl, gallery: product.gallery, description: product.description,
      slug: product.slug, seoTitle: product.seoTitle, seoDescription: product.seoDescription,
      specs: product.specs, availability: product.availability, companyId: product.companyId,
      createdAt: product.createdAt, updatedAt: product.updatedAt,
    }).from(product).where(eq(product.id, id)).limit(1);
    if (!p) return null;
    const vs = await db.select().from(productVariant).where(eq(productVariant.productId, id)).orderBy(asc(productVariant.sortOrder));
    const [co] = await db.select({ ownerUserId: company.ownerUserId, verified: company.verified }).from(company).where(eq(company.id, p.companyId)).limit(1);
    const delivery = (await getProductDeliveryMap([id])).get(id);
    return mapRow(
      p,
      vs.map((v) => ({ id: v.id, name: v.name, spec: v.spec, price: v.price, stock: v.stock ?? 0, sku: v.sku, active: v.active ?? true })),
      co?.ownerUserId ?? null,
      co?.verified ?? false,
      delivery?.mode ?? null,
      delivery?.states ?? [],
    );
  } catch {
    return null;
  }
}
