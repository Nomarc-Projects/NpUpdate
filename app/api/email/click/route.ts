import { NextRequest, NextResponse } from "next/server";
import { recordCampaignEvent } from "@/lib/services/campaigns";
import { resolveSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function appBaseUrl(): string {
  return resolveSiteUrl();
}

/**
 * Click tracking redirect. Unauthenticated by necessity — the recipient clicks
 * straight from their inbox.
 *
 * `url` comes from the query string, so it is an open-redirect risk: an attacker
 * could mail their own link pointing at this endpoint to borrow our domain's
 * credibility. Only same-origin destinations are honoured; anything else falls
 * back to the site root rather than forwarding off-site.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const c = params.get("c");
  const u = params.get("u");
  const raw = params.get("url");
  const base = appBaseUrl();

  let target = base;
  if (raw) {
    try {
      const parsed = new URL(raw, base);
      const allowedHost = new URL(base).host;
      if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host === allowedHost) {
        target = parsed.toString();
      }
    } catch {
      target = base;
    }
  }

  if (c && u) await recordCampaignEvent(c, u, "click", target).catch(() => {});
  return NextResponse.redirect(target, { status: 302 });
}
