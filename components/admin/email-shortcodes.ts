/**
 * Merge tags the sender substitutes per recipient.
 *
 * Kept as plain `{{token}}` text rather than a TipTap node so they survive the
 * round trip through getHTML() → database → the email template without needing a
 * custom serializer, and so an admin can type or delete one by hand.
 *
 * Substitution lives in lib/email/shortcodes.ts. **Keep the two lists in sync**;
 * a token offered here but not handled there ships to the recipient as literal
 * `{{…}}` text.
 */
export type Shortcode = { token: string; label: string; hint: string };

export const SHORTCODES: Shortcode[] = [
  { token: "{{first_name}}", label: "First name", hint: "Falls back to “there”" },
  { token: "{{full_name}}", label: "Full name", hint: "The account name" },
  { token: "{{email}}", label: "Email address", hint: "The recipient’s address" },
  { token: "{{company}}", label: "Company", hint: "Blank for individuals" },
  { token: "{{dashboard_url}}", label: "Dashboard link", hint: "Straight into their account" },
  { token: "{{reset_password_url}}", label: "Password reset link", hint: "For the migration blast" },
  { token: "{{unsubscribe_url}}", label: "Unsubscribe link", hint: "Required in bulk email" },
];

/** The subset that resolves to a URL, so the CTA picker only offers usable targets. */
export const URL_SHORTCODES: Shortcode[] = SHORTCODES.filter((s) => s.token.endsWith("_url}}"));
