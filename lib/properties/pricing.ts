/**
 * Listing-fee calculator for Nomarc Projects.
 *
 * Pure and isomorphic: the wizard uses it for the real-time quote and every
 * server action recomputes with it before charging anything. Money is handled
 * in minor units (kobo/cents), never floats.
 *
 * Model confirmed for launch:
 *   fee = flat fee + (normalised property value × bracket rate)
 * The bracket rate applies to the full value, not progressively. The brackets
 * are keyed by lower bound so the gaps in the original brief (₦900k–₦999k,
 * etc.) resolve to the lower bracket's rate rather than to no rate at all.
 */

export const NGN = "NGN" as const;

/** Placeholder launch default — configurable in the admin Properties setting. */
export const DEFAULT_FLAT_LISTING_FEE_MINOR = 2_500_000; // ₦25,000 in kobo

/** NGN per one unit of foreign currency. Configurable; these are indicative
 *  defaults only and are not a live FX feed. */
export const DEFAULT_FX_RATES: Record<string, number> = {
  NGN: 1,
  USD: 1600,
  GBP: 2000,
};

export type FeeBracket = {
  /** Lower bound of the bracket in NGN minor units. */
  minMinor: number;
  /** Basis points: 200 = 2%, 10 = 0.1%. */
  rateBps: number;
  label: string;
};

/** Ordered high → low so lookup stops at the first matching lower bound. */
export const PROPERTY_FEE_BRACKETS: FeeBracket[] = [
  { minMinor: 100_000_000_000, rateBps: 10, label: "₦1,000,000,000+" },
  { minMinor: 10_000_000_000, rateBps: 20, label: "₦100,000,000 – ₦999,999,999" },
  { minMinor: 1_000_000_000, rateBps: 50, label: "₦10,000,000 – ₦99,999,999" },
  { minMinor: 100_000_000, rateBps: 100, label: "₦1,000,000 – ₦9,999,999" },
  { minMinor: 10_000_000, rateBps: 200, label: "₦100,000 – ₦999,999" },
];

export type ListingFeeInput = {
  /** Property value in the listing currency, minor units. */
  valueMinor: number;
  currency?: string;
  flatFeeMinor?: number;
  fxRates?: Record<string, number>;
};

export type ListingFeeResult = {
  /** Value in the listing currency, minor units. */
  valueMinor: number;
  /** Normalised value in NGN minor units. */
  valueNgnMinor: number;
  currency: string;
  flatFeeMinor: number;
  rateBps: number;
  bracketLabel: string;
  percentageFeeMinor: number;
  totalFeeMinor: number;
};

/** Convert a listing value into NGN minor units. Both sides are minor units, so
 *  `100_00` (USD 100.00) × 1600 → `160_000_00` (₦160,000.00). */
export function toNgnMinor(valueMinor: number, currency: string = NGN, fxRates: Record<string, number> = DEFAULT_FX_RATES): number {
  const code = currency.toUpperCase();
  if (code === NGN) return Math.round(valueMinor);
  const rate = fxRates[code];
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No FX rate configured for ${code}`);
  }
  return Math.round(valueMinor * rate);
}

export function bracketFor(valueNgnMinor: number): FeeBracket | null {
  return PROPERTY_FEE_BRACKETS.find((b) => valueNgnMinor >= b.minMinor) ?? null;
}

export function computeListingFee(input: ListingFeeInput): ListingFeeResult {
  const valueMinor = Math.max(0, Math.round(Number(input.valueMinor) || 0));
  const currency = (input.currency || NGN).toUpperCase();
  const flatFeeMinor = Math.max(
    0,
    Math.round(Number(input.flatFeeMinor ?? DEFAULT_FLAT_LISTING_FEE_MINOR) || 0),
  );
  const fxRates = input.fxRates ?? DEFAULT_FX_RATES;
  const valueNgnMinor = toNgnMinor(valueMinor, currency, fxRates);
  const bracket = bracketFor(valueNgnMinor);
  const rateBps = bracket?.rateBps ?? 0;
  const percentageFeeMinor = Math.round((valueNgnMinor * rateBps) / 10_000);
  const totalFeeMinor = flatFeeMinor + percentageFeeMinor;

  return {
    valueMinor,
    valueNgnMinor,
    currency,
    flatFeeMinor,
    rateBps,
    bracketLabel: bracket?.label ?? "Below ₦100,000",
    percentageFeeMinor,
    totalFeeMinor,
  };
}

/** Parse a user-entered price into minor units. Accepts commas, spaces and a
 *  leading currency symbol. Returns null for blank/invalid/negative input. */
export function parseMoneyToMinor(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  if (!cleaned || cleaned === ".") return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function minorToMajor(minor: number | null | undefined): number {
  return (Number(minor) || 0) / 100;
}

export function formatMoney(
  minor: number | null | undefined,
  currency: string = NGN,
  options?: { maximumFractionDigits?: number },
): string {
  const value = minorToMajor(minor);
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function formatRate(rateBps: number): string {
  return `${(rateBps / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}
