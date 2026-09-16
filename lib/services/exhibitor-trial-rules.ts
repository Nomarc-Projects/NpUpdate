/**
 * Constants and types for the exhibitor free trial.
 *
 * Deliberately a plain module, not "use server": a "use server" file may only
 * export async functions, and exporting a const from one strips every export
 * from the module. The async side lives in ./exhibitor-trial.ts.
 */

import type { ExhibitorPlan } from "@/lib/entitlements";

export const TRIAL_DAYS = 30;

/** Published listings allowed while on the free trial. */
export const FREE_PUBLISHED_LIMIT = 1;

export type TrialState = {
  /** No company yet — the caller isn't an exhibitor. */
  isExhibitor: boolean;
  subscribed: boolean;
  /** The exhibitor tier this account is on; "free" while on (or past) trial. */
  plan: ExhibitorPlan;
  inTrial: boolean;
  /** Whole days left in the window; 0 once it has lapsed. */
  daysLeft: number;
  publishedCount: number;
  /** Published listings allowed right now — from the plan, or the trial allowance. */
  listingCap: number;
  /** May this exhibitor publish one more product right now? */
  canPublish: boolean;
  /** Why not, when canPublish is false — drives which modal the UI raises. */
  reason: "ok" | "trial_limit_reached" | "trial_expired" | "plan_limit_reached" | "not_exhibitor";
};
