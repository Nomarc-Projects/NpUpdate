"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { CompanyProfileForm } from "@/app/(marketing)/company/company-profile-form";
import { CredentialsContent } from "@/app/(marketing)/company/credentials/credentials-content";
import type { CompanyData, CompanyCert } from "@/lib/services/company";

const TABS = [
  { key: "profile", label: "Company Profile", title: "Company Profile", sub: "Update your identity info and public-facing company bio." },
  { key: "credentials", label: "Company Details & Credentials", title: "Company Details & Credentials", sub: "Highlight your company history, operational scale, and industry certifications" },
] as const;
type Key = (typeof TABS)[number]["key"];

/** Company section as client-side tabs — instant switch, preserved state, no reload. */
export function CompanyTabs({ initial = "profile", company, certifications = [] }: { initial?: Key; company?: CompanyData; certifications?: CompanyCert[] }) {
  const [tab, setTab] = useState<Key>(initial);
  const active = TABS.find((t) => t.key === tab)!;
  const displayName = company?.name || "Your company";

  const select = (k: Key) => {
    setTab(k);
    window.history.replaceState(null, "", k === "profile" ? "/dashboard/company" : `/dashboard/company?tab=${k}`);
  };

  return (
    <div className="min-h-full bg-white dark:bg-[#161616]">
      <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-24">
        <div className="flex items-center gap-4">
          {company?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.avatarUrl} alt={displayName} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#d4d4d4] to-[#9a9a9a] dark:from-white/20 dark:to-white/5" aria-hidden />
          )}
          <div>
            <h1 className="text-2xl md:text-[28px] font-bold leading-tight flex items-center gap-2 flex-wrap">
              <span><span className="text-[#9a9a9a]">{displayName}</span>{" "}<span className="text-[#1e1e1e] dark:text-white">/ {active.title}</span></span>
              {company?.verified && <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] text-[#0369a1] text-[11px] font-semibold px-2 py-0.5"><BadgeCheck size={13} /> Verified</span>}
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-0.5">{active.sub}</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-[230px_1fr] gap-10">
          <nav className="flex md:flex-col gap-4 md:gap-3" aria-label="Company sections">
            {TABS.map((t) => (
              <button key={t.key} type="button" onClick={() => select(t.key)} aria-current={t.key === tab ? "page" : undefined}
                className={t.key === tab ? "text-left text-sm font-semibold text-[#1e1e1e] dark:text-white" : "text-left text-sm text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="min-w-0">
            <div className={tab === "profile" ? "" : "hidden"}><CompanyProfileForm initial={company} /></div>
            <div className={tab === "credentials" ? "" : "hidden"}><CredentialsContent initial={company} certifications={certifications} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function CompanyTabsSkeleton() {
  const S = ({ cls = "" }: { cls?: string }) => <div className={`skeleton rounded-md ${cls}`} />;
  return (
    <div className="min-h-full bg-white dark:bg-[#161616]">
      <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-24">
        <div className="flex items-center gap-4">
          <S cls="w-14 h-14 rounded-full flex-shrink-0" />
          <div className="space-y-1.5"><S cls="h-7 w-52" /><S cls="h-3.5 w-40" /></div>
        </div>
        <div className="mt-8 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5"><S cls="h-4 w-44" /><S cls="h-3 w-64 max-w-full" /></div>
            <S cls="h-9 w-32 rounded-lg flex-shrink-0" />
          </div>
          <S cls="mt-3 h-1.5 w-full rounded-full" />
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10">
          <div className="space-y-1 rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-3 border-b border-[#f0f0f0] dark:border-white/5 last:border-0">
                <S cls="w-4 h-4 rounded flex-shrink-0" /><S cls="h-3.5 w-24" />
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, s) => (
              <div key={s} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-4">
                <S cls="h-4 w-28" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2"><S cls="h-3 w-24" /><S cls="h-10 w-full rounded-xl" /></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
