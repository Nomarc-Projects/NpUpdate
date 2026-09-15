import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Linkedin, Instagram, Facebook } from "lucide-react";

const quickLinks = [
  { label: "Home",           href: "/" },
  { label: "Join Community", href: "/signup" },
  { label: "FAQs",           href: "/#faq" },
  { label: "News Feed",    href: "/newsfeed" },
];

const professionalLinks = [
  { label: "Professional Dashboard", href: "/dashboard" },
  { label: "Browse Jobs",            href: "/dashboard/jobs" },
  { label: "Saved Jobs",             href: "/dashboard/jobs/saved" },
  { label: "Competition",            href: "/tools" },
];

const employerLinks = [
  { label: "Employers Dashboard", href: "/dashboard" },
  { label: "Post a Job",          href: "/dashboard/jobs/post" },
  { label: "Browse Candidates",   href: "/dashboard/find-professionals" },
  { label: "Applications",        href: "/dashboard/applications" },
];

// X (Twitter) glyph — lucide dropped the bird, so inline the new mark.
function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

const socials = [
  { label: "X (Twitter)", href: "https://x.com",        Icon: XIcon },
  { label: "LinkedIn",    href: "https://linkedin.com", Icon: Linkedin },
  { label: "Instagram",   href: "https://instagram.com", Icon: Instagram },
  { label: "Facebook",    href: "https://facebook.com", Icon: Facebook },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-white font-semibold text-base mb-5">{title}</h4>
      <ul className="space-y-3.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-[#9a9a9a] hover:text-white transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#161616] text-white">
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-10 pt-20 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-12 lg:gap-8">
          {/* Brand + socials */}
          <div>
            <Link href="/" aria-label="Nomarc home"><Logo size="md" tone="light" /></Link>
            <div className="flex items-center gap-5 mt-8">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="text-white/90 hover:text-[#ffd716] transition-colors"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Quick Links"   links={quickLinks} />
          <FooterColumn title="Professionals" links={professionalLinks} />
          <FooterColumn title="Employers"     links={employerLinks} />
        </div>

        {/* Divider + bottom bar */}
        <div className="mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[#9a9a9a]">
            All rights Reserved by Nomarc Projects, Developed by{" "}
            <Link href="https://14eter.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">
              14Eter Limited
            </Link>
          </p>
          <div className="flex items-center gap-8">
            <Link href="/privacy" className="text-[13px] text-[#9a9a9a] hover:text-white transition-colors">
              Privacy policy
            </Link>
            <Link href="/terms" className="text-[13px] text-[#9a9a9a] hover:text-white transition-colors">
              Terms of service
            </Link>
          </div>
        </div>
      </div>

      {/* Giant faded watermark bleeding off the bottom */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute inset-x-0 -bottom-6 md:-bottom-10 flex justify-center"
      >
        <span className="font-extrabold tracking-tight leading-none whitespace-nowrap text-[18vw] md:text-[15vw] text-white/[0.04]">
          NOMARC PROJECTS
        </span>
      </div>
    </footer>
  );
}
