/**
 * Canonical job vocabulary shared by the Find Jobs filters, the post-job
 * wizard, and every admin/employer edit surface. These labels are stored
 * verbatim in the job's `employment_type` / `work_model` columns, so changing
 * a value here changes the options and the filter matches everywhere.
 *
 * "Remote" describes where the work happens, so it belongs to WORK_MODELS
 * only — never to EMPLOYMENT_TYPES.
 */
export const EMPLOYMENT_TYPES: readonly string[] = [
  "Full-time",
  "Part-time",
  "Internship",
  "Contract",
];

export const WORK_MODELS: readonly string[] = ["On-site", "Hybrid", "Remote"];
