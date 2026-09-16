import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getProductsForBrowse, type ProductCard } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";
import { HubBrowse } from "@/components/exhibition-hub/hub-browse";

export const metadata: Metadata = {
  title: "Exhibition Hub — Nomarc Projects",
  description:
    "Browse verified construction materials, equipment and products from suppliers across Nigeria. Request a quote or order directly on Nomarc's Exhibition Hub.",
  openGraph: {
    title: "Exhibition Hub — Nomarc Projects",
    description: "Discover verified construction products and suppliers across Nigeria.",
    url: "https://www.nomarcprojects.com/exhibition-hub",
    siteName: "Nomarc Projects",
    type: "website",
  },
};

export default async function ExhibitionHubPage() {
  let items: ProductCard[] = [];
  try {
    items = await getProductsForBrowse();
  } catch {
    items = [];
  }

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const signedIn = !!session?.user;
  const initialSaved = signedIn ? await getSavedIds("product").catch(() => []) : [];

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <HubBrowse products={items} signedIn={signedIn} initialSaved={initialSaved} />
    </div>
  );
}
