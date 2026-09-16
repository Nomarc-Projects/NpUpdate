import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCheckoutSummary } from "@/lib/services/checkout";
import { ThankYou } from "@/components/exhibition-hub/thank-you";

export const metadata: Metadata = { title: "Order confirmed — Nomarc Exhibition Hub" };

export default async function CheckoutThankYouPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  if (!ref) redirect("/exhibition-hub");

  const summary = await getCheckoutSummary(ref);
  if (!summary) redirect("/exhibition-hub");

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <ThankYou orders={summary.orders} reference={summary.reference} />
    </div>
  );
}
