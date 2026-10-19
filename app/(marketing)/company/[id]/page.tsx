import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyById, getCompanyRecommendations } from "@/lib/services/company";
import { getOnboardingChecklist } from "@/lib/services/onboarding";
import { pageMetadata } from "@/lib/og";
import { ExhibitorView } from "@/components/dashboard/buyer/exhibitor-view";

/**
 * Public exhibitor/company page — a shareable link. `getCompanyById` already
 * returns only public fields (no phone/email; those live on the auth-only
 * directory card), so a logged-out visitor sees the profile and catalog but not
 * contact details. Messaging and requesting a quote prompt for an account.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompanyById(id).catch(() => null);
  if (!company) return { title: "Company not found — Nomarc Exhibition Hub" };
  return pageMetadata({
    title: `${company.name} — Nomarc Exhibition Hub`,
    description:
      company.about ||
      company.tagline ||
      `${company.name} on the Nomarc Exhibition Hub — browse their catalog and connect.`,
    path: `/company/${id}`,
    image: company.avatarUrl,
  });
}

export default async function PublicCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompanyById(id).catch(() => null);
  if (!company) notFound();

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const signedIn = !!session?.user;

  const [recommendations, canRequestQuote] = await Promise.all([
    getCompanyRecommendations(id).catch(() => []),
    signedIn
      ? getOnboardingChecklist()
          .then((c) => c.items.find((i) => i.key === (c.role === "buyer" ? "profile" : "headline"))?.done ?? false)
          .catch(() => true)
      : Promise.resolve(true),
  ]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <div className="max-w-[1100px] mx-auto">
        <ExhibitorView
          company={company}
          recommendations={recommendations}
          canRequestQuote={canRequestQuote}
          signedIn={signedIn}
          signInHref={`/signup?redirect=/company/${id}`}
          productsBasePath="/exhibition-hub"
          messagesHref="/dashboard/messages"
          backHref="/exhibition-hub"
        />
      </div>
    </div>
  );
}
