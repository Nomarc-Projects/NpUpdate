"use client";

import { ProductForm } from "@/components/dashboard/exhibitor/product-form";
import type { ExhibitorLimitSummary } from "@/lib/services/exhibitor-trial-rules";

export function AddProductForm({ allowedCategories = [], limits = null }: {
  allowedCategories?: string[];
  limits?: ExhibitorLimitSummary | null;
}) {
  return <ProductForm mode="create" allowedCategories={allowedCategories} limits={limits} />;
}
