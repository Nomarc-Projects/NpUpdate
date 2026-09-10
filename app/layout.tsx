import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Canonical domain since the cutover. Feeds metadataBase, so it decides the
// host on every canonical link, OG image and Twitter card the site emits —
// leaving it on the old domain would have search engines and social previews
// pointing at nomarcdatagig.com for content served from nomarcprojects.com.
const BASE = "https://www.nomarcprojects.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Nomarc Projects — Digital home for everything construction",
    template: "%s — Nomarc Projects",
  },
  description:
    "Nomadic Architects is building Nigeria's leading construction marketplace — connecting verified architects, engineers, quantity surveyors, material suppliers and buyers through a modern digital platform.",
  keywords: [
    "construction jobs Nigeria",
    "hire construction professionals",
    "building materials suppliers Nigeria",
    "architects engineers quantity surveyors",
    "construction marketplace",
    "Nomarc Projects",
  ],
  applicationName: "Nomarc Projects",
  authors: [{ name: "Nomadic Architects" }],
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Nomarc" },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Nomarc Projects",
    title: "Nomarc Projects — Digital home for everything construction",
    description:
      "Learn how Nomadic Architects is building Nigeria's construction marketplace — connecting verified professionals, exhibitors and buyers through a modern digital platform.",
    url: BASE,
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nomarc Projects — Digital home for everything construction",
    description:
      "Nigeria's leading construction marketplace connecting architects, engineers, quantity surveyors, material suppliers and buyers.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: "Nomarc Projects",
      url: BASE,
      logo: `${BASE}/favicon.png`,
      description:
        "Digital marketplace connecting Nigerian construction professionals, exhibitors, and buyers.",
      sameAs: [
        "https://x.com",
        "https://www.linkedin.com",
        "https://www.instagram.com",
        "https://www.facebook.com",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      url: BASE,
      name: "Nomarc Projects",
      publisher: { "@id": `${BASE}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE}/jobs?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

// Applies the stored theme (light/dark, falling back to system) before first
// paint. Lives in <head> of the server-rendered root layout — never inside a
// client-rendered component, which React 19 would refuse to execute.
const themeInit = `(function(){try{var t=localStorage.getItem("theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";var c=document.documentElement.classList;c.remove("light","dark");c.add(d);document.documentElement.style.colorScheme=d;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
        <PwaRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
