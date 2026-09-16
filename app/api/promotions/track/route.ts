import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/**
 * Impression and click counting for self-serve promotions.
 *
 * `promotion.views` and `.clicks` existed from the start but nothing ever wrote
 * them, so every campaign reported 0 on both the owner's Ads Board and the
 * admin console — while the design sells that column as the reason to buy.
 *
 * Unauthenticated by necessity: promoted cards render for signed-out visitors.
 * That makes it inflatable, so two cheap guards apply — a bot filter on
 * User-Agent, and a per-viewer cookie that collapses repeat impressions of the
 * same promotion within the day. Neither is airtight; billing does not depend
 * on these numbers, and anything stronger belongs behind a real analytics
 * pipeline rather than a counter column.
 */

const BOT = /bot|crawler|spider|crawling|preview|facebookexternalhit|slackbot|whatsapp|headless|lighthouse|curl|wget/i;
const DAY = 60 * 60 * 24;

export async function POST(req: Request) {
  let body: { id?: string; kind?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const id = typeof body.id === "string" ? body.id : "";
  const kind = body.kind === "click" ? "click" : "view";
  // A uuid check keeps malformed ids from reaching the query at all.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });

  if (BOT.test(req.headers.get("user-agent") ?? "")) return NextResponse.json({ ok: true, skipped: "bot" });

  // Impressions de-duplicate per viewer per day; clicks are deliberate, so they
  // always count.
  const cookieName = `pv_${id.slice(0, 8)}`;
  if (kind === "view" && (req.headers.get("cookie") ?? "").includes(`${cookieName}=1`)) {
    return NextResponse.json({ ok: true, skipped: "duplicate" });
  }

  try {
    if (kind === "click") {
      await db.execute(sql`UPDATE promotion SET clicks = clicks + 1 WHERE id = ${id} AND status = 'active'`);
    } else {
      await db.execute(sql`UPDATE promotion SET views = views + 1 WHERE id = ${id} AND status = 'active'`);
    }
  } catch {
    // Never let a counter take a page down.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const res = NextResponse.json({ ok: true });
  if (kind === "view") {
    res.headers.set("Set-Cookie", `${cookieName}=1; Path=/; Max-Age=${DAY}; SameSite=Lax`);
  }
  return res;
}
