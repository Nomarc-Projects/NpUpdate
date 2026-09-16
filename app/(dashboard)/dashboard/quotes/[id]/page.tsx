import { notFound } from "next/navigation";
import { QuoteDetailView } from "@/components/dashboard/quote-detail-view";
import { getQuoteById } from "@/lib/services/rfq";

export const metadata = { title: "Quote Detail" };

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();
  return <QuoteDetailView quote={quote} />;
}
