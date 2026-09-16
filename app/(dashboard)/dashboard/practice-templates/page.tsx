import { PracticeTemplates } from "@/components/dashboard/practice-templates";
import { listTemplates } from "@/lib/services/templates";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { FeatureLockedScreen } from "@/components/dashboard/feature-gate-page";

export const metadata = { title: "Business Templates" };

export default async function PracticeTemplatesPage() {
  // Plan gate: Business Templates requires the Plus plan.
  const viewer = await getViewer();
  if (!can(viewer, "practiceTemplates")) {
    return <FeatureLockedScreen config={{
      cap: "practiceTemplates",
      name: "Business Templates",
      tagline: "Ready-to-use contracts, BOQs, programmes and reports",
      description: "A curated library of construction business documents — preview, download, and import straight into your projects.",
      iconName: "folderOpen",
      requiredPlan: "plus",
      points: [
        { title: "Curated library", desc: "Contracts, BOQs, programmes, RAMS and report templates built for practice." },
        { title: "Preview before use", desc: "Open any template to preview before you download or import." },
        { title: "Import to project", desc: "Turn a template into a live project workspace in one click." },
        { title: "Always up to date", desc: "New templates added regularly for Plus members." },
      ],
    }} />;
  }

  const items = await listTemplates();
  return <PracticeTemplates dbItems={items} />;
}
