import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { mimeForFileName } from "@/lib/media-types";
import { objectMimeLocal, publicPathFor } from "@/lib/storage/local";

export const runtime = "nodejs";

/**
 * Serves locally-stored uploads (STORAGE_BACKEND=local).
 *
 * The Content-Type must be sent explicitly: the app sets
 * `X-Content-Type-Options: nosniff`, so a media element given
 * `application/octet-stream` refuses to play it. The type recorded at upload
 * time wins because an extension is ambiguous (`.webm` is both audio and
 * video); the extension is only a fallback for objects stored before that.
 *
 * Range requests are honoured because iOS/Safari asks for byte ranges before it
 * will play audio or video.
 */
export async function GET(req: Request, context: any) {
  const params = await context.params;
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
  const filePath = publicPathFor(safeKey);
  const contentType =
    (await objectMimeLocal(safeKey)) || mimeForFileName(safeKey) || "application/octet-stream";

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    const range = req.headers.get("range");
    const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= info.size) {
        return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      }
      const buf = await readFile(filePath);
      return new NextResponse(buf.subarray(start, end + 1), {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }

    const buf = await readFile(filePath);
    return new NextResponse(buf, { headers });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
