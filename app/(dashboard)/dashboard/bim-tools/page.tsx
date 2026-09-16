import { FeatureGatePage } from "@/components/dashboard/feature-gate-page";

export default function BimToolsPage() {
  return (
    <FeatureGatePage config={{
      cap: "bimTools",
      name: "BIM Tools",
      tagline: "Building Information Modelling in the browser",
      description: "Plan, model, and review building designs collaboratively — browser-based BIM tools designed for the Nigerian construction market, no specialist software required.",
      iconName: "boxes",
      requiredPlan: "premium",
      points: [
        { title: "3D model viewer", desc: "View and navigate IFC and common BIM formats directly in the browser." },
        { title: "Collaborative markup", desc: "Add comments, clash notes, and RFI markers on any element in the model." },
        { title: "Quantity take-off", desc: "Auto-generate preliminary BoQs from your model geometry." },
        { title: "Version history", desc: "Track model revisions and compare changes between design iterations." },
      ],
      comingSoonNote: "BIM Tools is our most ambitious feature. Premium members will be the first to access the beta and shape how it evolves.",
    }} />
  );
}
