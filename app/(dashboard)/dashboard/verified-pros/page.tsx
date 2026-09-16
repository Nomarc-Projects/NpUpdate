import { FeatureGatePage } from "@/components/dashboard/feature-gate-page";

export default function VerifiedProsPage() {
  return (
    <FeatureGatePage config={{
      cap: "verifiedProfessionals",
      name: "Verified Professionals",
      tagline: "Access the platform's top vetted talent",
      description: "A curated, admin-verified directory of the highest-rated and credential-confirmed professionals on Nomarc — filtered and ranked so you connect with the best.",
      iconName: "badgeCheck",
      requiredPlan: "pro",
      points: [
        { title: "Credential-verified talent", desc: "Every professional has had their COREN, ARCON, NIQS, or QSRBN credentials confirmed by our team." },
        { title: "Verified-first ranking", desc: "Search results prioritise verified profiles so you always see the most credible candidates first." },
        { title: "Performance scores", desc: "View completion rates, response times, and job-success scores on every profile." },
        { title: "Talent badges", desc: "Rising Talent, Top-Rated, and Elite badges help you identify standout professionals at a glance." },
      ],
      comingSoonNote: "Verified Professionals is being rolled out alongside our verification review system. Pro members get full access at launch.",
    }} />
  );
}
