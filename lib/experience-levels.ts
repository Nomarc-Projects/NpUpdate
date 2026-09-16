/**
 * Canonical "Experience level" options for a job posting.
 *
 * Single source of truth shared by the Find Jobs filter (jobs-browse),
 * the post-job wizard, and every admin/employer edit surface. Values are
 * stored verbatim on the job's `experience_level` column, so the label IS
 * the stored value — the Find Jobs filter matches these by first-word prefix,
 * and changing a label here changes filter + editor options everywhere.
 */
export const EXPERIENCE_LEVELS = [
  "Entry level (0–2 yrs)",
  "Intermediate (3–5 yrs)",
  "Senior (6–9 yrs)",
  "Director (10+ yrs)",
] as const;