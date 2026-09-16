import { NextRequest } from "next/server";
import { recordCampaignEvent } from "@/lib/services/campaigns";

// 1x1 transparent GIF — the smallest thing a mail client will fetch.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export const dynamic = "force-dynamic";

/**
 * Open tracking pixel. Unauthenticated by necessity — it's fetched by the
 * recipient's mail client, which carries no session. Always returns the image,
 * even if recording fails, so a tracking problem never shows a broken image in
 * someone's inbox.
 */
export async function GET(req: NextRequest) {
  const c = req.nextUrl.searchParams.get("c");
  const u = req.nextUrl.searchParams.get("u");
  if (c && u) await recordCampaignEvent(c, u, "open").catch(() => {});

  return new Response(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      // Must not be cached, or a second open never reaches us.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
    },
  });
}
