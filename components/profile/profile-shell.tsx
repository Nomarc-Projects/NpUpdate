import Link from "next/link";
import { User, Award, GraduationCap, type LucideIcon } from "lucide-react";
import { r2Url } from "@/lib/r2-public";

const AVATAR = r2Url("site/photo-1494790108377-be9c29b29330.jpg");

const subNav: { label: string; seg: string; section: string; Icon: LucideIcon }[] = [
  { label: "Public Profile",    seg: "",                section: "public",          Icon: User },
  { label: "Qualifications",    seg: "/qualifications", section: "qualifications",  Icon: Award },
  { label: "Education History", seg: "/education",      section: "education",       Icon: GraduationCap },
];

export function ProfileShell({
  section,
  pageTitle,
  basePath = "/profile",
  children,
}: {
  section: string;
  pageTitle: string;
  basePath?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[#f7f7f8] dark:bg-[#111]">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 pt-10 pb-24">

        {/* page header */}
        <div className="flex items-center gap-3.5 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVATAR} alt="Profile" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#ffd716] ring-offset-2 ring-offset-[#f7f7f8] dark:ring-offset-[#111]" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#1e1e1e] dark:text-white leading-tight">
              Profile <span className="text-[#9a9a9a] font-normal">/ {pageTitle}</span>
            </h1>
            <p className="text-[13px] text-[#9a9a9a]">Highlight your skills and experience</p>
          </div>
        </div>

        {/* sub-nav + content */}
        <div className="mt-7 flex flex-col md:flex-row gap-6">

          {/* left nav */}
          <nav className="md:w-[200px] flex-shrink-0" aria-label="Profile sections">
            {/* mobile: horizontal scrollable */}
            <div className="md:hidden flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
              {subNav.map(({ label, seg, section: sec, Icon }) => {
                const active = sec === section;
                return (
                  <Link
                    key={sec}
                    href={`${basePath}${seg}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors flex-shrink-0 ${
                      active
                        ? "bg-[#ffd716]/15 dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white font-semibold"
                        : "bg-white dark:bg-[#1e1e1e] text-[#6b6b6b] dark:text-white/50 hover:text-[#1e1e1e] dark:hover:text-white border border-[#e8e8e8] dark:border-white/10"
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </Link>
                );
              })}
            </div>

            {/* desktop: vertical */}
            <div className="hidden md:block bg-white dark:bg-[#1e1e1e] rounded-xl border border-[#e8e8e8] dark:border-white/10 overflow-hidden">
              {subNav.map(({ label, seg, section: sec, Icon }) => {
                const active = sec === section;
                return (
                  <Link
                    key={sec}
                    href={`${basePath}${seg}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium transition-colors border-b border-[#f0f0f0] dark:border-white/5 last:border-0 ${
                      active
                        ? "bg-[#ffd716]/12 dark:bg-[#ffd716]/[0.08] text-[#1e1e1e] dark:text-white font-semibold border-l-[3px] border-l-[#ffd716]"
                        : "text-[#6b6b6b] dark:text-white/50 hover:bg-[#f7f7f7] dark:hover:bg-white/[0.04] hover:text-[#1e1e1e] dark:hover:text-white pl-[18px]"
                    }`}
                  >
                    <Icon size={15} className={active ? "text-[#caa400]" : ""} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-[#e8e8e8] dark:border-white/10 p-5 sm:p-7">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
