import { FeatureGatePage } from "@/components/dashboard/feature-gate-page";

export default function BuildingPermitPage() {
  return (
    <FeatureGatePage config={{
      cap: "buildingPermit",
      name: "Building Permit",
      tagline: "Streamlined permit applications through the platform",
      description: "Submit and track building permit applications across Nigerian states directly from your Nomarc dashboard — pre-filled from your profile and project data.",
      iconName: "fileCheck",
      requiredPlan: "premium",
      points: [
        { title: "Multi-state support", desc: "Lagos, Abuja, Rivers, and more — state-specific forms and requirements pre-loaded." },
        { title: "Document assembly", desc: "The platform assembles your drawing set, structural calculations, and ownership documents into the correct submission format." },
        { title: "Status tracking", desc: "Real-time updates on your application status from submission through approval." },
        { title: "Approval certificate storage", desc: "Approved permits stored securely in your account for instant access." },
      ],
      comingSoonNote: "Building Permit integrations are being built with state planning authorities. Premium members get priority access when each state integration goes live.",
    }} />
  );
}
