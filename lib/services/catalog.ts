"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { job, product, productVariant, company } from "@/lib/db/schema";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import type { CatalogProduct } from "@/lib/sample-catalog";

/**
 * Jobs are a professional-only surface. These exports live in a `"use server"`
 * module, so a page redirect alone is not enough: the functions themselves are
 * callable as server actions. Reject callers who haven't completed the
 * professional profile before touching job data.
 */
async function requireJobBoard(): Promise<void> {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) throw new Error("Forbidden — a professional profile is required");
}

export type JobCard = { id: string; title: string; company: string; location: string; desc: string; tags: string[]; salary: string; time: string; ownerUserId: string; recruiterName: string };
export type AvailabilityKey = "in_stock" | "made_to_order" | "rentable";
export type ProductCard = {
  id: string; name: string; supplier: string; location: string; avail: string; tags: string[]; img: string;
  /** The selling COMPANY's Nomarc verification (company.verified) — never a
   *  product-level check. Only meaningful alongside `vendorCompanyId`: without a
   *  company record there is no verification to report. */
  verified: boolean;
  price: number;
  /** Only set when the supplier actually recorded an availability. Absent means
   *  unknown — the storefront's "In stock now" rail must not claim it. */
  availabilityKey?: AvailabilityKey;
  /** The exhibitor-chosen taxonomy category (product.category) — the hub matches
   *  its category rails on this before falling back to tag text. */
  category?: string;
  /** For cart attribution (multi-vendor checkout split) — the exhibitor's company id + unit of sale. */
  vendorCompanyId?: string; unit?: string;
  /** True when the product has at least one variant — quick-view is bypassed for
   *  these (variant selection needs the full PDP). Undefined = unknown. */
  hasVariants?: boolean;
  /** ISO timestamp — powers the "Recently added" storefront rail. */
  createdAt?: string;
};

const naira = (n: number) => `₦${(n / 1000).toLocaleString()}k`;
function ago(d: Date | string) {
  const t = typeof d === "string" ? new Date(d) : d;
  const days = Math.floor((Date.now() - t.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
const AVAIL: Record<string, string> = { in_stock: "In Stock", made_to_order: "Made to Order", rentable: "Available for Rent" };
/** Rows carrying no availability (legacy/imported listings — the exhibitor form
 *  always writes one) stay unknown rather than defaulting to "in stock": a
 *  buyer reading "Ready to ship" off a blank column is being told something the
 *  supplier never said. */
const AVAIL_KEY = (a: string | null): AvailabilityKey | undefined =>
  a === "in_stock" || a === "made_to_order" || a === "rentable" ? a : undefined;
const UNKNOWN_AVAIL = "Availability on request";

/** Open, published jobs for the browse list (newest first). */
export async function getJobsForBrowse(): Promise<JobCard[]> {
  await requireJobBoard();
  const rows = await db.select().from(job).where(and(eq(job.status, "open"), eq(job.draft, false))).orderBy(desc(job.createdAt));
  return rows.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company ?? "",
    location: j.location ?? "",
    desc: j.description ?? "",
    tags: [j.employmentType, j.experienceLevel, j.workModel].filter(Boolean) as string[],
    salary: j.salaryMin != null && j.salaryMax != null ? `${naira(j.salaryMin)} – ${naira(j.salaryMax)} /m` : "",
    time: ago(j.createdAt),
    ownerUserId: j.ownerUserId,
    recruiterName: j.recruiterName ?? "",
  }));
}

/** A single job (for the apply page header). */
/** `job.id` is a uuid column, and comparing it to a malformed literal makes
 *  CockroachDB raise "invalid input syntax for type uuid" rather than returning
 *  no rows. That threw straight out of the /dashboard/jobs/apply server component
 *  and crashed the page, when the right answer is "no such job". */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getJobById(id: string): Promise<JobCard | null> {
  await requireJobBoard();
  if (!UUID_RE.test(id.trim())) return null;
  const rows = await db.select().from(job).where(eq(job.id, id)).limit(1);
  const j = rows[0];
  if (!j) return null;
  return {
    id: j.id,
    title: j.title,
    company: j.company ?? "",
    location: j.location ?? "",
    desc: j.description ?? "",
    tags: [j.employmentType, j.experienceLevel, j.workModel].filter(Boolean) as string[],
    salary: j.salaryMin != null && j.salaryMax != null ? `${naira(j.salaryMin)} – ${naira(j.salaryMax)} /m` : "",
    time: ago(j.createdAt),
    ownerUserId: j.ownerUserId,
    recruiterName: j.recruiterName ?? "",
  };
}

