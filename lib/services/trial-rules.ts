/**
 * Trial constants — plain module so it can be imported by both
 * server and client code without "use server" restrictions.
 */

export const TRIAL_DAYS = 14;
export const DAY_MS = 24 * 60 * 60 * 1000;

export function getTrialDays(): number {
  return TRIAL_DAYS;
}