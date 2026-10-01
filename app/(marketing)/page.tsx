import { HeroSection } from "./_sections/hero";
import { TrustedByStrip } from "./_sections/trusted-by";
import { HowItWorksSection } from "./_sections/how-it-works";
import { BrowseCategorySection } from "./_sections/browse-categories";
import { InlineNewsTicker } from "@/components/ui/news-ticker";
import { getActiveTicker } from "@/lib/services/ticker";
import { InsightsSection } from "./_sections/insights";
import { FAQSection } from "./_sections/faq";
import { ContactSection } from "./_sections/contact";
import { JoinCommunitySection } from "./_sections/join-community";
import { PartnersSection } from "./_sections/partners";

// The insights strip reads real published posts, so the page can't be frozen at
// build time — but it doesn't need to be per-request either. Rebuild hourly so
// newly published articles surface without a redeploy.
export const revalidate = 3600;

export default async function HomePage() {
  // Read on the server so the ticker is in the HTML: it is crawlable and paints
  // on the first frame instead of after hydration. Every ticker mutation calls
  // revalidatePath("/"), so saving in the admin re-renders this page on demand
  // rather than waiting out the hourly window.
  const ticker = await getActiveTicker();

  return (
    <>
      <HeroSection />
      <TrustedByStrip />
      <HowItWorksSection />
      <BrowseCategorySection />
      <InlineNewsTicker initialItems={ticker.items} initialPxPerSecond={ticker.pxPerSecond} />
      <InsightsSection />
      <FAQSection />
      <JoinCommunitySection />
      <ContactSection />
      {/* Trusted Clients — final section before the footer. */}
      <PartnersSection />
    </>
  );
}
