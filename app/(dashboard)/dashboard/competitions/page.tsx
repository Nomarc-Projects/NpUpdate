import { FeatureGatePage } from "@/components/dashboard/feature-gate-page";

export default function CompetitionsPage() {
  return (
    <FeatureGatePage config={{
      cap: "competitions",
      name: "Bids & Competitions",
      tagline: "Bid on projects and rank your applications higher",
      description: "Use credits to boost the visibility of your proposals, enter design competitions, and participate in competitive tenders posted exclusively for Pro members.",
      iconName: "trophy",
      requiredPlan: "pro",
      points: [
        { title: "Bid credits", desc: "Monthly credit allocation you can spend to rank your applications above free-tier applicants." },
        { title: "Design competitions", desc: "Enter curated design and innovation challenges with real prizes and visibility." },
        { title: "Exclusive tenders", desc: "Access competitive tenders posted only to Pro and Premium members." },
        { title: "Application analytics", desc: "See how many employers viewed your application and where you rank in the shortlist." },
      ],
      comingSoonNote: "Bids & Competitions launches with the platform's first exclusive tender season. Pro members receive their first credit allocation on launch day.",
    }} />
  );
}
