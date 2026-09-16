import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { webhookEvent, paymentRetry, paymentTransaction } from "@/lib/db/schema";
import { getProvider, type ProviderName } from "@/lib/payments";
import { settleByWebhook, settleTransferWebhook } from "@/lib/services/billing";
import { settleCartByWebhook } from "@/lib/services/checkout";

export const runtime = "nodejs";

const KNOWN: ProviderName[] = ["paystack", "flutterwave", "seerbit"];

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: name } = await params;
  if (!KNOWN.includes(name as ProviderName)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  const provider = getProvider(name as ProviderName);
  if (!provider.isConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await req.text();

  // 1. Verify signature (HMAC)
  if (!provider.verifyWebhookSignature(raw, req.headers)) {
    await logEvent(name, "invalid", null, null, raw, "failed", "Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse + extract event ID for idempotency
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw); } catch { /* unparseable */ }
  const eventId = String(parsed.id ?? parsed.event_id ?? parsed.reference ?? `${Date.now()}`);
  const eventType = String(parsed.event ?? parsed.event_type ?? "unknown");

  // 3. Idempotency: skip if already processed
  try {
    const [existing] = await db.select({ id: webhookEvent.id }).from(webhookEvent)
      .where(and(eq(webhookEvent.provider, name), eq(webhookEvent.eventId, eventId))).limit(1);
    if (existing) {
      return NextResponse.json({ received: true, deduplicated: true });
    }
  } catch { /* table may not exist yet — continue */ }

  // 4. Parse normalized event
  const event = provider.parseWebhook(raw);

  // 5. Process based on event type
  let status = "processed";
  let errorMsg: string | null = null;

  if (event?.reference) {
    try {
      if (eventType.includes("transfer")) {
        await settleTransferWebhook(event.reference, event.status);
      } else {
        // Dispatch by transaction kind — the same table backs both subscription
        // billing and multi-vendor cart checkouts (see lib/services/checkout.ts).
        const [tx] = await db.select({ kind: paymentTransaction.kind }).from(paymentTransaction)
          .where(eq(paymentTransaction.reference, event.reference)).limit(1);
        if (tx?.kind === "cart") {
          await settleCartByWebhook(event.reference);
        } else if (tx?.kind === "promotion") {
          // Settle the money first, then move the campaign into review — an ad
          // must never reach an admin (and so possibly go live) unpaid.
          await settleByWebhook(event.reference);
          const { applyPromotionPayment } = await import("@/lib/services/promotion-checkout");
          await applyPromotionPayment(event.reference);
        } else {
          await settleByWebhook(event.reference);
        }
      }
    } catch (e) {
      status = "failed";
      errorMsg = e instanceof Error ? e.message : "Settlement error";

      // Queue for retry
      try {
        await db.insert(paymentRetry).values({
          reference: event.reference,
          attempts: 1,
          lastError: errorMsg,
          nextRetryAt: new Date(Date.now() + 60_000), // retry in 1 minute
        }).onConflictDoNothing();
      } catch { /* retry table may not exist */ }
    }
  } else {
    status = "skipped";
    errorMsg = "No reference in event";
  }

  // 6. Log the event (audit trail)
  await logEvent(name, eventId, eventType, event?.reference ?? null, raw, status, errorMsg);

  // Always return 200 so the provider stops retrying
  return NextResponse.json({ received: true });
}

async function logEvent(
  provider: string, eventId: string, eventType: string | null,
  reference: string | null, rawBody: string, status: string, error: string | null,
) {
  try {
    await db.insert(webhookEvent).values({
      provider, eventId, eventType, reference, rawBody, status,
      errorMessage: error, processedAt: new Date(),
    }).onConflictDoNothing();
  } catch { /* table may not exist pre-migration */ }
}
