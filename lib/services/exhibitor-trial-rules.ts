/**
 * Constants and types for the exhibitor publishing state.
 *
 * Deliberately a plain module, not "use server": a "use server" file may only
 * export async functions, and exporting a const from one strips every export
 * from the module. The async side lives in ./exhibitor-trial.ts.
 */

import type { ExhibitorPlan } from "@/lib/entitlements";

export const TRIAL_DAYS = 30;

export type TrialState = {
  /** No company yet — the caller isn't an exhibitor. */
  isExhibitor: boolean;
  /** Holds an active, unexpired paid exhibitor plan. Publishing requires this. */
  subscribed: boolean;
  /** The exhibitor tier this account is on; "free" when unsubscribed. */
  plan: ExhibitorPlan;
  inTrial: boolean;
  /** Whole days left in the window; 0 once it has lapsed. */
  daysLeft: number;
  publishedCount: number;
  /** Published listings allowed right now — 0 unless a paid plan is active. */
  listingCap: number;
  /** May this exhibitor publish one more product right now? */
  canPublish: boolean;
  /** Why not, when canPublish is false — drives the plan prompt the UI raises. */
  reason: "ok" | "plan_limit_reached" | "plan_required" | "not_exhibitor";
};

/** Active listings currently sitting in one registered shop/category. */
export type ExhibitorCategoryUsage = { name: string; count: number };

/**
 * A flat read of the exhibitor's plan and how much of it is already used, for
 * the plan/limit banners. Caps themselves are owned by contributor
 * ./exhibitor-plan-rules.ts and resolved through `getExhibitorLimitSummary()`.
 */
export type ExhibitorLimitSummary = {
  plan: ExhibitorPlan;
  planLabel: string;
  /** Categories (shops) the plan allows, and how many are registered. */
  categoryCap: number;
  categoryUsed: number;
  /** Max active products in any one category. */
  perCategoryCap: number;
  /** Total active listing allowance: categoryCap × perCategoryCap. */
  totalCap: number;
  totalActive: number;
  /** Per-category active counts for the registered shops. */
  categories: ExhibitorCategoryUsage[];
  /** Every category slot is taken. */
  atCategoryLimit: boolean;
  /** A category is full, or the overall listing allowance is. */
  atUploadLimit: boolean;
  /** The next tier up, if any — for the upgrade CTA. */
  nextPlanLabel: string | null;
};
