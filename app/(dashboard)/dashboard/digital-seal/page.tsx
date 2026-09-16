import { FeatureGatePage } from "@/components/dashboard/feature-gate-page";

export default function DigitalSealPage() {
  return (
    <FeatureGatePage config={{
      cap: "digitalSeal",
      name: "Digital Seal",
      tagline: "The Nomarc mark of verified credibility",
      description: "A Nomarc-issued digital credibility seal that appears on your public profile, proposals, and exports — signalling to employers and clients that your credentials have been independently verified.",
      iconName: "shieldCheck",
      requiredPlan: "premium",
      points: [
        { title: "Admin-verified badge", desc: "Our team reviews your professional body membership, practice history, and submitted documents before issuing the seal." },
        { title: "Profile display", desc: "The seal appears prominently on your public profile and in search results." },
        { title: "Proposal attachment", desc: "Automatically appended to job proposals and exported documents." },
        { title: "Verification certificate", desc: "A downloadable PDF certificate confirming your verified status and the scope of verification." },
      ],
      comingSoonNote: "The Digital Seal requires our verification review workflow. Premium members can submit for verification as soon as the review system goes live.",
    }} />
  );
}
