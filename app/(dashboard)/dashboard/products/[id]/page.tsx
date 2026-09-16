import { notFound } from "next/navigation";
import { getProductById } from "@/lib/services/products";
import { toCatalogProduct } from "@/lib/product-adapter";
import { getProductsForBrowse, type ProductCard } from "@/lib/services/catalog";
import { pickRelated } from "@/lib/product-adapter";
import { ProductView } from "@/components/dashboard/buyer/product-view";

export default async function BuyerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const real = await getProductById(id);
  const product = real ? toCatalogProduct(real) : null;
  if (!product) notFound();

  let all: ProductCard[] = [];
  try { all = await getProductsForBrowse(); } catch { all = []; }
  const related = pickRelated(all, id, product.tags);

  return <ProductView product={product} related={related} messagesHref="/dashboard/messages" />;
}
