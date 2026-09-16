/**
 * Fire-and-forget impression/click reporting for paid promotions.
 *
 * Deliberately not a server action: this runs on public marketing pages for
 * signed-out visitors, and a failed counter must never surface an error or
 * block a navigation. `keepalive` lets the click beacon survive the page
 * unloading as the user follows the link.
 */
export function trackPromotion(promotionId: string, kind: "view" | "click"): void {
  if (typeof window === "undefined" || !promotionId) return;
  try {
    void fetch("/api/promotions/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: promotionId, kind }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* counting is best-effort */
  }
}
