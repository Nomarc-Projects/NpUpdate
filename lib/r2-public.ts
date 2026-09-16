/**
 * The public base URL for R2-served media, in one place.
 *
 * The bucket's public host was hardcoded in ~50 places across the app, so moving
 * storage to a different Cloudflare account would have left every one of them
 * resolving against the old bucket — serving the new deployment's media out of
 * the previous account's billing, or 404ing once that account went away. The
 * host is deployment configuration, not source: each deployment serves media
 * from its own bucket via `NEXT_PUBLIC_R2_PUBLIC_DOMAIN`.
 *
 * `lib/r2.ts` owns the same value for server-side writes (`R2_PUBLIC_DOMAIN`).
 * Both must name the same bucket; this module exists because client components
 * build media URLs too and cannot import a "server-only" module.
 *
 * NOT importing "server-only": `NEXT_PUBLIC_*` is inlined at build time, so this
 * resolves in the browser as well as on the server.
 */

export const R2_PUBLIC_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");

/** Public URL for an object key, e.g. `r2Url("site/photo-1504307651254.jpg")`. */
export function r2Url(key: string) {
  return `${R2_PUBLIC_BASE}/${key.replace(/^\//, "")}`;
}
