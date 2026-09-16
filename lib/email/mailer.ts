// NOTE: intentionally NOT importing "server-only" — this module is pulled in by
// lib/auth.ts, which is also loaded by Node scripts (e.g. the legacy importer)
// outside Next's bundler where the "server-only" shim can't resolve. It is only
// ever imported by server code, so the guard is unnecessary here.
import { Resend } from "resend";
import { resolveSiteUrl } from "@/lib/site-url";

/**
 * Transactional email via Resend.
 *
 * Config comes from env (Doppler → Render/Vercel), never hardcoded:
 *   RESEND_API_KEY   — Resend API key (required to send)
 *   RESEND_FROM      — sender, e.g. "Nomarc <info@nomarcprojects.com>";
 *                      defaults to EMAIL_FROM if unset
 *
 * If Resend isn't configured (e.g. a preview env), we log and no-op instead of
 * throwing, so auth flows never hard-fail.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || process.env.EMAIL_FROM || "Nomarc Projects <info@nomarcprojects.com>";
export const EMAIL_FROM = process.env.EMAIL_FROM || "Nomarc Projects <info@nomarcprojects.com>";

export const isEmailConfigured = Boolean(RESEND_API_KEY);

let resend: Resend | null = null;
function getResend() {
  if (!isEmailConfigured) return null;
  if (!resend) resend = new Resend(RESEND_API_KEY);
  return resend;
}

/**
 * `replyTo` is honored by Resend. `fromName` is accepted for call-site
 * compatibility but ignored — with Resend the From (including its display
 * name) must match the verified sender in `RESEND_FROM`, and cannot be varied
 * per message without risking SPF/DKIM failure.
 */
export async function sendEmail({ to, subject, html, text, replyTo, fromName: _fromName }: {
  to: string; subject: string; html: string; text?: string; replyTo?: string; fromName?: string;
}) {
  if (!RESEND_API_KEY) {
    // In dev/preview a missing mailer is expected, so no-op rather than break
    // every auth flow. In production it means verification and password-reset
    // mail is silently vanishing — throw so it surfaces instead of leaving
    // users staring at "check your inbox" for mail that was never sent.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email not configured — refusing to silently drop email \"" + subject + "\"");
    }
    console.warn(`[mailer] Resend not configured — skipped email "${subject}" → ${to}`);
    return { skipped: true };
  }
  await getResend()!.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    html,
    text: text || stripHtml(html),
    replyTo: replyTo?.trim() || undefined,
  });
  return { skipped: false };
}

export type BulkEmail = {
  to: string; subject: string; html: string; text?: string; replyTo?: string;
};

export type BulkEmailResult = {
  to: string;
  /** Set when Resend accepted the message. */
  id?: string;
  /** Set when Resend rejected the message inside the batch. */
  error?: string;
};

/**
 * Send many emails in one API call via Resend's batch endpoint
 * (`POST /emails/batch`), with permissive validation so a single bad address
 * doesn't reject the whole slice — each message is attributed to its recipient
 * through the response's `errors[].index`.
 *
 * Used by the campaign drain instead of N sequential `emails.send` calls: one
 * round-trip per slice rather than one per recipient, which is what lets a
 * large blast finish inside the drain route's wall-clock budget.
 */
