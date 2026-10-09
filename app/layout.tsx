import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { getPwa } from "@/lib/services/platform-settings-read";
import { PWA_DEFAULT } from "@/lib/services/platform-settings-shared";

// Self-hosted Inter (latin variable subset). next/font/google would fetch the
// font at build time, which hangs the production build when the deploy
// container has no egress to fonts.googleapis.com. The woff2 and its OFL
// licence live in ./fonts.
const inter = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

// Canonical domain since the cutover. Feeds metadataBase, so it decides the
// host on every canonical link, OG image and Twitter card the site emits —
// leaving it on the old domain would have search engines and social previews
// pointing at nomarcdatagig.com for content served from nomarcprojects.com.
const BASE = "https://www.nomarcprojects.com";

export async function generateMetadata(): Promise<Metadata> {
  const { enabled: pwaEnabled } = await getPwa().catch(() => PWA_DEFAULT);
  return {
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
    ...(pwaEnabled
      ? { manifest: "/manifest.json", appleWebApp: { capable: true, statusBarStyle: "black-translucent" as const, title: "Nomarc" } }
      : {}),
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
}

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { enabled: pwaEnabled } = await getPwa().catch(() => PWA_DEFAULT);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script
          defer
          src="https://analytics.nomarcprojects.com/script.js"
          data-website-id="a020e75f-fc01-41f4-95f7-7692aad1c249"
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
        <PwaRegister enabled={pwaEnabled} />
        <PwaInstallPrompt enabled={pwaEnabled} />
      </body>
    </html>
  );
}
