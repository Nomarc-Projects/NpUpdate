/**
 * Route helpers for matching the current pathname to a page tour.
 *
 * `normalizeRoute` collapses dynamic detail segments so
 * `/dashboard/project-management/abc123` matches the
 * `/dashboard/project-management/[id]` shape. `pageTourIdFor` maps a normalized
 * route to the id of the page tour that covers it (or null when none exists).
 */

/**
 * Detail-route shapes. Every pattern excludes the literal sub-routes that share
 * its depth (`saved`, `post`, `posted`, `new`, …) — those are real pages with
 * their own layouts, and folding them into the `[id]` shape would make their
 * tour unreachable.
 */
const DYNAMIC_PATTERNS: Array<[RegExp, string]> = [
  [/^\/dashboard\/project-management\/[^/]+$/, "/dashboard/project-management/[id]"],
  [/^\/dashboard\/jobs\/(?!saved$|post$|posted$)[^/]+$/, "/dashboard/jobs/[id]"],
  [/^\/dashboard\/products\/(?!saved$)[^/]+$/, "/dashboard/products/[id]"],
  [/^\/dashboard\/my-products\/[^/]+$/, "/dashboard/my-products/[id]"],
  [/^\/dashboard\/quotes\/[^/]+$/, "/dashboard/quotes/[id]"],
  [/^\/dashboard\/orders\/[^/]+$/, "/dashboard/orders/[id]"],
  [/^\/dashboard\/my-orders\/[^/]+$/, "/dashboard/my-orders/[id]"],
  [/^\/dashboard\/applications\/(?!drafts$)[^/]+$/, "/dashboard/applications/[id]"],
  [/^\/dashboard\/messages\/[^/]+$/, "/dashboard/messages/[id]"],
  [/^\/dashboard\/people\/[^/]+$/, "/dashboard/people/[id]"],
  [/^\/dashboard\/companies\/[^/]+$/, "/dashboard/companies/[id]"],
];

export function normalizeRoute(pathname: string): string {
  // Drop query/hash defensively, then trailing slashes.
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  for (const [pattern, replacement] of DYNAMIC_PATTERNS) {
    if (pattern.test(clean)) return replacement;
  }
  return clean;
}

/**
 * Normalized route → page tour id. Detail routes (`[id]`) intentionally have no
 * tour: they're driven by the record in front of you, not by a fixed layout.
 *
 * Every entry must have a matching page-tour def in the role registry, or the
 * launcher's "Tour this page" item stays disabled on that route.
 */
const ROUTE_TO_TOUR: Record<string, string> = {
  // Professional tools
  "/dashboard/ai-consultant": "helm-page",
  "/dashboard/project-management": "pm-page",
  "/dashboard/jobs": "jobs-page",
  "/dashboard/applications": "applications-page",
  "/dashboard/profile": "profile-page",
  "/dashboard/services": "services-page",
  "/dashboard/practice-templates": "practice-templates-page",
  "/dashboard/digital-seal": "digital-seal-page",
  "/dashboard/building-permit": "building-permit-page",
  "/dashboard/bim-tools": "bim-tools-page",
  "/dashboard/industry-report": "industry-report-page",
  "/dashboard/verified-pros": "verified-pros-page",
  // Exhibitor
  "/dashboard/my-products": "my-products-page",
  "/dashboard/quotes": "quotes-page",
  "/dashboard/orders": "orders-page",
  "/dashboard/customers": "customers-page",
  "/dashboard/wallet": "wallet-page",
  "/dashboard/company": "company-page",
  "/dashboard/add-product": "add-product-page",
  // Employer
  "/dashboard/jobs/post": "post-job-page",
  "/dashboard/jobs/posted": "posted-jobs-page",
  "/dashboard/find-professionals": "find-professionals-page",
  // Shared
  "/dashboard/messages": "messages-page",
  "/dashboard/directory": "people-page",
  "/dashboard/people": "people-page",
  "/dashboard/companies": "companies-page",
  "/dashboard/lists": "lists-page",
  "/dashboard/settings": "settings-page",
  "/dashboard/notifications": "notifications-page",
  "/dashboard/support": "support-page",
  "/dashboard/plans": "plans-page",
  "/dashboard/billing": "billing-page",
};

export function pageTourIdFor(pathname: string): string | null {
  return ROUTE_TO_TOUR[normalizeRoute(pathname)] ?? null;
}
