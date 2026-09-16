import Link from "next/link";

/** Small breadcrumb-style tab bar shared by /terms and /privacy. */
export function LegalTabs({ active }: { active: "terms" | "privacy" }) {
  const tabs = [
    { key: "terms" as const, label: "Terms of Service", href: "/terms" },
    { key: "privacy" as const, label: "Privacy Policy", href: "/privacy" },
  ];
  return (
    <div className="bg-[#f7f7f7] dark:bg-white/[0.04] border-y border-[#ececec] dark:border-white/10">
      <div className="max-w-[900px] mx-auto px-6 py-3 flex items-center justify-center gap-2 text-[13px]">
        {tabs.map((t, i) => (
          <span key={t.key} className="flex items-center gap-2">
            {i > 0 && <span className="text-[#c9c9c9] dark:text-white/25">·</span>}
            {t.key === active ? (
              <span className="font-semibold text-[#1e1e1e] dark:text-white">{t.label}</span>
            ) : (
              <Link href={t.href} className="text-[#898989] dark:text-white/50 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
                {t.label}
              </Link>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
