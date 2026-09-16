import { siteUrl } from "./mailer";

/**
 * Per-recipient open/click tracking, applied to a campaign body just before send.
 *
 * Extracted from lib/services/campaigns.ts so the drain (which must not live in a
 * "use server" module) can reuse it rather than keep a second copy that drifts.
 *
 * Only SAME-ORIGIN links are rewritten. The click route refuses to forward
 * off-site (that would make it an open redirect trading on our domain), so
 * wrapping an external link would quietly strand the recipient on the homepage.
 * External links are therefore left untouched: untracked, but working. Links
 * already pointing at the tracker are skipped so a re-send can't double-wrap.
 */
export function withTracking(html: string, campaignId: string, userId: string): string {
  const base = siteUrl();
  const host = (() => {
    try { return new URL(base).host; } catch { return ""; }
  })();

  const rewritten = html.replace(/href="(https?:\/\/[^"]+)"/gi, (m, url: string) => {
    if (url.includes("/api/email/click")) return m;
    let sameOrigin = false;
    try { sameOrigin = new URL(url).host === host; } catch { sameOrigin = false; }
    if (!sameOrigin) return m;
    return `href="${base}/api/email/click?c=${encodeURIComponent(campaignId)}&u=${encodeURIComponent(userId)}&url=${encodeURIComponent(url)}"`;
  });

  const pixel = `<img src="${base}/api/email/open?c=${encodeURIComponent(campaignId)}&u=${encodeURIComponent(userId)}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`;
  return `${rewritten}${pixel}`;
}
