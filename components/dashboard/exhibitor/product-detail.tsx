"use client";

import { ProductForm } from "@/components/dashboard/exhibitor/product-form";
import type { ProductForEdit } from "@/lib/services/products";
import type { ExhibitorLimitSummary } from "@/lib/services/exhibitor-trial-rules";

export function ProductEditScreen({ product, limits = null }: { product: ProductForEdit; limits?: ExhibitorLimitSummary | null }) {
  return <ProductForm mode="edit" product={product} allowedCategories={product.categories} limits={limits} />;
}
