import { escapeHtml } from "./mailer";

/**
 * Merge-tag substitution for bulk email.
 *
 * The composer's toolbar (components/admin/rich-editor.tsx) has offered these
 * tokens since it was built, but nothing ever replaced them, so every campaign
 * composed with one would have delivered the literal text `{{first_name}}` to
 * the recipient. `{{reset_password_url}}` is the worst of them: its own hint
 * reads "For the migration blast", so the one email it exists for would have
 * shipped a dead link.
 *
 * Keep this list in sync with SHORTCODES in components/admin/rich-editor.tsx.
 */
export type ShortcodeRecipient = {
  id: string;
  name?: string | null;
  email: string;
  company?: string | null;
};

export type ShortcodeContext = {
  /** Absolute site origin, no trailing slash. Caller supplies it so this module
   *  doesn't become a third copy of the base-URL resolution. */
  baseUrl: string;
  /** Per-recipient signed unsubscribe link. Omit for transactional mail. */
  unsubscribeUrl?: string;
};

/**
 * Password reset deliberately points at the self-serve page rather than minting
 * a per-recipient token.
 *
 * A reset token is a bearer credential: whoever holds the link can take the
 * account. Generating 1,795 of them and posting them into inboxes leaves 1,795
 * live credentials sitting in mailboxes we don't control, most of them unread
 * for days. Sending people to a page where they re-enter their own address
 * costs one extra click and keeps the token's lifetime measured in minutes.
 */
function resetPasswordUrl(baseUrl: string): string {
  return `${baseUrl}/forgot-password`;
}

function firstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

/**
 * Replace every supported token in `html`.
 *
 * Tolerant of inner whitespace (`{{ first_name }}`) because the toolbar inserts
 * the tokens but an admin can also type or edit one by hand.
 *
 * Recipient-derived values are escaped: a display name is chosen by whoever
 * signed up, and this output is interpolated into an HTML email body.
 */
export function applyShortcodes(html: string, recipient: ShortcodeRecipient, ctx: ShortcodeContext): string {
  const values: Record<string, string> = {
    first_name: escapeHtml(firstName(recipient.name)),
    full_name: escapeHtml((recipient.name ?? "").trim() || "there"),
    email: escapeHtml(recipient.email),
    company: escapeHtml((recipient.company ?? "").trim()),
    dashboard_url: `${ctx.baseUrl}/dashboard`,
    reset_password_url: resetPasswordUrl(ctx.baseUrl),
    // Falling back to the site root rather than leaving the token in place: a
    // visible `{{unsubscribe_url}}` in a footer is worse than a link to a page
    // where the recipient can manage their account.
    unsubscribe_url: ctx.unsubscribeUrl || ctx.baseUrl,
  };

  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, rawToken: string) => {
    const token = rawToken.toLowerCase();
    return token in values ? values[token] : match;
  });
}

/** Sample values so "Send Test Email" previews what recipients will actually see. */
export function previewRecipient(email: string, name?: string | null): ShortcodeRecipient {
  return { id: "preview", email, name: name ?? "there", company: null };
}
