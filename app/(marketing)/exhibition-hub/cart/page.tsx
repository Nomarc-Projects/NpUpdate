import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CartPage } from "@/components/exhibition-hub/cart-page";

export const metadata: Metadata = { title: "Your cart — Nomarc Exhibition Hub" };

export default async function ExhibitionHubCartPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <CartPage signedIn={!!session?.user} />
    </div>
  );
}
