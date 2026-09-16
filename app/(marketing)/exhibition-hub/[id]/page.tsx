import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getBrowseProductById, getProductsForBrowse, type ProductCard } from "@/lib/services/catalog";
import { pickRelated } from "@/lib/product-adapter";
import type { CatalogProduct } from "@/lib/sample-catalog";
import { ProductView } from "@/components/dashboard/buyer/product-view";

/** Real published product only — the hub markets real listings, not samples. */
async function loadProduct(id: string): Promise<CatalogProduct | null> {
  try { return await getBrowseProductById(id); } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await loadProduct(id);
  if (!p) return { title: "Product — Nomarc Exhibition Hub" };
  return {
    title: `${p.name} — Nomarc Exhibition Hub`,
    description: (p.description || `${p.name} from ${p.vendor} on the Nomarc Exhibition Hub.`).slice(0, 160),
  };
}

export default async function HubProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await loadProduct(id);
  if (!product) notFound();

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const signedIn = !!session?.user;

  let all: ProductCard[] = [];
  try { all = await getProductsForBrowse(); } catch { all = []; }
  const related = pickRelated(all, id, product.tags);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <div className="max-w-[1100px] mx-auto">
        <ProductView
          product={product}
          signedIn={signedIn}
          signInHref={`/signup?redirect=/exhibition-hub/${id}`}
          hrefBase="/exhibition-hub"
          ordersHref="/dashboard/my-orders"
          sellerHref="/exhibition-hub"
          messagesHref="/dashboard/messages"
          related={related}
          relatedHrefBase="/exhibition-hub"
        />
      </div>
    </div>
  );
}
