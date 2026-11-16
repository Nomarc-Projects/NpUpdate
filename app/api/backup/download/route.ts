import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { backupStream, backupFileName } from "@/lib/db/backup";

export const runtime = "nodejs";
/** A long dump must not be cut off by a default function timeout. */
export const maxDuration = 3600;

/**
 * Download the full database backup (schema + data) as one `.sql` file.
 *
 * Access is deliberately narrow: a live Better Auth session whose user is
 * `super_admin` (a stolen or forged UI cannot reach this — the check happens
 * here, independent of the page), and the request must be same-origin, so a
 * cross-site form cannot trigger a download with someone's session cookie.
 *
 * POST (not GET) so no link, crawler or prefetch can ever touch it.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { role?: string; banned?: boolean } | undefined;
  if (!user || user.banned) {
    return Response.json({ error: "Sign in to use the backup console." }, { status: 401 });
  }
  if (user.role !== "super_admin") {
    return Response.json({ error: "Forbidden — super admin only." }, { status: 403 });
  }

  // Same-origin check. Behind Traefik the public host arrives in
  // x-forwarded-host; fall back to Host. A cross-site POST would carry an
  // attacker's Origin, never ours.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const originHost = req.headers.get("origin") ? new URL(req.headers.get("origin")!).host : null;
  if (originHost && host && originHost !== host) {
    return Response.json({ error: "Cross-origin request refused." }, { status: 403 });
  }

  return new Response(backupStream(), {
    headers: {
      "content-type": "application/sql; charset=utf-8",
      "content-disposition": `attachment; filename="${backupFileName()}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
