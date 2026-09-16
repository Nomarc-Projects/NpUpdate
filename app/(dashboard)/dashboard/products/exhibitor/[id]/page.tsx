import { notFound } from "next/navigation";
import { getCompanyById, getCompanyRecommendations } from "@/lib/services/company";
import { getOnboardingChecklist } from "@/lib/services/onboarding";
import { ExhibitorView } from "@/components/dashboard/buyer/exhibitor-view";

export default async function ExhibitorViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) notFound();

  const [recommendations, canRequestQuote] = await Promise.all([
    getCompanyRecommendations(id),
    getOnboardingChecklist()
      .then((c) => c.items.find((i) => i.key === (c.role === "buyer" ? "profile" : "headline"))?.done ?? false)
      .catch(() => true),
  ]);

  return <ExhibitorView company={company} recommendations={recommendations} canRequestQuote={canRequestQuote} />;
}
