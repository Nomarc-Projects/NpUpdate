import "server-only";
import crypto from "node:crypto";
import type { PaymentProvider, InitParams, VerifyResult, WebhookEvent } from "./types";

const PUBLIC_KEY = () => process.env.SEERBIT_PUBLIC_KEY || "";
const SECRET_KEY = () => process.env.SEERBIT_SECRET_KEY || "";
const BASE = "https://seerbitapi.com/api/v2";

/** Seerbit — https://doc.seerbit.com/. Bearer token is obtained by base64
 *  encoding "SECRETKEY.PUBLICKEY" against the encrypt-keys endpoint. */
async function token(): Promise<string> {
  const key = Buffer.from(`${SECRET_KEY()}.${PUBLIC_KEY()}`).toString("base64");
  const res = await fetch(`${BASE}/encrypt/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ key: `${SECRET_KEY()}.${PUBLIC_KEY()}` }),
  });
  const data = await res.json();
  const t = data?.data?.EncryptedSecKey?.encryptedKey;
  if (!t) throw new Error("Seerbit auth failed");
  return t;
}

export const seerbit: PaymentProvider = {
  name: "seerbit",
  isConfigured: () => !!PUBLIC_KEY() && !!SECRET_KEY(),

  async init({ email, amountNaira, reference, callbackUrl }: InitParams) {
    const bearer = await token();
    const res = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({ publicKey: PUBLIC_KEY(), amount: String(amountNaira), currency: "NGN", country: "NG", paymentReference: reference, email, callbackUrl, productDescription: "Nomarc subscription" }),
    });
    const data = await res.json();
    const link = data?.data?.payments?.redirectLink ?? data?.data?.redirectLink;
    if (!link) throw new Error(data?.message || "Seerbit init failed");
    return { checkoutUrl: link as string };
  },

  async verify(reference: string): Promise<VerifyResult> {
    const bearer = await token();
    const res = await fetch(`${BASE}/payments/query/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${bearer}` } });
    const data = await res.json();
    const d = data?.data;
    const code = d?.code ?? d?.payments?.code;
    const ok = code === "00";
    return { status: ok ? "success" : "pending", amountNaira: Math.round(Number(d?.amount ?? d?.payments?.amount ?? 0)), currency: "NGN", reference };
  },

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    // Seerbit signs notifications with HMAC-SHA512 of the body using the secret key.
    const sig = headers.get("signature") || headers.get("x-seerbit-signature");
    if (!sig || !SECRET_KEY()) return false;
    const hash = crypto.createHmac("sha512", SECRET_KEY()).update(rawBody).digest("hex");
    try { return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig)); } catch { return false; }
  },

  parseWebhook(rawBody: string): WebhookEvent {
    try {
      const evt = JSON.parse(rawBody);
      const d = evt?.data ?? evt;
      const ref = d?.paymentReference ?? d?.reference;
      if (!ref) return null;
      const code = d?.code ?? d?.status;
      const status = code === "00" || code === "success" ? "success" : code === "failed" ? "failed" : "pending";
      return { reference: ref, status, amountNaira: Math.round(Number(d?.amount ?? 0)) };
    } catch { return null; }
  },
};
