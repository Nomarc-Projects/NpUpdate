import { AdminProductsView } from "@/components/admin/admin-products";
import { getAdminProducts } from "@/lib/services/admin";

export const metadata = { title: "Products — Admin" };

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  return <AdminProductsView products={products} />;
}