export async function sendBulkEmails(emails: BulkEmail[]): Promise<BulkEmailResult[]> {
  if (!RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Email not configured — refusing to silently drop ${emails.length} email(s)`);
    }
    console.warn(`[mailer] Resend not configured — skipped bulk send of ${emails.length} email(s)`);
    return emails.map((e) => ({ to: e.to }));
  }
  if (emails.length === 0) return [];

  const r = getResend()!;
  const payload = emails.map((e) => ({
    from: RESEND_FROM,
    to: e.to,
    subject: e.subject,
    html: e.html,
    text: e.text || stripHtml(e.html),
    replyTo: e.replyTo?.trim() || undefined,
  }));
  const { data, error } = await r.batch.send(payload, { batchValidation: "permissive" });
  if (error) throw new Error(error.message);

  const accepted = ((data as { data?: { id: string }[] })?.data ?? []);
  const failures = (data as { errors?: { index: number; message: string }[] })?.errors ?? [];
  const errorByIndex = new Map(failures.map((f) => [f.index, f.message]));

  return emails.map((e, i) => {
    const err = errorByIndex.get(i);
    return err ? { to: e.to, error: err } : { to: e.to, id: accepted[i]?.id };
  });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Escape text before it goes into an email body.
 *
 * `emailLayout` interpolates its fields raw, which is right for the admin
 * broadcast/campaign paths that legitimately author HTML — but the Better Auth
 * templates were interpolating `user.name`, and a display name is chosen by
 * whoever signed up. A name containing markup rendered as HTML in the
 * recipient's mail client, on the password-reset email of all things. Escape
 * anything user-supplied at the call site.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SITE = resolveSiteUrl();
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Absolute site origin, no trailing slash. Exported so the mail paths that need
 *  to build links (shortcodes, unsubscribe) share one resolution instead of each
 *  keeping its own copy. */
export function siteUrl(): string {
  return SITE;
}

/** Support address. NOT support@ — that mailbox does not exist (see components/coming-soon.tsx). */
const SUPPORT_EMAIL = "info@nomarcprojects.com";

/**
 * Branded transactional email shell for Nomarc Projects.
 *
 * Colours: Nomarc Yellow #FFD716, Off-Black #1E1E1E, White, grey #F1F1F1.
 * Tables + inline styles only, because no external stylesheet and no modern
 * layout survives Outlook.
 *
 * The brand is an image (`/logos/wordmark-on-light.png`) rather than the text
 * lockup this used to render, and it must be an absolute URL: a relative path
 * resolves against nothing in a mail client. `alt` carries the name so the
 * header still reads when images are blocked, which is the common case in
 * Outlook and in Gmail's default for unknown senders.
 *
 * Deliberately no social icons: the only social URLs in the codebase are
 * placeholders (x.com, linkedin.com), and icons landing on a platform homepage
 * read as broken.
 *
 * `unsubscribeUrl` gates the unsubscribe line, so transactional mail (password
 * reset, sign-in codes) never invites the recipient to unsubscribe from the
 * thing keeping them in their account. Passing it also switches the footer's
 * "why am I getting this" wording from account-action to bulk.
 */
export function emailLayout(opts: {
  heading: string;
  body: string;
  /** Centred line under the heading, e.g. "Thank you for registering". */
  subheading?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Boxed callout under the CTA, for expiry/security notes. */
  notice?: { title: string; text: string };
  footnote?: string;
  eyebrow?: string;
  preheader?: string;
  /** Bulk mail only. Omit on transactional mail to hide the unsubscribe line. */
  unsubscribeUrl?: string;
}) {
  const { heading, body, subheading, ctaLabel, ctaUrl, notice, footnote, eyebrow, preheader, unsubscribeUrl } = opts;

  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</div>`
    : "";
  const eyebrowHtml = eyebrow
    ? `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#caa400;text-align:center;">${escapeHtml(eyebrow)}</p>`
    : "";
  const subheadingHtml = subheading
    ? `<p style="margin:0 0 4px;color:#6b6b6b;font-size:14.5px;line-height:1.6;text-align:center;">${escapeHtml(subheading)}</p>`
    : "";

  // Full-width button (the reference's is inline-width; ours fills the column).
  // display:block on the anchor inside a 100%-width cell is what makes Outlook
  // stretch it rather than shrink-wrapping the label.
  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;">
         <tr><td align="center" style="border-radius:10px;background:#ffd716;">
           <a href="${ctaUrl}" style="display:block;padding:15px 24px;font-family:${FONT};font-size:15px;font-weight:700;color:#1e1e1e;text-decoration:none;text-align:center;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
         </td></tr>
       </table>`
    : "";

  const noticeHtml = notice
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
         <tr><td style="padding:16px 18px;background:#faf9f4;border:1px solid #ececec;border-radius:12px;">
           <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;font-weight:700;color:#1e1e1e;">${escapeHtml(notice.title)}</p>
           <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.65;color:#6b6b6b;">${escapeHtml(notice.text)}</p>
         </td></tr>
       </table>`
    : "";

  const foot = footnote
    ? `<p style="margin:20px 0 0;color:#9a9a9a;font-size:12.5px;line-height:1.7;">${footnote}</p>`
    : "";

  const unsubscribeHtml = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="color:#6b6b6b;text-decoration:underline;">Unsubscribe</a>
       &nbsp;&middot;&nbsp; `
    : "";

  const whyHtml = unsubscribeUrl
    ? "You received this email because you have a Nomarc Projects account."
    : "You received this email because an account action was requested for this address.";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#f1f1f1;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1f1;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">

        <!-- logo -->
        <tr><td align="center" style="padding:36px 32px 22px;">
          <img src="${SITE}/logos/wordmark-on-light.png" alt="Nomarc Projects" width="168" style="display:block;width:168px;max-width:168px;height:auto;border:0;outline:none;text-decoration:none;font-family:${FONT};font-size:17px;font-weight:800;color:#1e1e1e;" />
        </td></tr>

        <!-- heading -->
        <tr><td style="padding:0 32px;font-family:${FONT};">
          ${eyebrowHtml}
          <h1 style="margin:0 0 8px;color:#1e1e1e;font-size:23px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;text-align:center;">${escapeHtml(heading)}</h1>
          ${subheadingHtml}
        </td></tr>

        <!-- body -->
        <tr><td style="padding:22px 32px 30px;font-family:${FONT};">
          <div style="color:#4b4b4b;font-size:15px;line-height:1.7;">${body}</div>
          ${cta}
          ${noticeHtml}
          ${foot}
        </td></tr>

        <!-- need help -->
        <tr><td style="padding:0 32px;">
          <div style="border-top:1px solid #ececec;"></div>
        </td></tr>
        <tr><td style="padding:24px 32px 30px;font-family:${FONT};">
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1e1e1e;">Need help?</p>
          <p style="margin:0 0 10px;color:#6b6b6b;font-size:14px;line-height:1.6;">Our team is happy to help you get set up.</p>
          <p style="margin:0;font-size:14px;">
            <a href="mailto:${SUPPORT_EMAIL}" style="color:#1e1e1e;text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a>
          </p>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:24px 32px;background:#fafafa;border-top:1px solid #ececec;font-family:${FONT};">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e1e1e;">Nomarc Projects</p>
          <p style="margin:0 0 14px;color:#9a9a9a;font-size:12.5px;line-height:1.6;">The digital home for Nigeria&rsquo;s construction ecosystem; find work, hire verified talent, source materials and manage projects, all in one place.</p>
          <p style="margin:0 0 12px;font-size:12.5px;">
            ${unsubscribeHtml}<a href="${SITE}/privacy" style="color:#6b6b6b;text-decoration:none;">Privacy Policy</a>
            &nbsp;&middot;&nbsp; <a href="${SITE}/terms" style="color:#6b6b6b;text-decoration:none;">Terms of Service</a>
          </p>
          <p style="margin:0;color:#b3b3b3;font-size:11px;line-height:1.6;">
            ${whyHtml}<br/>
            Operated by Nomadic Architects &middot; Lagos, Nigeria &middot; &copy; ${new Date().getFullYear()} Nomarc Projects. All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}
