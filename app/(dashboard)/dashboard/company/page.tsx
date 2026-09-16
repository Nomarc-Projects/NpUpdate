import { CompanyTabs } from "@/components/profile/company-tabs";
import { getMyCompany } from "@/lib/services/company";

export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initial = tab === "credentials" ? "credentials" : "profile";
  const { data, certifications } = await getMyCompany();
  return <CompanyTabs initial={initial} company={data} certifications={certifications} />;
}
