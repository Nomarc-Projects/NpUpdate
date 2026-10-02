import { NextResponse } from "next/server";
import { getPrivateObjectLocal } from "@/lib/storage/local";
import { getCurrentUserId } from "@/lib/server-user";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  if (!key.startsWith(`helm/${uid}/`)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }
  try {
    const buf = await getPrivateObjectLocal(key);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Disposition": `attachment; filename="${key.split("/").pop()}"` } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
