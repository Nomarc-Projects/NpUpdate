/**
 * The one place the app decides what its own origin is.
 *
 * Password-reset links were arriving pointing at `nomarc-gigs.vercel.app`, because
 * both Better Auth's `baseURL` and the mailer's link builder read
 * `BETTER_AUTH_URL || AUTH_URL` straight from the environment, and the value
 * configured on Vercel is the deployment URL rather than the custom domain. Every
 * link in every email inherited it: reset, verification, unsubscribe, campaign
 * CTAs and the invoice logo.
 *
 * In production the canonical domain wins outright, so a stale or wrong env var
 * cannot send real users to a deployment URL. Everywhere else (previews, local)
 * the environment still decides, which is what previews need — Better Auth trusts
 * each preview's own `VERCEL_URL` as an origin.
 *
 * NOT importing "server-only": lib/auth.ts pulls this in, and that module is also
 * loaded by plain Node scripts outside Next's bundler.
 */
/**
 * The host that actually serves production, verified live:
 *
 *   curl -I https://nomarcprojects.com/login  → 200  (this app, incl. /api/auth)
 *   curl -I https://www.nomarcprojects.com/   → 307 → https://nomarcprojects.com/
 *
 * `www` is a pure Vercel "www" redirect and re-serves nothing, so it cannot host
 * the Google OAuth redirect_uri: Better Auth sends the callback to
 * www.nomarcprojects.com/api/auth/callback/google, the browser hops to the apex,
 * and the OAuth state cookie set on www does not survive the host change —
 * sign-in completes at Google and the visitor lands back signed-out.
 *
 * Keep this on the host that 200s, and re-run the curl before touching it. It
 * has been flipped in both directions already; DNS is the only thing that
 * settles it.
 */
export const PRODUCTION_ORIGIN = "https://nomarcprojects.com";

const strip = (u: string) => u.replace(/\/$/, "");
export const stripTrailingSlash = strip;

/** Any origin that points back at the machine running the code. A localhost
 *  value ("http://localhost:3000") is correct for a dev box but is nonsense —
 *  and actively harmful — on a hosted server: Better Auth would send the Google
 *  OAuth redirect_uri to localhost:3000, the browser follows it, the state cookie
 *  (set on the real origin) is never sent, and sign-in dies with state_mismatch.
 *  The local .env pins these to localhost; if that file is ever copied into a
 *  Vercel environment, every env-hosted origin here becomes a localhost one. */
const LOOPBACK_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

/**
 * Returns `u` stripped of its trailing slash, or `undefined` when it is a
 * loopback origin running on a hosted runtime — such a value can only have been
 * copied from a dev box and must not decide a server origin.
 *
 * The guard is `VERCEL_ENV || NODE_ENV === "production"`, not Vercel-only:
 * `npm run start` on a plain host is also production, and when the dev-box .env
 * is present there AUTH_URL/BETTER_AUTH_URL stay "http://localhost:3000".
 * Without this, Better Auth's baseURL becomes localhost and the Google OAuth
 * redirect_uri goes to localhost — the browser follows it, the state cookie
 * (set on the real origin) is never sent, and sign-in dies with state_mismatch.
 * Local `next dev` keeps NODE_ENV=development, so it still honors the loopback.
 */
function hostedOrigin(u: string | undefined): string | undefined {
  if (!u) return undefined;
  const clean = strip(u);
  const hosted = Boolean(process.env.VERCEL_ENV) || process.env.NODE_ENV === "production";
  if (hosted && LOOPBACK_ORIGIN.test(clean)) return undefined;
  return clean;
}

export function resolveSiteUrl(): string {
  // VERCEL_ENV is "production" only for the production deployment, not previews.
  if (process.env.VERCEL_ENV === "production") {
    // A fresh Vercel deploy serves from the project alias (*.vercel.app) until
    // DNS cutover — trust whatever host Vercel says is live, not the hardcoded
    // eventual domain. NEXT_PUBLIC_SITE_URL wins when set (custom-domain pin);
    // VERCEL_PROJECT_PRODUCTION_URL is Vercel-injected and tracks the project's
    // own production domain, custom or not. AUTH_URL/BETTER_AUTH_URL are
    // deliberately ignored here: on Vercel those were the per-deployment URL,
    // which is how reset links once went out pointing at nomarc-gigs.vercel.app.
    const pinned = hostedOrigin(process.env.NEXT_PUBLIC_SITE_URL);
    if (pinned) return pinned;
    const injected = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (injected) {
      const normalized = strip(injected.replace(/^https?:\/\//, ""));
      if (!process.env.VERCEL_ENV || !LOOPBACK_ORIGIN.test(`https://${normalized}`)) {
        return `https://${normalized}`;
      }
    }
    return PRODUCTION_ORIGIN;
  }

  const explicit = hostedOrigin(process.env.BETTER_AUTH_URL || process.env.AUTH_URL);
  if (explicit) return explicit;

  // Previews keep their own host (each deployment's VERCEL_URL) so their OAuth
  // callback stays on the host the user actually logged in from.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // Non-Vercel production belt-and-suspenders: an operator can pin the domain
  // with NEXT_PUBLIC_SITE_URL when AUTH_URL/BETTER_AUTH_URL are stale or loopback
  // (e.g. a dev .env copied onto the server). Loopbacks are rejected by
  // hostedOrigin, so this cannot resurrect a localhost origin.
  const sitePin = hostedOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (sitePin) return sitePin;

  // Local dev, and any Node script run without the env set.
  return process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : "http://localhost:3000";
}

/** Client-safe canonical origin. `resolveSiteUrl()` reads `process.env.*` at
 *  module scope, which only resolves server-side; this gives client components
 *  the same canonical host without leaking server-only env. Falls back to the
 *  browser origin so previews and local dev still work. */
export const CLIENT_SITE_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL
  || (typeof window !== "undefined" ? window.location.origin : "")
  || PRODUCTION_ORIGIN;
