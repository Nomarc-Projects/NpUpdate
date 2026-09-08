import { HeroSection } from "./_sections/hero";
import { TrustedByStrip } from "./_sections/trusted-by";
import { HowItWorksSection } from "./_sections/how-it-works";
import { BrowseCategorySection } from "./_sections/browse-categories";
import { InlineNewsTicker } from "@/components/ui/news-ticker";
import { InsightsSection } from "./_sections/insights";
import { FAQSection } from "./_sections/faq";
import { ContactSection } from "./_sections/contact";
import { JoinCommunitySection } from "./_sections/join-community";
import { PartnersSection } from "./_sections/partners";

// The insights strip reads real published posts, so the page can't be frozen at
// build time — but it doesn't need to be per-request either. Rebuild hourly so
// newly published articles surface without a redeploy.
export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustedByStrip />
      <HowItWorksSection />
      <BrowseCategorySection />
      <InlineNewsTicker />
      <InsightsSection />
      <FAQSection />
      <JoinCommunitySection />
      <ContactSection />
      {/* Trusted Clients — final section before the footer. */}
      <PartnersSection />
    </>
  );
}
