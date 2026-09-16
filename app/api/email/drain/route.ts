import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { drainCampaign, pendingCampaignIds } from "@/lib/services/campaign-drain";
import { getMailThroughput } from "@/lib/services/platform-settings-read";
import { fireDueScheduledCampaign, dueCampaignIds } from "@/lib/services/campaigns";

export const dynamic = "force-dynamic";

/**
 * How long one slice may take. A slice is deliberately small (25 messages at the
 * default 300/hour), so this is headroom for slow provider sends rather than a target.
 */
export const maxDuration = 300;

/**
 * Campaign drain tick.
 *
 * Called on a schedule by a systemd timer on the OCI VM (see
 * helm/deploy/nomarc-mail-drain.*). The VM is the clock only: it holds no
 * database or email credentials, which keeps the boundary helm/README.md draws —
 * "CockroachDB stays the app database; this service does not touch it."
 *
 * Authenticated by a shared secret rather than a session, because the caller is a
 * machine. Without MAIL_DRAIN_SECRET set the endpoint refuses everything: an
 * open drain would let anyone push a queued blast out at unlimited speed.
 */
function authorized(req: NextRequest): boolean {
  const expected = process.env.MAIL_DRAIN_SECRET;
  if (!expected) return false;

  const provided =
    req.headers.get("x-drain-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    // 404 rather than 401: an unauthenticated prober learns nothing about
    // whether this endpoint exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { batchSize } = await getMailThroughput();
  const ids = await pendingCampaignIds();

  // Nothing actively draining: promote a due scheduled campaign into the queue.
  // Scheduled campaigns were already approved by a super admin at schedule
  // time, so this is not an authorization bypass — it is the scheduler the
  // "Schedule for later" composer option was missing.
  if (ids.length === 0) {
    const due = await dueCampaignIds();
    if (due.length > 0) {
      const fired = await fireDueScheduledCampaign(due[0]);
      if (fired.ok && fired.queued) {
        return NextResponse.json({ ok: true, campaignId: due[0], promoted: "scheduled", queued: fired.queued });
      }
    }
    return NextResponse.json({ ok: true, idle: true });
  }

  // One campaign per tick. Draining several at once would multiply the effective
  // send rate by the number of queued campaigns and blow past the ceiling the
  // batch size exists to enforce.
  const id = ids[0];
  const result = await drainCampaign(id, batchSize);

  return NextResponse.json({ ok: true, campaignId: id, ...result });
}

/** GET mirrors POST so the timer can use a plain curl without -X POST. */
export async function GET(req: NextRequest) {
  return POST(req);
}
