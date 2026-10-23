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

/** Product categories (shops) allowed per tier. */
export const EXHIBITOR_CATEGORY_CAP: Record<ExhibitorPlan, number> = {
  free: 0,
  sme: 1,
  exhibitor: 5,
  key_player: 10,
};

/**
 * Total active listings a plan allows. Exhibitors may spread this across their
 * registered categories however they like — there is no per-category cap.
 */
export const EXHIBITOR_PRODUCT_CAP: Record<ExhibitorPlan, number> = {
  free: 0,
  sme: 10,
  exhibitor: 50,
  key_player: 100,
};

/** Total active listings allowed on a plan, regardless of category split. */
export function getExhibitorTotalListingCap(plan: ExhibitorPlan): number {
  return EXHIBITOR_PRODUCT_CAP[plan];
}

/** Profile promotion ads bundled with the tier ("Includes 1 active profile promotion ad"). */
export const EXHIBITOR_PROFILE_ADS: Record<ExhibitorPlan, number> = {
  free: 0,
  sme: 0,
  exhibitor: 0,
  key_player: 1,
};

/** Feature bullets shown on the plan card and in checkout. */
export function exhibitorPlanFeatures(plan: Exclude<ExhibitorPlan, "free">): string[] {
  const catCap = EXHIBITOR_CATEGORY_CAP[plan];
  const total = EXHIBITOR_PRODUCT_CAP[plan];
  const ads = EXHIBITOR_PROFILE_ADS[plan];
  return [
    `Up to ${catCap} product categor${catCap === 1 ? "y" : "ies"} (shops).`,
    `${total} product uploads in total — split them across your categories however you like.`,
    ...(ads > 0 ? [`Includes ${ads} active profile promotion ad.`] : []),
  ];
}

/** Default plan for new exhibitor signups (before they subscribe). */
export const DEFAULT_EXHIBITOR_PLAN = "sme" as const;
