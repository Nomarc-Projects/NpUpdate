import { notFound } from "next/navigation";
import { getCompanyById } from "@/lib/services/company";
import { CompanyDetailView } from "@/components/dashboard/company-detail";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) notFound();
  return <CompanyDetailView company={company} />;
}
