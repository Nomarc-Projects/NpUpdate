/**
 * Email hygiene helpers used across auth flows.
 *
 * - `stripEmailSpaces` removes any whitespace as the user types so a stray
 *   space can never end up in the address.
 * - `normalizeEmail` produces a canonical form used for de-duplication so that
 *   provider aliases resolve to the same account — e.g. Gmail ignores dots and
 *   everything after a `+` in the local part, and treats googlemail.com as
 *   gmail.com. This mirrors how Google itself deduplicates addresses.
 */

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** Remove all whitespace from an email string. Wire into email onChange. */
export function stripEmailSpaces(value: string): string {
  return value.replace(/\s+/g, "");
}

/**
 * Canonical form of an email for equality/dedup checks. Never store this as the
 * login address — it's only for "is this the same person" comparisons.
 */
export function normalizeEmail(value: string): string {
  const email = stripEmailSpaces(value).toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);

  // Strip +tag sub-addressing for every provider that supports it.
  const plus = local.indexOf("+");
  if (plus !== -1) local = local.slice(0, plus);

  // Gmail-specific: dots are insignificant and googlemail === gmail.
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
    domain = "gmail.com";
  }

  return `${local}@${domain}`;
}

/** True when two addresses resolve to the same canonical account. */
export function sameEmail(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b);
}
