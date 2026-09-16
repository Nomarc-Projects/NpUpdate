import type { Metadata } from "next";
import { Mail, Phone, Linkedin, Instagram, Facebook, MessageSquare, Send, Headphones } from "lucide-react";
import { ContactForm } from "./contact-form";
import { ContactHelp } from "./contact-help";
import { Reveal } from "@/components/ui/reveal";
import { ContactHero } from "./contact-hero";

export const metadata: Metadata = {
  title: "Contact — Nomarc Projects",
  description:
    "Get in touch with the Nomarc Projects team. We connect Nigeria's construction professionals, exhibitors and buyers. Email us at info@nomarcprojects.com or call +234 916 125 7901.",
  openGraph: {
    title: "Contact — Nomarc Projects",
    description: "Get in touch with the Nomarc Projects team for general enquiries or support.",
    url: "https://www.nomarcprojects.com/contact",
    siteName: "Nomarc Projects",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact — Nomarc Projects",
    description: "Get in touch with the Nomarc Projects team for general enquiries or support.",
  },
};

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

const socials = [
  { label: "X (Twitter)", href: "https://x.com",         Icon: XIcon },
  { label: "LinkedIn",    href: "https://linkedin.com",   Icon: Linkedin },
  { label: "Instagram",   href: "https://instagram.com",  Icon: Instagram },
  { label: "Facebook",    href: "https://facebook.com",   Icon: Facebook },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">

      {/* ── Hero banner (full-bleed image + black overlay) ── */}
      <section className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/contact-us.webp"
          alt="Get in touch with the Nomarc team"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* black overlay (not yellow) — a touch deeper in dark mode */}
        <div className="absolute inset-0 bg-black/60 dark:bg-black/70" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-white text-3xl sm:text-4xl md:text-[46px] font-bold tracking-tight">
            Contact us
          </h1>
          <p className="mt-3 text-white/85 text-[14px] sm:text-[15px] max-w-[520px] leading-relaxed">
            Have a question or need assistance? Our team is here to help.
          </p>
        </div>
      </section>

      {/* ── "We'd love to hear from you" ── */}
      <ContactHero />

      {/* ── Help centre (above the form) ── */}
      <section className="px-6 pb-10">
        <div className="max-w-[1080px] mx-auto">
          <Reveal>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white mb-1">
              Need quick help?
            </h2>
            <p className="text-[13px] text-[#9a9a9a] mb-5">
              Select a topic below for instant answers.
            </p>
          </Reveal>
          <ContactHelp />
        </div>
      </section>

      {/* ── Contact form band ── */}
      <section className="px-6 pb-24">
        <Reveal className="max-w-[1080px] mx-auto rounded-3xl bg-[#161616] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-8 sm:p-12">
            {/* info */}
            <div className="flex flex-col">
              <h2 className="text-3xl md:text-[34px] font-bold text-[#ffd716]">Let&apos;s get in touch</h2>
              <p className="mt-3 text-white/70 text-sm leading-relaxed max-w-[360px]">
                Do you have general enquiries or need support? Please send us a message.
              </p>

              <div className="mt-8 space-y-5">
                <a href="mailto:info@nomarcprojects.com" className="flex items-center gap-3 group">
                  <span className="w-10 h-10 rounded-lg bg-[#ffd716] flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-[#1e1e1e]" />
                  </span>
                  <span>
                    <span className="block text-xs text-white/50">Email Address</span>
                    <span className="block text-sm text-white group-hover:text-[#ffd716] transition-colors">info@nomarcprojects.com</span>
                  </span>
                </a>
                <a href="tel:+2349161257901" className="flex items-center gap-3 group">
                  <span className="w-10 h-10 rounded-lg bg-[#ffd716] flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-[#1e1e1e]" />
                  </span>
                  <span>
                    <span className="block text-xs text-white/50">Phone Number</span>
                    <span className="block text-sm text-white group-hover:text-[#ffd716] transition-colors">+234 916 125 7901</span>
                  </span>
                </a>
              </div>

              <div className="mt-auto pt-10">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Our social profiles</p>
                <div className="flex items-center gap-5">
                  {socials.map(({ label, href, Icon }) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                      className="text-[#ffd716] hover:text-white transition-colors">
                      <Icon size={18} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* form */}
            <ContactForm />
          </div>
        </Reveal>
      </section>

    </div>
  );
}
