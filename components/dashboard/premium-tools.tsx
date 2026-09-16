"use client";

import Link from "next/link";
import { KanbanSquare, FileText, Sparkles, BarChart3, BadgeCheck, Trophy, ShieldCheck, FileCheck, Boxes, Lock, type LucideIcon } from "lucide-react";
import { useViewer } from "@/lib/use-viewer";
import { evaluate, requirementLabel, type Capability } from "@/lib/entitlements";

const TOOLS: { cap: Capability; name: string; desc: string; icon: LucideIcon; href: string }[] = [
  { cap: "projectManagement",   name: "Project Management",       desc: "Boards, timelines & tasks — Asana-style.",         icon: KanbanSquare, href: "/dashboard/project-management" },
  { cap: "practiceTemplates",   name: "Professional Practice Templates", desc: "300+ construction templates to download.",   icon: FileText,     href: "/dashboard/practice-templates" },
  { cap: "aiConsultant",        name: "AI Consultant",            desc: "A trained construction advisor with memory.",      icon: Sparkles,     href: "/dashboard/ai-consultant" },
  { cap: "monthlyReport",       name: "Monthly Industry Report",  desc: "Market insights across the platform.",             icon: BarChart3,    href: "/dashboard/industry-report" },
  { cap: "verifiedProfessionals", name: "Verified Professionals", desc: "Access vetted, verified talent.",                  icon: BadgeCheck,   href: "/dashboard/verified-pros" },
  { cap: "competitions",        name: "Bids & Competitions",      desc: "Bid on jobs and rank higher.",                     icon: Trophy,       href: "/dashboard/competitions" },
  { cap: "digitalSeal",         name: "Digital Seal",             desc: "Nomarc-issued credibility seal.",                  icon: ShieldCheck,  href: "/dashboard/digital-seal" },
  { cap: "buildingPermit",      name: "Building Permit",          desc: "Streamlined permit applications.",                 icon: FileCheck,    href: "/dashboard/building-permit" },
  { cap: "bimTools",            name: "BIM Tools",                desc: "Plan, model and review buildings.",                icon: Boxes,        href: "/dashboard/bim-tools" },
];

export function PremiumTools() {
  const viewer = useViewer();
  const tiles = TOOLS.map((t) => ({ ...t, access: evaluate(viewer, t.cap) })).filter((t) => t.access.state !== "hidden");
  if (tiles.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-[#1e1e1e] dark:text-white">Premium tools</h2>
          <p className="text-[13px] text-[#9a9a9a]">Unlock more as you upgrade. These features are rolling out soon.</p>
        </div>
        <Link href="/dashboard/plans" className="text-[13px] font-semibold text-[#caa400] hover:underline">View plans →</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => {
          const locked = t.access.state === "locked";
          const Icon = t.icon;
          return (
            <Link
              key={t.cap}
              href={t.href}
              className={`relative rounded-2xl border p-5 transition-all group hover:-translate-y-0.5 hover:shadow-sm ${
                locked
                  ? "border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] hover:border-[#ffd716]/60"
                  : "border-[#ffd716]/40 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] hover:border-[#ffd716]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${locked ? "bg-[#f5f5f5] dark:bg-white/5 text-[#9a9a9a]" : "bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#caa400]"}`}>
                  <Icon size={18} />
                </div>
                {locked
                  ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8a7400] bg-[#ffd716]/20 px-2 py-0.5 rounded-full"><Lock size={11} /> {requirementLabel(t.access.requires)}</span>
                  : <span className="text-[11px] font-semibold text-[#16803c] bg-[#dcfce7] px-2 py-0.5 rounded-full">Included · soon</span>}
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#1e1e1e] dark:text-white group-hover:text-[#1e1e1e] dark:group-hover:text-white">{t.name}</h3>
              <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed">{t.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
