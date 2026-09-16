import { inferAvailability, type Availability, type CatalogProduct } from "@/lib/sample-catalog";
import type { MyProduct } from "@/lib/services/products";
import type { ProductCard } from "@/lib/services/catalog";

const AVAIL_KEYS: Availability[] = ["in_stock", "made_to_order", "rentable"];

/** Adapt a DB-backed MyProduct into the presentational CatalogProduct shape the
 *  product-detail / product-view components already render. */
export function toCatalogProduct(p: MyProduct): CatalogProduct {
  return {
    vendorUserId: p.vendorUserId ?? undefined,
    vendorCompanyId: p.companyId,
    availability: (p.availability && (AVAIL_KEYS as string[]).includes(p.availability) ? p.availability as Availability : inferAvailability(p.stockLevel)),
    verified: p.companyVerified,
    id: p.id,
    name: p.name,
    sku: p.sku ?? "",
    status: p.status,
    category: p.category ?? "",
    type: p.type ?? "",
    vendor: p.vendorName ?? "",
    tags: p.tags ?? [],
    retailMin: p.retailMin ?? 0,
    retailMax: p.retailMax ?? undefined,
    wholesaleMin: p.wholesaleMin ?? 0,
    wholesaleMax: p.wholesaleMax ?? undefined,
    costPerItem: p.costPerItem ?? 0,
    stock: p.stock,
    stockLevel: p.stockLevel,
    unit: p.unit ?? "unit",
    images: p.images.length ? p.images : [],
    description: p.description ?? "",
    specs: p.specs,
    variants: p.variants.map((v) => ({
      id: v.id, name: v.name, spec: v.spec ?? undefined,
      price: v.price ?? 0, stock: v.stock, sku: v.sku ?? "", status: v.active,
    })),
    totalSales: 0,
    ordersCount: 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** "You may also like" — rank the browse list by shared tag overlap with the
 *  current product, excluding it. Pure/sync so both PDP pages (dashboard +
 *  Exhibition Hub) can reuse it against whatever list (real or sample) they
 *  already loaded. */
export function pickRelated(all: ProductCard[], excludeId: string, tags: string[], limit = 8): ProductCard[] {
  return all
    .filter((p) => p.id !== excludeId)
    .map((p) => ({ p, score: p.tags.reduce((n, t) => n + (tags.includes(t) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.p);
}
