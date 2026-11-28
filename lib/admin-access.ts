/**
 * Single source of truth for admin section access.
 *
 * This is the ticket-62 `ROLE_ACCESS` table lifted out of
 * `components/admin/admin-nav.tsx` so the sidebar and the Dashboard consume the
 * same definition. The two untitled nav groups ("Dashboard" and
 * "Support Inbox") are given explicit section keys here — ticket-62 addressed
 * them by title, which meant those roles could never match them.
 *
 * Cards and nav entries declare *which section they belong to*; they never
 * carry their own role list. Changing a line in `ROLE_ACCESS` therefore changes
 * both what the menu shows and what the Dashboard counts.
 */

export const ADMIN_SECTIONS = [
  { key: "Dashboard", title: undefined, superOnly: false },
  { key: "Support Inbox", title: undefined, superOnly: false },
  { key: "Verifications", title: "Verifications", superOnly: false },
  { key: "User Management", title: "User Management", superOnly: false },
  /** Avatar/name/email roster. A nav item, not a group — still a section here. */
  { key: "Admin Roster", title: undefined, superOnly: true },
  { key: "Marketplace & Catalog", title: "Marketplace & Catalog", superOnly: false },
  { key: "Content", title: "Content", superOnly: false },
  { key: "Directory", title: "Directory", superOnly: false },
  { key: "Industry", title: "Industry", superOnly: false },
  { key: "Advertising & Promotions", title: "Advertising & Promotions", superOnly: false },
  { key: "Communications", title: "Communications", superOnly: false },
  { key: "AI", title: "AI", superOnly: false },
  { key: "Security", title: "Security", superOnly: false },
  { key: "Features", title: "Features", superOnly: false },
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]["key"];

export const ADMIN_SECTION_KEYS: readonly AdminSectionKey[] = ADMIN_SECTIONS.map((s) => s.key);

const SECTION_BY_KEY = new Map(ADMIN_SECTIONS.map((s) => [s.key, s] as const));

/**
 * Role → sections it may open. Mirrors ticket-62's five roles exactly; the
 * legacy `admin` tier keeps full (non-super-only) access so existing accounts
 * do not lose the console. `super_admin` is handled in the helpers so it also
 * sees `superOnly` sections such as the admin roster.
 */
export const ROLE_ACCESS: Readonly<Record<string, readonly AdminSectionKey[]>> = {
  super_admin: ADMIN_SECTION_KEYS,
  admin: ADMIN_SECTION_KEYS.filter((key) => key !== "Admin Roster"),

  // Operations: Dashboard, Verifications, About Team Section.
  operations: ["Dashboard", "Verifications", "Features"],

  // Customer Support: Dashboard, Support Inbox, User Management,
  // Communications, Job Board, Exhibition Hub, Properties.
  "customer-support": [
    "Dashboard", "Support Inbox", "User Management", "Communications",
    "Marketplace & Catalog",
  ],

  // Sales & Marketing: Dashboard, Support Inbox, User Management,
  // Advertising & Promotions, Communications, Key Players / Trusted Clients,
  // Job Board, Exhibition Hub, Properties.
  "sales-marketing": [
    "Dashboard", "Support Inbox", "User Management", "Advertising & Promotions",
    "Communications", "Features", "Marketplace & Catalog",
  ],

  // Reporter: Dashboard, News Feed, News Ticker, Taxonomy,
  // Institutions & Ministries, Events.
  reporter: ["Dashboard", "Content", "Directory", "Industry"],
};

export function isSuperOnlySection(section: AdminSectionKey): boolean {
  return SECTION_BY_KEY.get(section)?.superOnly === true;
}

function roleList(roles: Iterable<string | null | undefined>): string[] {
  return Array.from(roles).filter((role): role is string => typeof role === "string" && role.length > 0);
}

/** Every section the viewer may open. Multiple roles are a union. */
export function getAllowedAdminSections(roles: Iterable<string | null | undefined>): Set<AdminSectionKey> {
  const held = roleList(roles);
  if (held.includes("super_admin")) return new Set(ADMIN_SECTION_KEYS);

  const allowed = new Set<AdminSectionKey>();
  for (const role of held) {
    for (const section of ROLE_ACCESS[role] ?? []) allowed.add(section);
  }
  // Belt and braces: a super-only section never leaks via a role entry.
  for (const section of allowed) {
    if (isSuperOnlySection(section)) allowed.delete(section);
  }
  return allowed;
}

/** True when at least one of the viewer's roles may open `section`. */
export function canAccessSection(roles: Iterable<string | null | undefined>, section: AdminSectionKey): boolean {
  const held = roleList(roles);
  if (held.includes("super_admin")) return true;
  if (isSuperOnlySection(section)) return false;
  return held.some((role) => (ROLE_ACCESS[role] ?? []).includes(section));
}
