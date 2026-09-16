import "server-only";
import { paystack } from "./paystack";
import { flutterwave } from "./flutterwave";
import { seerbit } from "./seerbit";
import type { PaymentProvider, ProviderName } from "./types";

const ALL: Record<ProviderName, PaymentProvider> = { paystack, flutterwave, seerbit };

export function getProvider(name: ProviderName): PaymentProvider {
  return ALL[name];
}

/** The active provider: an explicit PAYMENT_PROVIDER if configured, else the
 *  first configured one, else null (→ demo mode). */
export function activeProvider(): PaymentProvider | null {
  const pref = process.env.PAYMENT_PROVIDER as ProviderName | undefined;
  if (pref && ALL[pref]?.isConfigured()) return ALL[pref];
  return [paystack, flutterwave, seerbit].find((p) => p.isConfigured()) ?? null;
}

/**
 * Which gateways can actually take a payment right now. Drives the checkout
 * selector, so a provider whose keys are missing renders disabled instead of
 * the UI hardcoding a guess and sending the buyer to a dead redirect.
 */
export function configuredProviders(): ProviderName[] {
  return ([paystack, flutterwave, seerbit] as const).filter((p) => p.isConfigured()).map((p) => p.name);
}

export type { ProviderName };
