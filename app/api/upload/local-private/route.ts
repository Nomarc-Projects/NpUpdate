import { NextResponse } from "next/server";
import { ensureDirs, localPathFor } from "@/lib/storage/local";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { writeFile } from "node:fs/promises";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function PUT(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;

  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  if (!key.startsWith(`helm/${uid}/`)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  await ensureDirs();
  const p = localPathFor(key, true);
  await writeFile(p, buf);
  return NextResponse.json({ ok: true });
}
