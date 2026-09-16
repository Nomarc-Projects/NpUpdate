import { NextResponse } from "next/server";
import { reconcilePending, processRetryQueue } from "@/lib/services/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retried = await processRetryQueue();
  const reconciled = await reconcilePending();

  return NextResponse.json({ retried, reconciled });
}
