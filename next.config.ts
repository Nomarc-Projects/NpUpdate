import type { NextConfig } from "next";

/**
 * Origins the browser is allowed to reach, beyond the app's own.
 * R2 serves uploaded media; Nominatim backs the address autocomplete;
 * DiceBear generates placeholder avatars.
 */

/**
 * The bucket that served media before the host became configurable
 * (see `lib/r2-public.ts`). Rows written then still hold absolute URLs against
 * it, so it stays allowed until those rows are rewritten alongside a storage
 * move. Nothing in source targets it any more.
 */
const LEGACY_R2_HOST = "https://pub-746d856e5d4c4916a1f61dbd99ff2f33.r2.dev";

const r2Host = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN).origin
  : LEGACY_R2_HOST;

const mediaHosts = [...new Set([r2Host, LEGACY_R2_HOST])];

/**
 * Content Security Policy.
 *
 * Shipped as report-only first. The app renders admin-authored HTML through
 * dangerouslySetInnerHTML on the news feed, and had no CSP at all, so this is the
 * backstop for that — but GSAP, OGL, Framer Motion and TipTap all run here and
 * a policy that breaks them silently is worse than none. Watch the reports,
 * then rename the header to `Content-Security-Policy` to enforce.
 *
 * `unsafe-inline` on script-src is required while Next's hydration bootstrap is
 * inline and unnonced; tightening it means emitting a per-request nonce from
 * middleware, which is the follow-up once the report stream is quiet.
 */
const csp = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${mediaHosts.join(" ")} https://api.dicebear.com`,
  `media-src 'self' blob: ${mediaHosts.join(" ")}`,
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self' ${mediaHosts.join(" ")} https://nominatim.openstreetmap.org`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Security headers. There were none — no CSP, no HSTS, no framing control —
 * so the app was clickjackable and had no second line of defence behind the
 * news feed sanitiser.
 */
const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Chat records voice notes and captures photos (components/dashboard/
  // chat-input-bar.tsx, chat-attachments.tsx), so camera and microphone stay
  // available to this origin. Geolocation is genuinely unused — the address
  // autocomplete is a text lookup against Nominatim.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  reactStrictMode: true,
  poweredByHeader: false,
  // Externalize only the server-side DB packages so Better Auth's optional
  // SQLite dialects aren't bundled. NOTE: do NOT externalize "better-auth"
  // itself — that would also externalize better-auth/react (useSession) and
  // break SSR (React resolves to null → "useRef of null" at prerender).
  serverExternalPackages: ["@better-auth/kysely-adapter", "kysely", "pg"],
  images: {
    // The configured R2 bucket, plus the legacy one still named by older rows.
    remotePatterns: mediaHosts.map((host) => ({
      protocol: "https" as const,
      hostname: new URL(host).hostname,
    })),
  },
};

export default nextConfig;
