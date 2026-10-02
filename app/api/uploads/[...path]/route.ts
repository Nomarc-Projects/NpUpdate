import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(_req: Request, context: any) {
  const params = await context.params;
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "uploads", safeKey);
  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf, { headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
