/**
 * Pricing units an exhibitor can sell by. Construction materials are quoted in
 * wildly different ways — tiles per square metre, cement per bag, rebar per
 * tonne, cable per metre — so the unit has to travel with the price or the
 * number is meaningless.
 *
 * The list below is a starting point, not a closed set: the wizard also accepts
 * a typed-in unit, since no fixed vocabulary survives contact with a real
 * catalogue. Kept as a plain module (no "use server") so client components can
 * import it directly.
 */
export const PRODUCT_UNITS = [
  "per piece",
  "per square metre",
  "per metre",
  "per linear metre",
  "per cubic metre",
  "per tonne",
  "per kg",
  "per bag",
  "per box",
  "per carton",
  "per pack",
  "per bundle",
  "per roll",
  "per litre",
  "per sheet",
  "per tile",
  "per block",
  "per 1000",
  "per truckload",
  "per set",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number] | (string & {});

/** Sentinel for the "something else" option in the unit picker. */
export const UNIT_CUSTOM = "__custom__";
