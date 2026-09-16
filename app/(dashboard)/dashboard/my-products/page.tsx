import { ProductsManager } from "@/components/dashboard/exhibitor/products-manager";
import { ExhibitorGate } from "@/components/dashboard/onboarding/exhibitor-gate";
import { getMyProducts } from "@/lib/services/products";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export const metadata = { title: "Products" };

export default async function MyProductsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "exhibitorDashboard")) {
    return (
      <ExhibitorGate
        title="Become an Exhibitor to list products"
        description="Add your company name and primary industry to open your showroom — takes less than a minute."
      />
    );
  }
  const products = await getMyProducts();
  return <ProductsManager products={products} />;
}
