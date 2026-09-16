import { notFound } from "next/navigation";
import { getTransaction } from "@/lib/services/billing";
import { getAccountInfo } from "@/lib/services/account";
import { InvoiceView } from "@/components/dashboard/invoice-view";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tx, account] = await Promise.all([getTransaction(id), getAccountInfo().catch(() => null)]);
  if (!tx) notFound();
  return <InvoiceView tx={tx} billedTo={{ name: account?.name ?? "", email: account?.email ?? "" }} />;
}
