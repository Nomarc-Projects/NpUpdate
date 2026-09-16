import { Products } from "@/components/dashboard/professional/products";
import { getProductsForBrowse } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

export default async function SavedProductsPage() {
  const [items, saved] = await Promise.all([
    getProductsForBrowse().catch(() => []),
    getSavedIds("product").catch(() => []),
  ]);
  return (
    <FeatureGate requires="basicProfile">
      <Products saved items={items} initialSaved={saved} />
    </FeatureGate>
  );
}
