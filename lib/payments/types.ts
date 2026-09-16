export type ProviderName = "paystack" | "flutterwave" | "seerbit";

export type InitParams = {
  email: string;
  amountNaira: number;   // server-computed; never from the client
  reference: string;     // server-generated unique reference
  callbackUrl: string;   // where the provider returns the user
  metadata?: Record<string, unknown>;
};

export type VerifyResult = {
  status: "success" | "failed" | "pending";
  amountNaira: number;   // amount the provider actually charged (verified)
  currency: string;
  reference: string;
};

export type WebhookEvent = { reference: string; status: "success" | "failed" | "pending"; amountNaira: number } | null;

export interface PaymentProvider {
  readonly name: ProviderName;
  /** True only when all required secrets are present. */
  isConfigured(): boolean;
  /** Create a hosted checkout; returns the URL to redirect the user to. */
  init(params: InitParams): Promise<{ checkoutUrl: string }>;
  /** Re-check a transaction directly with the provider (source of truth). */
  verify(reference: string): Promise<VerifyResult>;
  /** Verify a webhook's authenticity from the RAW body + headers. */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  /** Parse a verified webhook payload into a normalized event. */
  parseWebhook(rawBody: string): WebhookEvent;

  // ── Marketplace / multivendor (optional; implemented by Paystack) ──
  /** Create a vendor subaccount (settlement bank + commission %). */
  createSubaccount?(input: { businessName: string; bankCode: string; accountNumber: string; percentageCharge: number }): Promise<{ subaccountCode: string }>;
  /** Create a dedicated virtual (NUBAN) account, optionally bound to a subaccount/split. */
  createDedicatedAccount?(input: { name: string; subaccountCode?: string; splitCode?: string }): Promise<{ accountNumber: string; bank: string }>;
  /** Register a transfer recipient (vendor bank) for payouts. */
  createTransferRecipient?(input: { name: string; bankCode: string; accountNumber: string }): Promise<{ recipientCode: string }>;
  /** Initiate a payout transfer to a recipient. */
  initiateTransfer?(input: { amountNaira: number; recipientCode: string; reason?: string }): Promise<{ transferCode: string; status: string }>;
}
