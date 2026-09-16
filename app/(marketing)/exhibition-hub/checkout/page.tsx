import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMyAddresses } from "@/lib/services/addresses";
import { CheckoutFlow } from "@/components/exhibition-hub/checkout-flow";

export const metadata: Metadata = { title: "Checkout — Nomarc Exhibition Hub" };

export default async function ExhibitionHubCheckoutPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  // Checkout requires an account (patronizing a supplier), same rule as
  // buy-now / request-quote on the PDP — guests are sent to sign up first.
  if (!session?.user) redirect("/signup?redirect=/exhibition-hub/checkout");

  const savedAddresses = await getMyAddresses().catch(() => []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <CheckoutFlow savedAddresses={savedAddresses} />
    </div>
  );
}
