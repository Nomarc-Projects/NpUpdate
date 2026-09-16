import { CompaniesDirectory } from "@/components/dashboard/directory/companies-directory";
import { getCompaniesForDirectory } from "@/lib/services/company";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

export default async function CompaniesPage() {
  const companies = await getCompaniesForDirectory();
  return (
    <FeatureGate requires="basicProfile">
      <div className="px-6 py-6 md:px-8">
        <div className="mb-5">
          <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">Companies</h1>
          <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Discover and connect with construction companies, agencies, and suppliers.</p>
        </div>
        <CompaniesDirectory rows={companies} />
      </div>
    </FeatureGate>
  );
}
