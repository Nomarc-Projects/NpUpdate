import { getCompaniesForDirectory } from "@/lib/services/company";
import type { ProductCard } from "@/lib/services/catalog";
import { getOnboardingChecklist } from "@/lib/services/onboarding";

/**
 * Resolves each product card's exhibitor (company) id by matching its
 * supplier/vendor name against the public company directory — a page-level
 * composition that lets the Exhibition Hub's "View exhibitor" links work
 * without changing `getProductsForBrowse` / `getProductById`'s return shape
 * in lib/services/catalog.ts or products.ts (out of scope to modify).
 */
export async function enrichWithExhibitorIds<T extends ProductCard>(items: T[]): Promise<(T & { exhibitorId?: string })[]> {
  if (items.length === 0) return items;
  const companies = await getCompaniesForDirectory().catch(() => []);
  const byName = new Map(companies.map((c) => [c.name.trim().toLowerCase(), c.id]));
  return items.map((p) => ({ ...p, exhibitorId: byName.get(p.supplier.trim().toLowerCase()) }));
}

export async function resolveExhibitorId(vendorName: string): Promise<string | undefined> {
  if (!vendorName.trim()) return undefined;
  const companies = await getCompaniesForDirectory().catch(() => []);
  return companies.find((c) => c.name.trim().toLowerCase() === vendorName.trim().toLowerCase())?.id;
}

/** Same basicProfile-completeness signal `FeatureGate requires="basicProfile"`
 *  uses, resolved once server-side so client components can gate the
 *  Request-a-Quote modal inline (image 45) instead of blocking the whole page. */
export async function getCanRequestQuote(): Promise<boolean> {
  try {
    const checklist = await getOnboardingChecklist();
    const key = checklist.role === "buyer" ? "profile" : "headline";
    return checklist.items.find((i) => i.key === key)?.done ?? false;
  } catch {
    return true;
  }
}
