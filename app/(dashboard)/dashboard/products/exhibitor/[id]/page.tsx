import { notFound } from "next/navigation";
import { getCompanyById, getCompanyRecommendations } from "@/lib/services/company";
import { getOnboardingChecklist } from "@/lib/services/onboarding";
import { isSellerActive } from "@/lib/services/seller-availability";
import { ExhibitorView } from "@/components/dashboard/buyer/exhibitor-view";

export default async function ExhibitorViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) notFound();

  const [recommendations, canRequestQuote, sellerActive] = await Promise.all([
    getCompanyRecommendations(id),
    getOnboardingChecklist()
      .then((c) => c.items.find((i) => i.key === (c.role === "buyer" ? "profile" : "headline"))?.done ?? false)
      .catch(() => true),
    company.ownerUserId ? isSellerActive(company.ownerUserId).catch(() => true) : Promise.resolve(true),
  ] as const);

  return <ExhibitorView company={company} recommendations={recommendations} canRequestQuote={canRequestQuote} sellerActive={sellerActive} />;
}
