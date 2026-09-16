/**
 * Per-tier entitlements for the exhibitor ladder.
 *
 * A plain module, not "use server": a "use server" file may only export async
 * functions, and exporting a const from one strips every export. Same reason
 * ./exhibitor-trial-rules.ts is split from ./exhibitor-trial.ts.
 *
 * These are the numbers on the Figma billing screen. `getTrialState()` is the
 * single reader — resolve caps through it rather than importing these directly
 * into UI, or the "can I publish?" answer will drift between screens.
 */

import type { ExhibitorPlan } from "@/lib/entitlements";

/** Simultaneously published (status = "active") product listings allowed. */
export const EXHIBITOR_LISTING_CAP: Record<ExhibitorPlan, number> = {
  free: 0,
  sme: 1,
  exhibitor: 5,
  key_player: 10,
};

/** Profile promotion ads bundled with the tier ("Includes 1 active profile promotion ad"). */
export const EXHIBITOR_PROFILE_ADS: Record<ExhibitorPlan, number> = {
  free: 0,
  sme: 0,
  exhibitor: 0,
  key_player: 1,
};

/** Feature bullets shown on the plan card and in checkout. */
export function exhibitorPlanFeatures(plan: Exclude<ExhibitorPlan, "free">): string[] {
  const cap = EXHIBITOR_LISTING_CAP[plan];
  const ads = EXHIBITOR_PROFILE_ADS[plan];
  return [
    `Max of ${cap} active product listing${cap === 1 ? "" : "s"}.`,
    ...(ads > 0 ? [`Includes ${ads} active profile promotion ad.`] : []),
  ];
}
