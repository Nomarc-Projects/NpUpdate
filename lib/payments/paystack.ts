import "server-only";
import crypto from "node:crypto";
import type { PaymentProvider, InitParams, VerifyResult, WebhookEvent } from "./types";

const SECRET = () => process.env.PAYSTACK_SECRET_KEY || "";

/** Paystack — https://paystack.com/docs/api/. Redirect (hosted) checkout flow:
 *  amounts are in kobo, webhooks signed with HMAC-SHA512 of the raw body. */
export const paystack: PaymentProvider = {
  name: "paystack",
  isConfigured: () => !!SECRET(),

  async init({ email, amountNaira, reference, callbackUrl, metadata }: InitParams) {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount: Math.round(amountNaira * 100), reference, callback_url: callbackUrl, currency: "NGN", metadata }),
    });
    const data = await res.json();
    if (!res.ok || !data.status || !data.data?.authorization_url) throw new Error(data.message || "Paystack init failed");
    return { checkoutUrl: data.data.authorization_url as string };
  },

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${SECRET()}` },
    });
    const data = await res.json();
    const d = data?.data;
    const status = d?.status === "success" ? "success" : d?.status === "failed" ? "failed" : "pending";
    return { status, amountNaira: Math.round((d?.amount ?? 0) / 100), currency: d?.currency ?? "NGN", reference };
  },

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const sig = headers.get("x-paystack-signature");
    if (!sig || !SECRET()) return false;
    const hash = crypto.createHmac("sha512", SECRET()).update(rawBody).digest("hex");
    try { return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig)); } catch { return false; }
  },

  parseWebhook(rawBody: string): WebhookEvent {
    try {
      const evt = JSON.parse(rawBody);
      const d = evt?.data;
      if (!d?.reference) return null;
      const status = evt?.event === "charge.success" || d?.status === "success" ? "success" : d?.status === "failed" ? "failed" : "pending";
      return { reference: d.reference, status, amountNaira: Math.round((d.amount ?? 0) / 100) };
    } catch { return null; }
  },

  // ── Marketplace / multivendor (Paystack Subaccounts + Transfers) ──
  // Vendor settlement subaccount with marketplace commission (percentage_charge).
  async createSubaccount({ businessName, bankCode, accountNumber, percentageCharge }) {
    const res = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ business_name: businessName, settlement_bank: bankCode, account_number: accountNumber, percentage_charge: percentageCharge }),
    });
    const data = await res.json();
    if (!res.ok || !data.status || !data.data?.subaccount_code) throw new Error(data.message || "Subaccount creation failed");
    return { subaccountCode: data.data.subaccount_code as string };
  },

  // Register the vendor's bank as a transfer recipient (for payouts/withdrawals).
  async createTransferRecipient({ name, bankCode, accountNumber }) {
    const res = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "nuban", name, account_number: accountNumber, bank_code: bankCode, currency: "NGN" }),
    });
    const data = await res.json();
    if (!res.ok || !data.status || !data.data?.recipient_code) throw new Error(data.message || "Recipient creation failed");
    return { recipientCode: data.data.recipient_code as string };
  },

  // Initiate a payout transfer to a vendor recipient (amount in kobo).
  async initiateTransfer({ amountNaira, recipientCode, reason }) {
    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "balance", amount: Math.round(amountNaira * 100), recipient: recipientCode, reason: reason || "Vendor payout" }),
    });
    const data = await res.json();
    if (!res.ok || !data.status || !data.data?.transfer_code) throw new Error(data.message || "Transfer failed");
    return { transferCode: data.data.transfer_code as string, status: String(data.data.status ?? "pending") };
  },
  // NOTE: createDedicatedAccount (per-vendor NUBAN payin) is intentionally left
  // unimplemented — it needs a Paystack Customer (email/KYC) + the Dedicated NUBAN
  // feature activated. The demo path mints a demo number; wire when DVA is live.
  // Subaccounts + Transaction Split above are the core multivendor settlement.
};
