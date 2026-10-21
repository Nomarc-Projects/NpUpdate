import { notFound } from "next/navigation";
import { getOwnedProductForEdit } from "@/lib/services/products";
import { ProductEditScreen } from "@/components/dashboard/exhibitor/product-detail";

export default async function MyProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getOwnedProductForEdit(id);
  if (!product) notFound();
  return <ProductEditScreen product={product} />;
}
