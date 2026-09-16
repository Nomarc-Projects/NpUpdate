import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ToolsHero } from "./tools-hero";
import { ToolsGrid } from "./tools-grid";

export const metadata: Metadata = {
  title: "Tools — Nomarc Projects",
  description:
    "Everything you need to manage projects, grow your career and stay connected with the construction community.",
};

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <ToolsHero />

      {/* Interactive category groups — hover for a preview, click to get started */}
      <ToolsGrid />

      {/* CTA Banner */}
      <section className="bg-[#1e1e1e] py-20">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-[#898989] mb-8">
            Join thousands of construction professionals already using Nomarc Projects.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#ffd716] text-[#1e1e1e] font-semibold px-8 py-3 rounded-full hover:bg-[#e6c114] transition-colors"
          >
            Create your free account
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
