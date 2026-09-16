"use client";

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { SlideOverDrawer } from "@/components/dashboard/kit";

const LISTING_REQUIREMENTS = [
  { title: "Use Clear Job Titles", body: "Titles should reflect the actual role — no internal codenames or unrelated keywords stuffed in for search." },
  { title: "Be Transparent About Pay", body: "Include a realistic salary range in Naira wherever possible. Listings marked \"Not disclosed\" rank lower in search." },
  { title: "Define the Work Model", body: "Clearly state On-site, Hybrid, or Remote so candidates can self-filter." },
  { title: "Provide Detailed Descriptions", body: "A complete role summary and requirements list gets more qualified applicants and fewer irrelevant ones." },
];

const PROHIBITED = [
  { title: "Discriminatory Language", body: "No requirements based on age, gender, tribe, religion, or other protected characteristics." },
  { title: "Misrepresentation", body: "The role, company, and compensation must be accurately described." },
  { title: "Exploitative Labour", body: "Listings offering no pay, unpaid \"trial periods,\" or below minimum wage are not permitted." },
  { title: "Spam / MLMs", body: "Multi-level-marketing or commission-only \"opportunities\" disguised as employment are not permitted." },
  { title: "Application Fees", body: "You may never charge a candidate to apply, interview, or receive an offer." },
];

/**
 * "Platform Posting Guidelines" slide-over (image 108) — long-form policy
 * content shown over the Posted Jobs list. Static copy; no service behind it.
 */
export function PostingGuidelinesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SlideOverDrawer open={open} onClose={onClose} title="Platform Posting Guidelines" subtitle="What every job listing on Nomarc must meet">
      <section>
        <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">
          <CheckCircle2 size={15} className="text-[#1a7f43]" /> Listing Requirements
        </h3>
        <ul className="mt-3 space-y-4">
          {LISTING_REQUIREMENTS.map((r) => (
            <li key={r.title}>
              <p className="text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white">{r.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{r.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">
          <XCircle size={15} className="text-[#c53434]" /> Prohibited Content
        </h3>
        <ul className="mt-3 space-y-4">
          {PROHIBITED.map((r) => (
            <li key={r.title}>
              <p className="text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white">{r.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{r.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl bg-[#f7f7f7] p-4 dark:bg-white/[0.04]">
        <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#1e1e1e] dark:text-white">
          <AlertTriangle size={15} className="text-[#b7791f]" /> Platform Enforcement
        </h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
          Listings that violate these guidelines are removed, and repeat or severe violations can lead to a suspension of your employer account. If you believe a listing was removed in error, contact support.
        </p>
      </section>
    </SlideOverDrawer>
  );
}
