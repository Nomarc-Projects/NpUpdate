import { notFound } from "next/navigation";
import { getOwnedProductForEdit } from "@/lib/services/products";
import { getExhibitorLimitSummary } from "@/lib/services/exhibitor-trial";
import { ProductEditScreen } from "@/components/dashboard/exhibitor/product-detail";

export default async function MyProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, limits] = await Promise.all([
    getOwnedProductForEdit(id),
    getExhibitorLimitSummary().catch(() => null),
  ]);
  if (!product) notFound();
  return <ProductEditScreen product={product} limits={limits} />;
}
