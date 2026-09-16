import type { Metadata } from "next";
import { CompareView } from "@/components/exhibition-hub/compare-view";

export const metadata: Metadata = {
  title: "Compare products — Nomarc Exhibition Hub",
  description: "Compare construction materials and equipment side by side — price, supplier, availability and unit of sale.",
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <CompareView />
    </div>
  );
}
