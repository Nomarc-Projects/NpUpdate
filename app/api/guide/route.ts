import { NextResponse } from "next/server";
import { guideChat, helmConfigured, type HelmChatTurn } from "@/lib/helm/client";

export const runtime = "nodejs";

/**
 * Nomarc Guide relay — the public site assistant. Ungated, so it's protected by
 * a coarse per-IP rate limit to keep anonymous traffic from saturating the VM.
 * Best-effort in-memory limiter (per serverless instance); a durable limiter
 * lands with the metering work in a later phase.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Slow down a moment and try again." }, { status: 429 });
  }

  if (!helmConfigured) {
    return NextResponse.json({ error: "Chat isn't available right now." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

  const history: HelmChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter((t: unknown): t is HelmChatTurn =>
          !!t && typeof (t as HelmChatTurn).content === "string" &&
          ((t as HelmChatTurn).role === "user" || (t as HelmChatTurn).role === "assistant"))
        .slice(-8)
    : [];

  try {
    const result = await guideChat({ message, history });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[guide] chat relay failed:", err);
    return NextResponse.json({ error: "Assistant is temporarily unavailable." }, { status: 502 });
  }
}
