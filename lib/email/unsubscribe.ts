import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "./mailer";

/**
 * Signed, login-free unsubscribe links.
 *
 * app/(marketing)/privacy already promises recipients they can unsubscribe "by
 * clicking the 'unsubscribe' link at the bottom of our communications", and the
 * composer offers a {{unsubscribe_url}} token, but neither the link nor any
 * opt-out storage existed. Bulk mail without a working one is both a compliance
 * problem and a deliverability one.
 *
 * No session is required: someone who cannot sign in (or has stopped wanting
 * to) must still be able to opt out. The link is therefore a capability URL,
 * signed with the app secret so it cannot be forged to unsubscribe a third
 * party by guessing their user id.
 */
function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
  if (!s) {
    // Unverifiable tokens in production would either reject every genuine
    // unsubscribe or accept forged ones. Neither is acceptable, so fail loudly.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set — cannot sign unsubscribe links");
    }
    return "dev-only-unsubscribe-secret";
  }
  return s;
}

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url");
}

/** Per-recipient unsubscribe URL. Absolute, so campaign click-tracking can wrap it. */
export function unsubscribeUrlFor(userId: string): string {
  return `${siteUrl()}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

/** Constant-time check, so a wrong token leaks nothing through timing. */
export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  if (!userId || !token) return false;
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(token);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}
