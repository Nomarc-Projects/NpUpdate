import "server-only";
import crypto from "node:crypto";
import type { PaymentProvider, InitParams, VerifyResult, WebhookEvent } from "./types";

const SECRET = () => process.env.FLUTTERWAVE_SECRET_KEY || "";
const WEBHOOK_HASH = () => process.env.FLUTTERWAVE_SECRET_HASH || "";

/** Flutterwave — https://developer.flutterwave.com/docs. Standard payment link;
 *  amounts in naira; webhooks authenticated by the `verif-hash` header. */
export const flutterwave: PaymentProvider = {
  name: "flutterwave",
  isConfigured: () => !!SECRET() && !!WEBHOOK_HASH(),

  async init({ email, amountNaira, reference, callbackUrl, metadata }: InitParams) {
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tx_ref: reference, amount: amountNaira, currency: "NGN", redirect_url: callbackUrl, customer: { email }, meta: metadata, payment_options: "card,banktransfer,ussd" }),
    });
    const data = await res.json();
    if (!res.ok || data.status !== "success" || !data.data?.link) throw new Error(data.message || "Flutterwave init failed");
    return { checkoutUrl: data.data.link as string };
  },

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${SECRET()}` },
    });
    const data = await res.json();
    const d = data?.data;
    const ok = data?.status === "success" && d?.status === "successful";
    return { status: ok ? "success" : d?.status === "failed" ? "failed" : "pending", amountNaira: Math.round(d?.amount ?? 0), currency: d?.currency ?? "NGN", reference };
  },

  verifyWebhookSignature(_rawBody: string, headers: Headers): boolean {
    const sig = headers.get("verif-hash");
    if (!sig || !WEBHOOK_HASH()) return false;
    try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(WEBHOOK_HASH())); } catch { return false; }
  },

  parseWebhook(rawBody: string): WebhookEvent {
    try {
      const evt = JSON.parse(rawBody);
      const d = evt?.data ?? evt;
      const ref = d?.tx_ref ?? d?.txRef;
      if (!ref) return null;
      const status = d?.status === "successful" ? "success" : d?.status === "failed" ? "failed" : "pending";
      return { reference: ref, status, amountNaira: Math.round(d?.amount ?? 0) };
    } catch { return null; }
  },
};