/** Published products joined with their company (supplier + location). */
export async function getProductsForBrowse(): Promise<ProductCard[]> {
  const rows = await db
    .select({ p: product, coName: company.name, coLoc: company.headquarters, coVerified: company.verified })
    .from(product)
    .innerJoin(company, eq(product.companyId, company.id))
    .where(eq(product.draft, false))
    .orderBy(desc(company.verified), desc(product.createdAt));

  // Which of these products carry variants? One grouped read beats N per-card
  // lookups; resilient (→ empty set) so the browse never breaks on this.
  let variantOf = new Set<string>();
  try {
    const vRows = await db
      .select({ productId: productVariant.productId })
      .from(productVariant)
      .groupBy(productVariant.productId);
    variantOf = new Set(vRows.map((v) => v.productId));
  } catch { variantOf = new Set(); }

  return rows.map(({ p, coName, coLoc, coVerified }) => {
    const availabilityKey = AVAIL_KEY(p.availability);
    return {
      id: p.id,
      name: p.name,
      supplier: coName,
      location: coLoc ?? "",
      avail: availabilityKey ? AVAIL[availabilityKey] : UNKNOWN_AVAIL,
      availabilityKey,
      tags: p.tags ?? [],
      img: p.coverUrl ?? "",
      verified: coVerified ?? false,
      price: p.retailMin ?? 0,
      category: p.category ?? undefined,
      vendorCompanyId: p.companyId,
      unit: p.unit ?? "unit",
      hasVariants: variantOf.has(p.id),
      createdAt: new Date(p.createdAt).toISOString(),
    };
  });
}

/** Public single product (for the Exhibition Hub PDP) → the presentational
 *  CatalogProduct shape the ProductView renders. Published products only. */
export async function getBrowseProductById(id: string): Promise<CatalogProduct | null> {
  const rows = await db
    .select({ p: product, coName: company.name, coOwnerUserId: company.ownerUserId, coVerified: company.verified })
    .from(product)
    .innerJoin(company, eq(product.companyId, company.id))
    .where(and(eq(product.id, id), eq(product.draft, false)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const { p, coName, coOwnerUserId, coVerified } = row;
  const vs = await db.select().from(productVariant).where(eq(productVariant.productId, id)).orderBy(asc(productVariant.sortOrder));
  const images = [p.coverUrl, ...(p.gallery ?? [])].filter(Boolean) as string[];
  const stock = p.stock ?? 0;
  const stockLevel: "high" | "low" | "out" = stock <= 0 ? "out" : stock < 10 ? "low" : "high";
  return {
    id: p.id,
    name: p.name,
    sku: p.sku ?? "",
    status: (p.status as "active" | "draft" | "archived") ?? "active",
    category: p.category ?? "",
    type: p.type ?? "",
    vendor: p.vendorName || coName || "",
    tags: p.tags ?? [],
    retailMin: p.retailMin ?? 0,
    retailMax: p.retailMax ?? undefined,
    wholesaleMin: p.wholesaleMin ?? 0,
    wholesaleMax: p.wholesaleMax ?? undefined,
    costPerItem: p.costPerItem ?? 0,
    stock,
    stockLevel,
    unit: p.unit ?? "unit",
    images,
    description: p.description ?? "",
    availability: AVAIL_KEY(p.availability),
    verified: coVerified ?? false,
    vendorUserId: coOwnerUserId ?? undefined,
    vendorCompanyId: p.companyId,
    specs: p.specs ?? [],
    variants: vs.map((v) => ({ id: v.id, name: v.name, spec: v.spec ?? undefined, price: v.price ?? 0, stock: v.stock ?? 0, sku: v.sku ?? "", status: v.active ?? true })),
    totalSales: 0,
    ordersCount: 0,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}
