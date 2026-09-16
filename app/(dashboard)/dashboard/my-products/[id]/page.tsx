import { notFound } from "next/navigation";
import { getProductById } from "@/lib/services/products";
import { toCatalogProduct } from "@/lib/product-adapter";
import { ProductDetail } from "@/components/dashboard/exhibitor/product-detail";

export default async function MyProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const real = await getProductById(id);
  const product = real ? toCatalogProduct(real) : null;
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
