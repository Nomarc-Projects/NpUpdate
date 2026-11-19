/**
 * Platform terms acceptance versioning.
 *
 * Bump CURRENT_TERMS_VERSION whenever users must explicitly re-accept updated
 * Terms/Privacy. Stored per-user with acceptance timestamp for auditability.
 */
export const CURRENT_TERMS_VERSION = "2026-11-19";

/** Cookie set by the signup UI when the user agrees before account creation/OAuth. */
export const TERMS_ACCEPTED_COOKIE = "nomarc_terms_agreed";
