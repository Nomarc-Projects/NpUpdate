import { FeatureGatePage } from "@/components/dashboard/feature-gate-page";

export default function IndustryReportPage() {
  return (
    <FeatureGatePage config={{
      cap: "monthlyReport",
      name: "Monthly Industry Report",
      tagline: "Data-driven insights on the Nigerian construction market",
      description: "A monthly deep-dive into platform data, market trends, material price movements, hiring patterns, and sector intelligence — compiled for construction professionals.",
      iconName: "barChart3",
      requiredPlan: "plus",
      points: [
        { title: "Hiring trends", desc: "Which specialisations are in demand, average rates, and where jobs are concentrated." },
        { title: "Material price index", desc: "Month-on-month price movements for cement, steel, timber, and 40+ materials." },
        { title: "Platform analytics", desc: "Top-viewed professionals, most-quoted products, and active project categories." },
        { title: "Sector spotlight", desc: "Deep-dive into one sector each month — residential, commercial, infrastructure, etc." },
        { title: "Regulatory updates", desc: "New codes, policy changes, and procurement rule updates from across Nigeria." },
        { title: "PDF & CSV export", desc: "Download each report as a formatted PDF or raw CSV for your own analysis." },
      ],
      comingSoonNote: "The first edition of the Monthly Industry Report will ship to all Plus+ members on launch.",
    }} />
  );
}
