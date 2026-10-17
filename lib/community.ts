/**
 * The Nomarc community lives off-platform in a WhatsApp group. Joining means
 * following the invite link, but we never want to dead-end visitors who don't
 * have an account yet — so the marketing buttons branch on auth state and an
 * internal handoff route bridges the two.
 *
 * Flow:
 *   signed in  → straight to COMMUNITY_WHATSAPP_URL
 *   signed out → /signup?redirect=COMMUNITY_HANDOFF_PATH
 *              → (verify email) → COMMUNITY_HANDOFF_PATH → WhatsApp
 */
export const COMMUNITY_WHATSAPP_URL =
  "https://chat.whatsapp.com/GQ9JFeCxzjf5qrMiZ9lCIc?s=cl&p=a&mlu=4&ilr=4";

/** Internal path the auth flow returns to; it then forwards to WhatsApp. */
export const COMMUNITY_HANDOFF_PATH = "/join-community";

/** Signup URL that remembers the visitor came from "Join Community". */
export function communitySignupHref(): string {
  return `/signup?redirect=${encodeURIComponent(COMMUNITY_HANDOFF_PATH)}`;
}
