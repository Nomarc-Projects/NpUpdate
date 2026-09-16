import { Products } from "@/components/dashboard/professional/products";
import { getProductsForBrowse } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";
import { enrichWithExhibitorIds, getCanRequestQuote } from "./exhibitor-lookup";

export default async function ProductsPage() {
  const [items, saved] = await Promise.all([
    getProductsForBrowse().catch(() => []),
    getSavedIds("product").catch(() => []),
  ]);
  const [enriched, canRequestQuote] = await Promise.all([enrichWithExhibitorIds(items), getCanRequestQuote()]);
  return <Products items={enriched} initialSaved={saved} canRequestQuote={canRequestQuote} />;
}
