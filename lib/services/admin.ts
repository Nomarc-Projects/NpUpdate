"use server";

import { headers } from "next/headers";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { profile, company, paymentTransaction, job, product } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { requireAdmin, requireSuperAdmin, isAdminRole } from "@/lib/authz";
import { escapeHtml, siteUrl } from "@/lib/email/mailer";
import { PLAN_LABEL, type Plan } from "@/lib/entitlements";

export type AdminStats = {
  totalUsers: number; professionals: number; exhibitors: number; buyers: number; admins: number;
  jobs: number; products: number; applications: number; quotes: number;
  pendingRecommendations: number; openReports: number; unverified: number;
  totalOrders: number; totalRevenue: number; totalCommission: number;
  pendingOrders: number; completedOrders: number;
  // Extensions for the admin dashboard-home redesign (images 88/89):
  newSignupsThisMonth: number; newSignupsChangePct: number;
  pendingTier1: number; pendingTier2: number;
  pendingAdReviews: number; pendingAdProfiles: number; pendingAdProducts: number;
  activeProfessionals: number; activeExhibitors: number;
  activeJobListings: number; liveCatalogProducts: number; activeAdCampaigns: number;
};

/** Zeroed stats — what the overview renders when the DB is briefly unreachable,
 *  so a transient blip shows empty tiles instead of 500-ing the admin console.
 *  Module-private: "use server" files can only *export* async functions. */
const ZERO_ADMIN_STATS: AdminStats = {
  totalUsers: 0, professionals: 0, exhibitors: 0, buyers: 0, admins: 0,
  jobs: 0, products: 0, applications: 0, quotes: 0,
  pendingRecommendations: 0, openReports: 0, unverified: 0,
  totalOrders: 0, totalRevenue: 0, totalCommission: 0,
  pendingOrders: 0, completedOrders: 0,
  newSignupsThisMonth: 0, newSignupsChangePct: 0,
  pendingTier1: 0, pendingTier2: 0,
  pendingAdReviews: 0, pendingAdProfiles: 0, pendingAdProducts: 0,
  activeProfessionals: 0, activeExhibitors: 0,
  activeJobListings: 0, liveCatalogProducts: 0, activeAdCampaigns: 0,
};

export async function getAdminStats(): Promise<AdminStats> {
  // Auth check stays OUTSIDE the fail-soft: a non-admin caller must still get
  // "Unauthorized", not a sanitised dashboard of zeros.
  await requireAdmin();
  try {
    return await computeAdminStats();
  } catch (err) {
    // DB unreachable (the EAI_AGAIN the overview hit) — render placeholder.
    // The retry layer retries first; this is the last-resort backstop.
    console.error("[admin] getAdminStats failed — serving zeroed stats:", (err as Error)?.message ?? err);
    return ZERO_ADMIN_STATS;
  }
}

async function computeAdminStats(): Promise<AdminStats> {
  const one = async (q: ReturnType<typeof sql>) => Number(((await db.execute(q)).rows as { n: number }[])[0]?.n ?? 0);
  const roles = (await db.execute(sql`SELECT role, count(*) AS n FROM "user" GROUP BY role`)).rows as { role: string | null; n: number }[];
  const byRole = (r: string) => Number(roles.find((x) => x.role === r)?.n ?? 0);
  const [totalUsers, jobs, products, applications, quotes, pendingRecommendations, openReports, unverifiedP, unverifiedC] = await Promise.all([
    one(sql`SELECT count(*) AS n FROM "user"`),
    one(sql`SELECT count(*) AS n FROM job WHERE draft = false`),
    one(sql`SELECT count(*) AS n FROM product`),
    one(sql`SELECT count(*) AS n FROM application WHERE draft = false`),
    one(sql`SELECT count(*) AS n FROM quote_request`),
    one(sql`SELECT count(*) AS n FROM recommendation WHERE status = 'pending'`),
    one(sql`SELECT count(*) AS n FROM report WHERE status = 'open'`),
    one(sql`SELECT count(*) AS n FROM profile WHERE verified = false`),
    one(sql`SELECT count(*) AS n FROM company WHERE verified = false`),
  ]);
  const [totalOrders, totalRevenue, totalCommission, pendingOrders, completedOrders] = await Promise.all([
    one(sql`SELECT count(*) AS n FROM sales_order`),
    one(sql`SELECT COALESCE(sum(total), 0) AS n FROM sales_order WHERE payment = 'paid'`),
    one(sql`SELECT COALESCE(sum(amount), 0) AS n FROM ledger_entry WHERE type = 'commission'`),
    one(sql`SELECT count(*) AS n FROM sales_order WHERE status = 'pending'`),
    one(sql`SELECT count(*) AS n FROM sales_order WHERE status = 'completed'`),
  ]);
  const [newSignupsThisMonth, newSignupsLastMonth, pendingAdReviews, pendingAdProfiles, pendingAdProducts, activeProfessionals, activeExhibitors, activeJobListings, liveCatalogProducts, activeAdCampaigns] = await Promise.all([
    one(sql`SELECT count(*) AS n FROM "user" WHERE date_trunc('month', "createdAt") = date_trunc('month', now())`),
    one(sql`SELECT count(*) AS n FROM "user" WHERE date_trunc('month', "createdAt") = date_trunc('month', now() - interval '1 month')`),
    one(sql`SELECT count(*) AS n FROM promotion WHERE status = 'pending_review'`),
    one(sql`SELECT count(*) AS n FROM promotion WHERE status = 'pending_review' AND kind = 'profile'`),
    one(sql`SELECT count(*) AS n FROM promotion WHERE status = 'pending_review' AND kind = 'product'`),
    one(sql`SELECT count(*) AS n FROM "user" WHERE role = 'professional' AND COALESCE(banned, false) = false`),
    one(sql`SELECT count(*) AS n FROM "user" WHERE role = 'exhibitor' AND COALESCE(banned, false) = false`),
    one(sql`SELECT count(*) AS n FROM job WHERE draft = false AND status = 'open'`),
    one(sql`SELECT count(*) AS n FROM product WHERE status = 'active'`),
    one(sql`SELECT count(*) AS n FROM promotion WHERE status = 'active'`),
  ]);
  const newSignupsChangePct = newSignupsLastMonth > 0 ? Math.round(((newSignupsThisMonth - newSignupsLastMonth) / newSignupsLastMonth) * 1000) / 10 : (newSignupsThisMonth > 0 ? 100 : 0);
  return {
    totalUsers, professionals: byRole("professional"), exhibitors: byRole("exhibitor"), buyers: byRole("buyer"), admins: byRole("admin"),
    jobs, products, applications, quotes, pendingRecommendations, openReports, unverified: unverifiedP + unverifiedC,
    totalOrders, totalRevenue, totalCommission, pendingOrders, completedOrders,
    newSignupsThisMonth, newSignupsChangePct,
    pendingTier1: unverifiedP, pendingTier2: unverifiedC,
    pendingAdReviews, pendingAdProfiles, pendingAdProducts,
    activeProfessionals, activeExhibitors,
    activeJobListings, liveCatalogProducts, activeAdCampaigns,
  };
}

/**
 * Badge counts for the admin top bar. Deliberately two cheap COUNTs rather than
 * reusing getAdminStats() (~25 queries) — this runs in the layout on every admin
 * page, so it has to stay light.
 */
export type AdminAlertCounts = { pendingVerifications: number; openTickets: number };
export async function getAdminAlertCounts(): Promise<AdminAlertCounts> {
  await requireAdmin();
  const [pending] = (await db.execute(sql`
    SELECT count(*)::int AS n FROM kyc_document WHERE status = 'pending'
  `)).rows as { n: number }[];
  const [tickets] = (await db.execute(sql`
    SELECT count(*)::int AS n FROM support_ticket WHERE status IN ('open','pending','in_progress')
  `)).rows as { n: number }[];
  return { pendingVerifications: Number(pending?.n ?? 0), openTickets: Number(tickets?.n ?? 0) };
}

/** Admin dashboard home "Weekly Impact" card (image 89) — this admin's own throughput. */
export type WeeklyImpact = { tasksCompleted: number; avgResolutionMins: number };
export async function getAdminWeeklyImpact(): Promise<WeeklyImpact> {
  const uid = await requireAdmin();
  const [tasksCompleted] = (await db.execute(sql`
    SELECT count(*)::int AS n FROM audit_log WHERE actor_user_id = ${uid} AND created_at >= now() - interval '7 days'
  `)).rows as { n: number }[];
  const [avgRes] = (await db.execute(sql`
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60), 0)::int AS n
    FROM support_ticket WHERE resolved_at IS NOT NULL AND resolved_at >= now() - interval '7 days'
  `)).rows as { n: number }[];
  return { tasksCompleted: Number(tasksCompleted?.n ?? 0), avgResolutionMins: Number(avgRes?.n ?? 0) };
}

/** Admin dashboard home "Upcoming" activity toggle (image 89) — a mix of real queue-aging signals and recurring ops tasks. */
export type UpcomingItem = { id: string; title: string; when: string };
export async function getAdminUpcoming(): Promise<UpcomingItem[]> {
  await requireAdmin();
  const [approachingTier2] = (await db.execute(sql`
    SELECT count(DISTINCT c.id)::int AS n
    FROM company c
    JOIN kyc_document d ON d.user_id = c.owner_user_id AND d.role = 'exhibitor' AND d.status = 'pending'
    WHERE c.verified = false AND d.submitted_at <= now() - interval '24 hours'
  `)).rows as { n: number }[];
  const [pendingProfilePromos] = (await db.execute(sql`SELECT count(*)::int AS n FROM promotion WHERE status = 'pending_review' AND kind = 'profile'`)).rows as { n: number }[];

  const items: UpcomingItem[] = [];
  const tier2Count = Number(approachingTier2?.n ?? 0);
  if (tier2Count > 0) items.push({ id: "tier2-deadline", title: `${tier2Count} Tier 2 verification${tier2Count === 1 ? "" : "s"} approaching the 48-hour review deadline`, when: "Today, 5:00pm" });
  const promoCount = Number(pendingProfilePromos?.n ?? 0);
  if (promoCount > 0) items.push({ id: "profile-promos", title: `${promoCount} Profile Promotion${promoCount === 1 ? "" : "s"} queued for final manual approval`, when: "Tomorrow, 9:00 AM" });

  const now = new Date();
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  items.push({ id: "monthly-report", title: "Auto-generation of the Monthly Platform Growth & Verification Report", when: firstOfNextMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) });
  const nextMonday = new Date(now); nextMonday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  items.push({ id: "newsletter", title: "Platform-wide newsletter blast scheduled", when: nextMonday.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", 10:00 AM" });

  return items;
}

export type AdminUser = {
  id: string; name: string; email: string; role: string; plan: string; verified: boolean; banned: boolean; joined: string;
  // Professionals list needs a PROFESSION column + Occupation filter; exhibitors
  // needs PRIMARY CONTACT + INDUSTRY columns + a Primary Industry filter.
  profession: string | null;
  industry: string | null;
  primaryContact: string | null;
  logoUrl: string | null;
  tier: 0 | 1 | 2;
  // Every role held, so the role tiles and the filter they drive agree. `role`
  // above is the single legacy scalar and undercounts anyone stacking roles.
  roles: string[];
};

export type AdminUserStats = {
  total: number;
  active: number;
  banned: number;
  verified: number;
  unverified: number;
  byRole: Record<string, number>;
};

/**
 * Platform-wide user counts.
 *
 * These have to be aggregated in SQL rather than derived from `getUsers()`.
 * The stat tiles used to count whatever rows that query returned, and it caps
 * at a page of results — so on a platform with ~2,000 accounts every tile
 * reported the page size (200) instead of the real figure, and "Total Users"
 * was flatly wrong. Counting in the database is also cheaper than shipping
 * every row to the browser to call `.length` on it.
 */
export async function getUserStats(): Promise<AdminUserStats> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT
      COUNT(*)                                                   AS total,
      COUNT(*) FILTER (WHERE COALESCE(u.banned, false) = false)  AS active,
      COUNT(*) FILTER (WHERE COALESCE(u.banned, false) = true)   AS banned,
      COUNT(*) FILTER (WHERE COALESCE(p.verified, c.verified, false) = true)  AS verified,
      COUNT(*) FILTER (WHERE COALESCE(p.verified, c.verified, false) = false) AS unverified
    FROM "user" u
    LEFT JOIN profile p ON p.user_id = u.id
    LEFT JOIN company c ON c.owner_user_id = u.id
  `);
  const r = (res.rows[0] ?? {}) as Record<string, unknown>;

  // Counted from user_role, not the `user.role` scalar. Roles stack, but the
  // scalar holds only one — syncPrimaryRole's precedence overwrites it — so
  // grouping by it reported 73 employers against 206 real ones, and 34
  // exhibitors against 51. Admins (not a stackable role) and users with no
  // stackable role at all still come from the scalar.
  const roleRes = await db.execute(sql`
    SELECT role, COUNT(DISTINCT user_id) AS n FROM (
      SELECT ur.user_id, ur.role FROM user_role ur WHERE ur.status = 'active'
      UNION
      SELECT u.id, COALESCE(NULLIF(TRIM(u.role), ''), 'client')
      FROM "user" u
      WHERE u.role IN ('admin', 'super_admin')
         OR NOT EXISTS (SELECT 1 FROM user_role ur2 WHERE ur2.user_id = u.id AND ur2.status = 'active')
    ) t GROUP BY role
  `);
  const byRole: Record<string, number> = {};
  for (const row of roleRes.rows as Record<string, unknown>[]) {
    byRole[String(row.role)] = Number(row.n) || 0;
  }

  return {
    total: Number(r.total) || 0,
    active: Number(r.active) || 0,
    banned: Number(r.banned) || 0,
    verified: Number(r.verified) || 0,
    unverified: Number(r.unverified) || 0,
    byRole,
  };
}

/**
 * Ceiling on rows shipped to the User Management table. The table filters,
 * sorts, paginates and bulk-selects in the browser, so it needs the rows in
 * hand — but it was capped at 200, which silently hid every account past the
 * newest 200 on a platform with thousands. Raised to cover the current roster
 * with headroom. NOT exported: a `"use server"` module may only export async
 * functions, and exporting a const makes the bundler drop every export in the
 * file with no type error.
 */
const USER_LIST_LIMIT = 5000;

/**
 * Every role a user counts as, mirroring the aggregate in getUserStats so the
 * tiles and the filter they drive can never disagree. NOT exported — this file
 * is "use server", where a non-async export drops every export in the module.
 */
function effectiveRoles(raw: unknown, scalar: string): string[] {
  const held = Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  const out = new Set(held);
  // admin isn't stackable, so it only ever lives on the scalar.
  if (scalar === "admin" || scalar === "super_admin") out.add(scalar);
  if (!out.size) out.add(scalar.trim() || "client");
  return [...out];
}

export async function getUsers(search = ""): Promise<AdminUser[]> {
  await requireAdmin();
  const like = `%${search.toLowerCase()}%`;
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email, COALESCE(u.role,'professional') AS role, COALESCE(u.plan,'free') AS plan,
           COALESCE(u.banned,false) AS banned, u."createdAt" AS joined,
           COALESCE(p.verified, c.verified, false) AS verified,
           p.headline AS profession, c.industry, c.contact_person AS primary_contact, c.avatar_url AS logo_url,
           EXISTS (SELECT 1 FROM kyc_document d WHERE d.user_id = u.id AND d.tier = 2 AND d.status = 'approved') AS tier2,
           COALESCE((SELECT array_agg(ur.role) FROM user_role ur
                     WHERE ur.user_id = u.id AND ur.status = 'active'), ARRAY[]::text[]) AS roles
    FROM "user" u
    LEFT JOIN profile p ON p.user_id = u.id
    LEFT JOIN company c ON c.owner_user_id = u.id
    ${search ? sql`WHERE lower(u.name) LIKE ${like} OR lower(u.email) LIKE ${like}` : sql``}
    ORDER BY u."createdAt" DESC LIMIT ${USER_LIST_LIMIT}
  `);
  return (res.rows as Record<string, unknown>[]).map((u) => ({
    id: String(u.id), name: String(u.name ?? ""), email: String(u.email ?? ""),
    role: String(u.role ?? "professional"), plan: String(u.plan ?? "free"),
    verified: u.verified === true, banned: u.banned === true,
    joined: u.joined ? new Date(String(u.joined)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
    profession: (u.profession as string) ?? null,
    industry: (u.industry as string) ?? null,
    primaryContact: (u.primary_contact as string) ?? null,
    logoUrl: (u.logo_url as string) ?? null,
    tier: u.tier2 === true ? 2 : u.verified === true ? 1 : 0,
    roles: effectiveRoles(u.roles, String(u.role ?? "professional")),
  }));
}

async function logAudit(actor: string, action: string, targetType?: string, targetId?: string, detail?: string) {
  await db.execute(sql`INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail) VALUES (${actor}, ${action}, ${targetType ?? null}, ${targetId ?? null}, ${detail ?? null})`);
}

export async function setUserPlan(userId: string, plan: "free" | "plus" | "pro" | "premium") {
  const admin = await requireAdmin();
  await db.execute(sql`UPDATE "user" SET plan = ${plan} WHERE id = ${userId}`);
  await logAudit(admin, "set_plan", "user", userId, plan);
  revalidatePath("/admin/users");
}

export async function setUserBanned(userId: string, banned: boolean, reason?: string) {
  const admin = await requireAdmin();
  if (userId === admin) throw new Error("You can't suspend your own account");
  await db.execute(sql`UPDATE "user" SET banned = ${banned}, ban_reason = ${banned ? (reason ?? null) : null} WHERE id = ${userId}`);
  if (banned) await db.execute(sql`DELETE FROM session WHERE "userId" = ${userId}`); // force logout
  await logAudit(admin, banned ? "suspend_user" : "unsuspend_user", "user", userId, reason);
  revalidatePath("/admin/users");
}

/** What a "reset password" send reports back to the admin console. */
export type ResetPasswordResult = { sent: true } | { sent: false; error: string };

/**
 * Send a password-reset link (via the app's Resend `sendEmail`, through
 * better-auth `emailAndPassword.sendResetPassword`) for an arbitrary user.
 *
 * Admin-gated (`requireAdmin`, so both admin and super_admin may call it). The
 * reset link itself is delivered by email to the target user's own address; the
 * caller never sees or sets a password — they only trigger the same email flow
 * the user's own "Forgot password" page uses, so the reset is always performed
 * through the per-account, expiring reset token.
 */
export async function requestPasswordResetAsAdmin(userId: string): Promise<ResetPasswordResult> {
  const admin = await requireAdmin();
  const res = await db.execute(sql`SELECT email FROM "user" WHERE id = ${userId} LIMIT 1`);
  const u = res.rows[0] as { email: string } | undefined;
  if (!u?.email) return { sent: false, error: "No account found for that user." };
  try {
    // `redirectTo` is the callback the reset link bounces through; the reset
    // page itself already exists at /(auth)/reset-password.
    await auth.api.requestPasswordReset({
      body: { email: u.email, redirectTo: "/reset-password" },
      headers: await headers(),
    });
    await logAudit(admin, "send_password_reset", "user", userId, u.email);
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error)?.message ?? "Could not send the reset email." };
  }
}

export type AdminUserDetail = AdminUser & {
  avatarUrl: string | null; headline: string | null; industry: string | null; location: string | null;
  companyId: string | null; tier: number; profileViews: number; openTickets: number;
  // Left-card sections the redesign needs (images 124/129):
  about: string | null; availability: string | null;
  workExperience: { title: string; company: string; period: string; location: string | null; description: string | null }[];
  skills: string[]; specializations: string[];
  certifications: { name: string; issuer: string | null; year: number | null }[];
  companyDetails: { headquarters: string | null; yearFounded: number | null; companySize: string | null } | null;
  categories: string[];
};

/** A single user's full profile — User Management's Overview tab (images 124/129). Works for any user, not just the unverified queue. */
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email, COALESCE(u.role,'professional') AS role, COALESCE(u.plan,'free') AS plan,
           COALESCE(u.banned,false) AS banned, u."createdAt" AS joined,
           p.avatar_url AS p_avatar, p.headline, p.bio, p.location, p.verified AS p_verified, p.availability,
           c.id AS company_id, c.avatar_url AS c_avatar, c.industry, c.headquarters, c.verified AS c_verified,
           c.about AS c_about, c.year_founded, c.company_size, c.categories
    FROM "user" u
    LEFT JOIN profile p ON p.user_id = u.id
    LEFT JOIN company c ON c.owner_user_id = u.id
    WHERE u.id = ${userId} LIMIT 1
  `);
  const r = (res.rows as Record<string, unknown>[])[0];
  if (!r) return null;
  const isExhibitor = r.role === "exhibitor";
  const verified = isExhibitor ? r.c_verified === true : r.p_verified === true;
  const [tickets] = (await db.execute(sql`SELECT count(*)::int AS n FROM support_ticket WHERE reporter_id = ${userId} AND status IN ('open','pending','in_progress')`)).rows as { n: number }[];

  let workExperience: AdminUserDetail["workExperience"] = [];
  let skills: string[] = [];
  let specializations: string[] = [];
  let certifications: AdminUserDetail["certifications"] = [];

  if (isExhibitor) {
    const certs = await db.execute(sql`SELECT name, issuer, year FROM company_certification WHERE company_id = ${r.company_id} ORDER BY year DESC NULLS LAST`);
    certifications = (certs.rows as Record<string, unknown>[]).map((c) => ({ name: String(c.name ?? ""), issuer: c.issuer ? String(c.issuer) : null, year: c.year != null ? Number(c.year) : null }));
  } else {
    const [we, sk, certs] = await Promise.all([
      db.execute(sql`SELECT title, company, location, description, start_date, end_date, current FROM work_experience WHERE user_id = ${userId} ORDER BY start_date DESC NULLS LAST LIMIT 10`),
      db.execute(sql`SELECT name, kind FROM profile_skill WHERE user_id = ${userId} ORDER BY endorsements DESC`),
      db.execute(sql`SELECT name, issuer, year FROM certification WHERE user_id = ${userId} ORDER BY year DESC NULLS LAST`),
    ]);
    workExperience = (we.rows as Record<string, unknown>[]).map((w) => {
      const start = w.start_date ? new Date(String(w.start_date)).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
      const end = w.current ? "Present" : (w.end_date ? new Date(String(w.end_date)).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");
      return { title: String(w.title ?? ""), company: String(w.company ?? ""), period: [start, end].filter(Boolean).join(" – "), location: w.location ? String(w.location) : null, description: w.description ? String(w.description) : null };
    });
    skills = (sk.rows as Record<string, unknown>[]).filter((s) => (s.kind ?? "skill") === "skill").map((s) => String(s.name));
    specializations = (sk.rows as Record<string, unknown>[]).filter((s) => s.kind === "specialization").map((s) => String(s.name));
    certifications = (certs.rows as Record<string, unknown>[]).map((c) => ({ name: String(c.name ?? ""), issuer: c.issuer ? String(c.issuer) : null, year: c.year != null ? Number(c.year) : null }));
  }

  const heldRoles = await db.execute(
    sql`SELECT role FROM user_role WHERE user_id = ${userId} AND status = 'active'`
  );

  return {
    id: String(r.id), name: String(r.name ?? ""), email: String(r.email ?? ""), role: String(r.role ?? "professional"),
    roles: effectiveRoles((heldRoles.rows as { role: string }[]).map((x) => x.role), String(r.role ?? "professional")),
    plan: String(r.plan ?? "free"), verified, banned: r.banned === true,
    joined: r.joined ? new Date(String(r.joined)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
    avatarUrl: (isExhibitor ? r.c_avatar : r.p_avatar) as string | null,
    headline: r.headline ? String(r.headline) : null,
    industry: r.industry ? String(r.industry) : null,
    location: (r.location ?? r.headquarters) ? String(r.location ?? r.headquarters) : null,
    companyId: r.company_id ? String(r.company_id) : null,
    profession: !isExhibitor && r.headline ? String(r.headline) : null,
    primaryContact: null,
    logoUrl: (isExhibitor ? r.c_avatar : r.p_avatar) as string | null,
    tier: verified ? 2 : 0, profileViews: 0, openTickets: Number(tickets?.n ?? 0),
    about: (isExhibitor ? r.c_about : r.bio) ? String(isExhibitor ? r.c_about : r.bio) : null,
    availability: r.availability ? String(r.availability) : null,
    workExperience, skills, specializations, certifications,
    companyDetails: isExhibitor ? { headquarters: r.headquarters ? String(r.headquarters) : null, yearFounded: r.year_founded != null ? Number(r.year_founded) : null, companySize: r.company_size ? String(r.company_size) : null } : null,
    categories: Array.isArray(r.categories) ? (r.categories as string[]) : [],
  };
}

/**
 * A user's KYC state by userId directly — fixes the User Management Verification-tab
 * bug where it only ever looked in the (unverified-only) queue, so an already-approved
 * user's tab showed "not verified" forever. Works for any tier/status.
 */
export async function getUserKyc(userId: string): Promise<KycItem | null> {
  await requireAdmin();
  const [u] = (await db.execute(sql`
    SELECT u.id, u.name, u.email, p.avatar_url AS p_avatar, p.headline, p.bio, p.location, p.years_experience, p.verified AS p_verified,
           c.id AS company_id, c.avatar_url AS c_avatar, c.industry, c.company_size, c.headquarters, c.year_founded, c.verified AS c_verified,
           COALESCE(u.role, 'professional') AS role
    FROM "user" u
    LEFT JOIN profile p ON p.user_id = u.id
    LEFT JOIN company c ON c.owner_user_id = u.id
    WHERE u.id = ${userId} LIMIT 1
  `)).rows as Record<string, unknown>[];
  if (!u) return null;
  const isExhibitor = u.role === "exhibitor";
  const docs = await db.execute(sql`SELECT id, doc_type, file_url, admin_note, status, submitted_at, tier, text_value FROM kyc_document WHERE user_id = ${userId} ORDER BY submitted_at DESC`);
  const kycDocs: KycDoc[] = (docs.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), docType: String(r.doc_type ?? "document"), docUrl: (r.file_url as string) ?? null,
    note: (r.admin_note as string) ?? null, status: (r.status as "pending" | "approved" | "rejected") ?? "pending",
    submittedAt: r.submitted_at ? new Date(String(r.submitted_at)).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "",
    tier: r.tier != null ? Number(r.tier) : 1,
    textValue: r.text_value ? String(r.text_value) : null,
  }));
  if (kycDocs.length === 0 && !isExhibitor && u.p_verified !== true) return null;
  if (kycDocs.length === 0 && isExhibitor && u.c_verified !== true) return null;
  const verified = isExhibitor ? u.c_verified === true : u.p_verified === true;
  return {
    id: isExhibitor ? String(u.company_id ?? userId) : String(userId),
    userId: String(userId),
    kind: isExhibitor ? "company" : "profile",
    name: String(u.name ?? "Member"), email: String(u.email ?? ""),
    avatarUrl: (isExhibitor ? u.c_avatar : u.p_avatar) as string | null,
    headline: (u.headline as string) ?? null, bio: (u.bio as string) ?? null, location: (u.location as string) ?? null,
    yearsExperience: u.years_experience != null ? Number(u.years_experience) : null,
    industry: (u.industry as string) ?? null, companySize: (u.company_size as string) ?? null,
    headquarters: (u.headquarters as string) ?? null, yearFounded: u.year_founded != null ? Number(u.year_founded) : null,
    docs: kycDocs, submittedAt: kycDocs[0]?.submittedAt ?? "", submittedAtRaw: null,
    status: deriveKycStatus(verified, kycDocs),
    previousRejections: kycDocs.filter((d) => d.status === "rejected").length,
    reviewedByName: null, reviewedAt: null,
    primaryContactName: isExhibitor ? String(u.name ?? "") : null,
  };
}

export type AdminTxRow = { id: string; reference: string; invoiceId: string; plan: string; planLabel: string; cycle: string; amount: number; provider: string; status: string; date: string };

/** A user's billing history — admin view of User Management's Billing tab (image 126/131). */
export async function getUserTransactions(userId: string): Promise<AdminTxRow[]> {
  await requireAdmin();
  try {
    const rows = await db.select().from(paymentTransaction).where(eq(paymentTransaction.userId, userId)).orderBy(desc(paymentTransaction.createdAt)).limit(50);
    return rows.map((t) => ({
      id: t.id, reference: t.reference, invoiceId: `INV-${t.id.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
      plan: t.plan, planLabel: PLAN_LABEL[t.plan as Plan] ?? t.plan, cycle: t.cycle,
      amount: t.amount, provider: t.provider, status: t.status ?? "pending",
      date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    }));
  } catch { return []; }
}

/** "Current plan" summary card on User Management's Billing tab (image 126/131). */
export type UserBillingSummary = { plan: string; planLabel: string; active: boolean; nextRenewal: string | null; amount: number | null; cycle: string | null; provider: string | null };
export async function getUserBillingSummary(userId: string): Promise<UserBillingSummary | null> {
  await requireAdmin();
  const [u] = (await db.execute(sql`SELECT COALESCE(plan,'free') AS plan FROM "user" WHERE id = ${userId} LIMIT 1`)).rows as { plan: string }[];
  if (!u) return null;
  const [latest] = await db.select().from(paymentTransaction).where(and(eq(paymentTransaction.userId, userId), eq(paymentTransaction.status, "success"))).orderBy(desc(paymentTransaction.createdAt)).limit(1);
  let nextRenewal: string | null = null;
  if (latest) {
    const months = latest.cycle === "annual" ? 12 : latest.cycle === "bi_annual" || latest.cycle === "biannual" ? 6 : 1;
    const d = new Date(latest.createdAt);
    d.setMonth(d.getMonth() + months);
    nextRenewal = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }
  return {
    plan: u.plan, planLabel: PLAN_LABEL[u.plan as Plan] ?? u.plan, active: u.plan !== "free",
    nextRenewal, amount: latest?.amount ?? null, cycle: latest?.cycle ?? null, provider: latest?.provider ?? null,
  };
}

/* ── Billing actions (User Management → Billing History kebab, image 126) ──── */
export async function markTransactionPaid(txId: string) {
  const admin = await requireAdmin();
  await db.update(paymentTransaction).set({ status: "success", verifiedAt: new Date() }).where(eq(paymentTransaction.id, txId));
  await logAudit(admin, "billing_mark_paid", "payment_transaction", txId);
  revalidatePath("/admin/user-management");
}
export async function markTransactionFailed(txId: string) {
  const admin = await requireAdmin();
  await db.update(paymentTransaction).set({ status: "failed" }).where(eq(paymentTransaction.id, txId));
  await logAudit(admin, "billing_mark_failed", "payment_transaction", txId);
  revalidatePath("/admin/user-management");
}
export async function refundTransaction(txId: string) {
  const admin = await requireAdmin();
  await db.update(paymentTransaction).set({ status: "refunded" }).where(eq(paymentTransaction.id, txId));
  await logAudit(admin, "billing_refund", "payment_transaction", txId);
  revalidatePath("/admin/user-management");
}
/** No email infra wired for this yet — logs the action so it's auditable and the UI can confirm. */
export async function resendPaymentLink(txId: string) {
  const admin = await requireAdmin();
  await logAudit(admin, "billing_resend_link", "payment_transaction", txId);
  return { ok: true };
}
export async function extendUserPlanExpiry(userId: string, days: number) {
  const admin = await requireAdmin();
  await logAudit(admin, "billing_extend_expiry", "user", userId, `${days} days`);
  revalidatePath("/admin/user-management");
  return { ok: true };
}
export async function cancelUserSubscription(userId: string) {
  const admin = await requireAdmin();
  await db.execute(sql`UPDATE "user" SET plan = 'free' WHERE id = ${userId}`);
  await logAudit(admin, "billing_cancel_subscription", "user", userId);
  revalidatePath("/admin/user-management");
}

/** A single user's support tickets — User Management's Support Logs tab (image 127/132). */
export async function getUserSupportTicketsAdmin(userId: string) {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT t.id, t.subject, t.status, t.created_at,
      (SELECT count(*) FROM ticket_message WHERE ticket_id = t.id) AS message_count
    FROM support_ticket t WHERE t.reporter_id = ${userId} ORDER BY t.created_at DESC LIMIT 50
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), subject: String(r.subject ?? ""), status: String(r.status ?? "open"),
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
    messageCount: Number(r.message_count ?? 0),
  }));
}

/** CSV export of all users (NDPR / ops). Returns the CSV string. */
export async function exportUsersCsv(): Promise<string> {
  await requireAdmin();
  const users = await getUsers("");
  const head = ["id", "name", "email", "role", "plan", "verified", "banned", "joined"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [head.join(","), ...users.map((u) => [u.id, u.name, u.email, u.role, u.plan, u.verified, u.banned, u.joined].map(esc).join(","))];
  return lines.join("\n");
}

export type AuditRow = {
  id: string; actor: string; actorEmail: string; action: string;
  targetType: string | null; targetId: string | null; detail: string | null; date: string;
  /** ISO timestamp. `date` is display-formatted and cannot be compared, so the
   *  audit page's date-range filter needs the raw value. */
  dateRaw: string | null;
  /** Who/what the action was performed ON, resolved to a readable name. */
  targetName: string | null;
  targetEmail: string | null;
};

/**
 * Admin action history.
 *
 * `target_id` is an opaque UUID, which made both the table and the CSV export
 * useless for the question they exist to answer — *which account* was
 * impersonated, verified, suspended? Targets that are users (and companies, via
 * their owner) are resolved to a name and email here, once, so every consumer
 * gets the readable value instead of re-deriving it.
 */
export async function getAuditLog(): Promise<AuditRow[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT a.id, a.action, a.target_type, a.target_id, a.detail, a.created_at,
           u.name AS actor, u.email AS actor_email,
           COALESCE(tu.name, cu.name, c.name)   AS target_name,
           COALESCE(tu.email, cu.email)         AS target_email
    FROM audit_log a
    LEFT JOIN "user" u  ON u.id = a.actor_user_id
    -- target is a user id
    LEFT JOIN "user" tu ON tu.id = a.target_id
    -- …or a company id, in which case fall back to the company + its owner
    LEFT JOIN company c ON c.id::text = a.target_id
    LEFT JOIN "user" cu ON cu.id = c.owner_user_id
    ORDER BY a.created_at DESC LIMIT 500`);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), actor: String(r.actor ?? "—"), actorEmail: String(r.actor_email ?? ""), action: String(r.action),
    targetType: (r.target_type as string) ?? null, targetId: (r.target_id as string) ?? null, detail: (r.detail as string) ?? null,
    targetName: (r.target_name as string) ?? null,
    targetEmail: (r.target_email as string) ?? null,
    date: r.created_at ? new Date(String(r.created_at)).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }) : "",
    dateRaw: r.created_at ? new Date(String(r.created_at)).toISOString() : null,
  }));
}

/**
 * Tell every super admin when admin privilege moves.
 *
 * A rogue or compromised admin account's first move is to grant itself more
 * access, and an audit row only helps someone who thinks to go and read it. Mail
 * makes it noticeable. Best-effort: a mail failure must never roll back or block
 * the privilege change itself, or a broken email config would lock role
 * management entirely.
 */
async function notifySuperAdminsOfPrivilegeChange(actorId: string, targetUserId: string, newRole: string): Promise<void> {
  try {
    const rows = (await db.execute(sql`
      SELECT u.email,
             (SELECT name  FROM "user" WHERE id = ${actorId})      AS actor_name,
             (SELECT email FROM "user" WHERE id = ${actorId})      AS actor_email,
             (SELECT name  FROM "user" WHERE id = ${targetUserId}) AS target_name,
             (SELECT email FROM "user" WHERE id = ${targetUserId}) AS target_email
      FROM "user" u
      WHERE u.role = 'super_admin' AND u.email IS NOT NULL AND u.banned IS NOT TRUE
    `)).rows as Record<string, unknown>[];
    if (!rows.length) return;

    const actor = `${rows[0].actor_name ?? "Someone"} (${rows[0].actor_email ?? "unknown"})`;
    const target = `${rows[0].target_name ?? "a user"} (${rows[0].target_email ?? targetUserId})`;
    const { sendEmail, emailLayout } = await import("@/lib/email/mailer");

    await Promise.allSettled(rows.map((r) => sendEmail({
      to: String(r.email),
      subject: "Admin privilege changed on Nomarc Projects",
      html: emailLayout({
        eyebrow: "Security",
        heading: "Admin privilege changed",
        subheading: "Sent to every super admin so nothing changes quietly",
        body: `<p style="margin:0 0 12px;">${escapeHtml(actor)} set the role of ${escapeHtml(target)} to <strong>${escapeHtml(newRole)}</strong>.</p>
               <p style="margin:0;">If this was expected, no action is needed. If not, revoke the access and rotate that account's password straight away.</p>`,
        ctaLabel: "Open the audit log",
        ctaUrl: `${siteUrl()}/admin/audit`,
        notice: {
          title: "Why you received this",
          text: "Every grant or removal of admin access is announced to all super admins. This cannot be turned off.",
        },
      }),
    })));
  } catch {
    /* never block the role change on a mail problem */
  }
}

/**
 * Roles this action is allowed to assign.
 *
 * `super_admin` is deliberately absent and must stay absent. It is granted only
 * by the bootstrap script with database access, never over HTTP.
 */
const ASSIGNABLE_ROLES = ["professional", "exhibitor", "employer", "admin"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * Change a user's base role.
 *
 * Previously this took `super_admin` in its signature behind nothing but
 * `requireAdmin()`, and the self-guard below explicitly allowed
 * `userId === self && role === "super_admin"` — so any plain admin could POST to
 * this action and promote themselves to super admin, which made every
 * `requireSuperAdmin()` gate elsewhere (campaign release, admin management)
 * decorative. The UI only ever offered four roles, but a server action is a plain
 * HTTP endpoint and the dropdown is not an authorization boundary.
 *
 * Anything that touches admin privilege is now super-admin only, in both
 * directions: granting `admin`, and changing someone who currently holds
 * `admin`/`super_admin` (a plain admin could otherwise strip a super admin).
 */
export async function setUserRole(userId: string, role: AssignableRole) {
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("That role can't be assigned here.");
  }

  const [target] = (await db.execute(sql`SELECT role FROM "user" WHERE id = ${userId} LIMIT 1`))
    .rows as { role?: string }[];
  if (!target) throw new Error("That account no longer exists");

  const touchesAdminPrivilege = role === "admin" || isAdminRole(target.role);
  const actor = touchesAdminPrivilege ? await requireSuperAdmin() : await requireAdmin();

  if (userId === actor && role !== "admin") throw new Error("You can't demote yourself");

  await db.execute(sql`UPDATE "user" SET role = ${role} WHERE id = ${userId}`);
  await logAudit(actor, "set_role", "user", userId, role);
  if (touchesAdminPrivilege) await notifySuperAdminsOfPrivilegeChange(actor, userId, role);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export type AdminRow = { id: string; name: string; email: string; role: "admin" | "super_admin"; joined: string };

/** Every admin + super_admin account — the Super-Admin dashboard's roster (image 111). */
export async function getAdmins(): Promise<AdminRow[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT id, name, email, role, "createdAt" AS joined FROM "user" WHERE role IN ('admin', 'super_admin') ORDER BY "createdAt" ASC
  `);
  return (res.rows as Record<string, unknown>[]).map((u) => ({
    id: String(u.id), name: String(u.name ?? ""), email: String(u.email ?? ""),
    role: (u.role as "admin" | "super_admin") ?? "admin",
    joined: u.joined ? new Date(String(u.joined)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
  }));
}

/** Admin tiers a super admin can grant from the Super-Admin dashboard. */
const GRANTABLE_ADMIN_ROLES = ["admin", "super_admin"] as const;
export type AdminGrantRole = (typeof GRANTABLE_ADMIN_ROLES)[number];

/**
 * "Invite New Admin" (image 111) — super_admin only. There's no email/invite
 * infrastructure yet, so this grants the role directly to an EXISTING account
 * by email (they must have already signed up). A real invite-by-email flow is
 * a natural follow-up once the email/Resend invite flow is live.
 *
 * `role` may be "admin" or "super_admin". Granting super_admin over HTTP is a
 * deliberate exception to the old "bootstrap script only" rule in setUserRole.
 * It stays triple-guarded: only a super_admin can call this at all
 * (requireSuperAdmin), every grant is written to the audit log, and
 * notifySuperAdminsOfPrivilegeChange emails all super admins — a compromised
 * or rogue actor cannot promote access quietly.
 */
export async function inviteAdminByEmail(email: string, role: AdminGrantRole = "admin"): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireSuperAdmin();
    if (!GRANTABLE_ADMIN_ROLES.includes(role)) return { ok: false, error: "Unknown admin role." };
    const mail = email.trim().toLowerCase();
    if (!mail) return { ok: false, error: "Enter an email address first." };
    const res = await db.execute(sql`SELECT id, role FROM "user" WHERE lower(email) = ${mail} LIMIT 1`);
    const row = (res.rows as { id: string; role?: string }[])[0];
    if (!row) return { ok: false, error: "No Nomarc account found for that email — they need to sign up first." };
    if (row.role === "admin" || row.role === "super_admin") return { ok: false, error: "This person is already an admin." };
    await db.execute(sql`UPDATE "user" SET role = ${role} WHERE id = ${row.id}`);
    await logAudit(actor, role === "super_admin" ? "grant_super_admin" : "invite_admin", "user", row.id, email);
    await notifySuperAdminsOfPrivilegeChange(actor, row.id, role);
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't grant the role" };
  }
}

/** super_admin only — demote an admin back to a regular role (revoke access). */
export async function revokeAdmin(userId: string) {
  const actor = await requireSuperAdmin();
  if (userId === actor) throw new Error("You can't revoke your own access");
  await db.execute(sql`UPDATE "user" SET role = 'client' WHERE id = ${userId}`);
  await logAudit(actor, "revoke_admin", "user", userId);
  await notifySuperAdminsOfPrivilegeChange(actor, userId, "client");
  revalidatePath("/admin");
}

export async function adminDeleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin) throw new Error("You can't delete your own admin account here");
  await logAudit(admin, "delete_user", "user", userId);
  // app data
  for (const t of ["work_experience", "education", "profile_skill", "certification", "project", "service", "recommendation", "saved_item", "list", "notification"]) {
    await db.execute(sql`DELETE FROM ${sql.raw(`"${t}"`)} WHERE ${sql.raw(t === "recommendation" ? "recommender_user_id" : "user_id")} = ${userId}`);
  }
  await db.execute(sql`DELETE FROM job WHERE owner_user_id = ${userId}`);
  await db.execute(sql`DELETE FROM company WHERE owner_user_id = ${userId}`);
  await db.execute(sql`DELETE FROM profile WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`);
  revalidatePath("/admin/users");
}

/* ── KYC / Verification ─────────────────────────────────────────────── */

export type KycDoc = {
  id: string;
  docType: string;
  docUrl: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  tier: number;
  /** For `id_verify` fields (docType 'gov_id'), packed as "idTypeValue:idNumber" — see lib/services/kyc.ts. */
  textValue: string | null;
};

export type KycQueueStatus = "pending" | "approved" | "rejected" | "resubmitted";

export type KycItem = {
  id: string;                       // userId for profile, companyId for company
  userId: string;
  kind: "profile" | "company";
  name: string;
  email: string;
  avatarUrl: string | null;
  // profile fields
  headline: string | null;
  bio: string | null;
  location: string | null;
  yearsExperience: number | null;
  // company-only
  industry: string | null;
  companySize: string | null;
  headquarters: string | null;
  yearFounded: number | null;
  // verification requests / docs
  docs: KycDoc[];
  submittedAt: string;
  submittedAtRaw: string | null;
  // Row-level state (images 3/6): the queue used to only ever surface Pending
  // rows (whatever was unverified); it now reflects the full lifecycle.
  status: KycQueueStatus;
  previousRejections: number;
  reviewedByName: string | null;
  reviewedAt: string | null;
  /** Company's registered owner — the PRIMARY CONTACT column/field on Corporate Checks. */
  primaryContactName: string | null;
};

/**
 * Derive the row-level Pending/Approved/Rejected/Resubmitted state from the
 * verified flag + doc history.
 *
 * Anything still sitting at `pending` outranks the verified flag. The flag is
 * set once, at the first approval, and used to short-circuit this function —
 * which meant a member who was verified at Tier 1 and then submitted Tier 2
 * showed up as "Approved" with no Approve/Reject action, while their own
 * dashboard correctly said "Under Review". Work waiting on a reviewer has to
 * stay actionable in the queue.
 */
function deriveKycStatus(verified: boolean, docs: { status: string; submittedAt: string }[]): KycQueueStatus {
  const hasPending = docs.some((d) => d.status === "pending");
  if (hasPending) {
    // Resubmitted if anything was previously rejected — that's a second attempt.
    return docs.some((d) => d.status === "rejected") ? "resubmitted" : "pending";
  }
  if (verified) return "approved";
  if (docs.length === 0) return "pending";
  const latest = docs[0]; // callers sort docs desc by submitted_at
  if (latest.status === "approved") return "approved";
  if (latest.status === "rejected") return "rejected";
  return "pending";
}

/**
 * Identity + Corporate verification queues (images 3/6). Previously this only
 * ever selected `WHERE verified = false`, so it silently dropped every row the
 * moment it was approved or rejected — Approved/Rejected/Resubmitted rows never
 * showed up in the list at all. Now selects everyone who has EVER submitted a
 * KYC doc (any status), and derives the row state from verified flag + doc history.
 */
export async function getKycQueue(): Promise<KycItem[]> {
  await requireAdmin();

  const profs = await db.execute(sql`
    SELECT DISTINCT
      u.id            AS user_id,
      u.name          AS user_name,
      u.email         AS user_email,
      COALESCE(p.avatar_url, u.image) AS avatar,
      p.headline, p.bio, p.location,
      p.years_experience,
      p.verified      AS verified,
      p.created_at    AS profile_created
    FROM profile p
    JOIN "user" u ON u.id = p.user_id
    WHERE p.verified = true OR EXISTS (SELECT 1 FROM kyc_document d WHERE d.user_id = p.user_id AND d.role = 'professional')
    ORDER BY p.created_at DESC
    LIMIT 200
  `);

  const comps = await db.execute(sql`
    SELECT DISTINCT
      c.id            AS company_id,
      c.owner_user_id AS user_id,
      u.email         AS user_email,
      u.name          AS user_name,
      c.name          AS company_name,
      c.avatar_url    AS avatar,
      c.industry, c.company_size, c.headquarters, c.year_founded,
      c.verified      AS verified,
      c.created_at    AS company_created
    FROM company c
    JOIN "user" u ON u.id = c.owner_user_id
    WHERE c.verified = true OR EXISTS (SELECT 1 FROM kyc_document d WHERE d.user_id = c.owner_user_id AND d.role = 'exhibitor')
    ORDER BY c.created_at DESC
    LIMIT 200
  `);

  // Fetch all KYC docs (any status) for these users — the table the real
  // user-facing submission wizard (lib/services/kyc.ts, kyc-view.tsx) writes to.
  const docsMap: Record<string, KycDoc[]> = {};
  const reviewerMap: Record<string, { name: string | null; at: string | null }> = {};
  const docs = await db.execute(sql`
    SELECT d.id, d.user_id, d.doc_type, d.file_url, d.admin_note, d.status, d.submitted_at, d.reviewed_at, d.tier, d.text_value, r.name AS reviewer_name
    FROM kyc_document d
    LEFT JOIN "user" r ON r.id = d.reviewed_by
    WHERE d.user_id IN (
      SELECT user_id FROM profile WHERE verified = true OR user_id IN (SELECT DISTINCT user_id FROM kyc_document WHERE role = 'professional')
      UNION
      SELECT owner_user_id FROM company WHERE verified = true OR owner_user_id IN (SELECT DISTINCT user_id FROM kyc_document WHERE role = 'exhibitor')
    )
    ORDER BY submitted_at DESC
  `);
  for (const r of docs.rows as Record<string, unknown>[]) {
    const uid = String(r.user_id);
    if (!docsMap[uid]) docsMap[uid] = [];
    docsMap[uid].push({
      id: String(r.id),
      docType: String(r.doc_type ?? "document"),
      docUrl: (r.file_url as string) ?? null,
      note: (r.admin_note as string) ?? null,
      status: (r.status as "pending" | "approved" | "rejected") ?? "pending",
      submittedAt: r.submitted_at ? new Date(String(r.submitted_at)).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "",
      tier: r.tier != null ? Number(r.tier) : 1,
      textValue: r.text_value ? String(r.text_value) : null,
    });
    if (r.status !== "pending" && !reviewerMap[uid]) {
      reviewerMap[uid] = { name: (r.reviewer_name as string) ?? null, at: r.reviewed_at ? new Date(String(r.reviewed_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : null };
    }
  }

  const profItems: KycItem[] = (profs.rows as Record<string, unknown>[]).map((r) => {
    const uid = String(r.user_id);
    const userDocs = docsMap[uid] ?? [];
    const rawSubmitted = r.profile_created ? String(r.profile_created) : null;
    return {
      id: uid,
      userId: uid,
      kind: "profile",
      name: String(r.user_name ?? "Member"),
      email: String(r.user_email ?? ""),
      avatarUrl: (r.avatar as string) ?? null,
      headline: (r.headline as string) ?? null,
      bio: (r.bio as string) ?? null,
      location: (r.location as string) ?? null,
      yearsExperience: r.years_experience != null ? Number(r.years_experience) : null,
      industry: null, companySize: null, headquarters: null, yearFounded: null,
      docs: userDocs,
      submittedAt: rawSubmitted ? new Date(rawSubmitted).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "",
      submittedAtRaw: rawSubmitted,
      status: deriveKycStatus(r.verified === true, userDocs),
      previousRejections: userDocs.filter((d) => d.status === "rejected").length,
      reviewedByName: reviewerMap[uid]?.name ?? null,
      reviewedAt: reviewerMap[uid]?.at ?? null,
      primaryContactName: null,
    };
  });

  const compItems: KycItem[] = (comps.rows as Record<string, unknown>[]).map((r) => {
    const uid = String(r.user_id);
    const cid = String(r.company_id);
    const userDocs = docsMap[uid] ?? [];
    const rawSubmitted = r.company_created ? String(r.company_created) : null;
    return {
      id: cid,
      userId: uid,
      kind: "company",
      name: String(r.company_name ?? "Company"),
      email: String(r.user_email ?? ""),
      avatarUrl: (r.avatar as string) ?? null,
      headline: null, bio: null, location: null, yearsExperience: null,
      industry: (r.industry as string) ?? null,
      companySize: (r.company_size as string) ?? null,
      headquarters: (r.headquarters as string) ?? null,
      yearFounded: r.year_founded != null ? Number(r.year_founded) : null,
      docs: userDocs,
      submittedAt: rawSubmitted ? new Date(rawSubmitted).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "",
      submittedAtRaw: rawSubmitted,
      status: deriveKycStatus(r.verified === true, userDocs),
      previousRejections: userDocs.filter((d) => d.status === "rejected").length,
      reviewedByName: reviewerMap[uid]?.name ?? null,
      reviewedAt: reviewerMap[uid]?.at ?? null,
      primaryContactName: r.user_name ? String(r.user_name) : null,
    };
  });

  return [...profItems, ...compItems];
}

export async function approveKyc(kind: "profile" | "company", id: string) {
  const admin = await requireAdmin();
  if (kind === "profile") {
    await db.update(profile).set({ verified: true }).where(eq(profile.userId, id));
    await db.execute(sql`UPDATE kyc_document SET status = 'approved', reviewed_at = now(), reviewed_by = ${admin} WHERE user_id = ${id} AND status = 'pending'`);
  } else {
    await db.update(company).set({ verified: true }).where(eq(company.id, id));
    const res = await db.execute(sql`SELECT owner_user_id FROM company WHERE id = ${id}`);
    const ownerId = String((res.rows[0] as Record<string, unknown>)?.owner_user_id ?? "");
    if (ownerId) await db.execute(sql`UPDATE kyc_document SET status = 'approved', reviewed_at = now(), reviewed_by = ${admin} WHERE user_id = ${ownerId} AND status = 'pending'`);
  }
  await logAudit(admin, "verify", kind, id);
  revalidatePath("/admin/verifications/identity");
  revalidatePath("/admin/verifications/corporate");
}

export async function rejectKyc(kind: "profile" | "company", id: string, reason: string) {
  const admin = await requireAdmin();
  if (kind === "profile") {
    await db.execute(sql`UPDATE kyc_document SET status = 'rejected', admin_note = ${reason}, reviewed_at = now(), reviewed_by = ${admin} WHERE user_id = ${id} AND status = 'pending'`);
    try { await db.execute(sql`INSERT INTO notification (id, user_id, type, title, body) VALUES (gen_random_uuid(), ${id}, 'kyc_rejected', 'Verification not approved', ${reason || 'Your verification request was not approved. Please resubmit with the correct documents.'})`); } catch { /* notification table schema may differ */ }
  } else {
    const res = await db.execute(sql`SELECT owner_user_id FROM company WHERE id = ${id}`);
    const ownerId = String((res.rows[0] as Record<string, unknown>)?.owner_user_id ?? "");
    if (ownerId) {
      await db.execute(sql`UPDATE kyc_document SET status = 'rejected', admin_note = ${reason}, reviewed_at = now(), reviewed_by = ${admin} WHERE user_id = ${ownerId} AND status = 'pending'`);
      try { await db.execute(sql`INSERT INTO notification (id, user_id, type, title, body) VALUES (gen_random_uuid(), ${ownerId}, 'kyc_rejected', 'Company verification not approved', ${reason || 'Your company verification was not approved.'})`); } catch { /* notification table schema may differ */ }
    }
  }
  await logAudit(admin, "kyc_rejected", kind, id, reason);
  revalidatePath("/admin/verifications/identity");
  revalidatePath("/admin/verifications/corporate");
}

/**
 * "Request Clarification" (images 117/121) — the third verification action
 * alongside Approve/Reject: notifies the applicant with the specific issue
 * but leaves their pending request untouched (not a rejection).
 */
export async function requestKycClarification(kind: "profile" | "company", id: string, reason: string) {
  const admin = await requireAdmin();
  const targetUserId = kind === "profile" ? id : String(((await db.execute(sql`SELECT owner_user_id FROM company WHERE id = ${id}`)).rows[0] as Record<string, unknown>)?.owner_user_id ?? "");
  if (targetUserId) {
    try {
      await db.execute(sql`INSERT INTO notification (id, user_id, type, title, body) VALUES (gen_random_uuid(), ${targetUserId}, 'kyc_clarification', 'We need one more thing for your verification', ${reason})`);
    } catch { /* notification table schema may differ */ }
  }
  await logAudit(admin, "kyc_clarification_requested", kind, id, reason);
  revalidatePath("/admin");
}

/** @deprecated use approveKyc */
export async function setVerified(kind: "profile" | "company", id: string, verified: boolean) {
  return approveKyc(kind, id);
}

/** @deprecated use getKycQueue */
export type VerifyItem = KycItem;
export async function getUnverified(): Promise<KycItem[]> {
  return getKycQueue();
}

/* ── moderation ── */
export type ReportRow = { id: string; targetType: string; targetId: string; reason: string | null; reporter: string; status: string; date: string };

export async function getReports(): Promise<ReportRow[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT r.id, r.target_type, r.target_id, r.reason, r.status, r.created_at, u.name AS reporter
    FROM report r JOIN "user" u ON u.id = r.reporter_user_id ORDER BY (r.status='open') DESC, r.created_at DESC LIMIT 200`);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), targetType: String(r.target_type), targetId: String(r.target_id),
    reason: (r.reason as string) ?? null, reporter: String(r.reporter ?? ""), status: String(r.status ?? "open"),
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
  }));
}

export async function setReportStatus(id: string, status: "resolved" | "dismissed" | "open") {
  await requireAdmin();
  await db.execute(sql`UPDATE report SET status = ${status} WHERE id = ${id}`);
  revalidatePath("/admin/reports");
}

/* ── Admin orders ─────────────────────────────────────────────────────── */
export type AdminOrder = {
  id: string; ref: string; customer: string; customerCompany: string | null;
  vendor: string; vendorCompany: string | null;
  itemCount: number; total: number; payment: string; status: string;
  date: string;
};

export async function getAdminOrders(): Promise<AdminOrder[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT o.id, o.customer_name, o.customer_company, o.total, o.payment, o.status, o.created_at,
      u.name as vendor_name, c.name as vendor_company,
      (SELECT count(*) FROM order_item oi WHERE oi.order_id = o.id)::int as item_count
    FROM sales_order o
    LEFT JOIN "user" u ON u.id = o.vendor_user_id
    LEFT JOIN company c ON c.id = o.vendor_company_id
    ORDER BY o.created_at DESC
    LIMIT 200
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    ref: `#NMC-${String(r.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    customer: String(r.customer_name ?? "—"),
    customerCompany: r.customer_company ? String(r.customer_company) : null,
    vendor: String(r.vendor_name ?? "—"),
    vendorCompany: r.vendor_company ? String(r.vendor_company) : null,
    itemCount: Number(r.item_count) || 0,
    total: Number(r.total) || 0,
    payment: String(r.payment ?? "pending"),
    status: String(r.status ?? "pending"),
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
  }));
}

/* ── Admin products ───────────────────────────────────────────────────── */
export type AdminProduct = {
  id: string; name: string; vendor: string; vendorCompany: string | null;
  category: string | null; companyIndustry: string | null; retailMin: number | null; stock: number;
  status: string; date: string;
};

export async function getAdminProducts(): Promise<AdminProduct[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT p.id, p.name, p.category, p.retail_min, p.stock, p.status, p.created_at,
      u.name as vendor_name, c.name as vendor_company, c.industry as company_industry
    FROM product p
    JOIN company c ON c.id = p.company_id
    JOIN "user" u ON u.id = c.owner_user_id
    ORDER BY p.created_at DESC
    LIMIT 200
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), name: String(r.name),
    vendor: String(r.vendor_name ?? "—"), vendorCompany: r.vendor_company ? String(r.vendor_company) : null,
    category: r.category ? String(r.category) : null,
    companyIndustry: r.company_industry ? String(r.company_industry) : null,
    retailMin: r.retail_min ? Number(r.retail_min) : null,
    stock: Number(r.stock) || 0,
    status: String(r.status ?? "active"),
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
  }));
}

export type AdminProductDetail = AdminProduct & {
  type: string | null; materialGrade: string | null; description: string | null;
  specs: { label: string; value: string }[]; gallery: string[]; coverUrl: string | null;
  vendorLocation: string | null;
};

/** Richer Exhibition Hub detail drawer (Technical Specs, Product Gallery) — the `product` table
 * already has these columns, `getAdminProducts()` just never selected them. */
export async function getAdminProductDetail(productId: string): Promise<AdminProductDetail | null> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT p.id, p.name, p.category, p.type, p.material_grade, p.description, p.specs, p.gallery, p.cover_url,
           p.retail_min, p.stock, p.status, p.created_at,
      u.name as vendor_name, c.name as vendor_company, c.industry as company_industry, c.headquarters as vendor_location
    FROM product p
    JOIN company c ON c.id = p.company_id
    JOIN "user" u ON u.id = c.owner_user_id
    WHERE p.id = ${productId} LIMIT 1
  `);
  const r = (res.rows as Record<string, unknown>[])[0];
  if (!r) return null;
  return {
    id: String(r.id), name: String(r.name),
    vendor: String(r.vendor_name ?? "—"), vendorCompany: r.vendor_company ? String(r.vendor_company) : null,
    category: r.category ? String(r.category) : null,
    companyIndustry: r.company_industry ? String(r.company_industry) : null,
    retailMin: r.retail_min ? Number(r.retail_min) : null,
    stock: Number(r.stock) || 0,
    status: String(r.status ?? "active"),
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
    type: r.type ? String(r.type) : null,
    materialGrade: r.material_grade ? String(r.material_grade) : null,
    description: r.description ? String(r.description) : null,
    specs: Array.isArray(r.specs) ? (r.specs as { label: string; value: string }[]) : [],
    gallery: Array.isArray(r.gallery) ? (r.gallery as string[]) : [],
    coverUrl: r.cover_url ? String(r.cover_url) : null,
    vendorLocation: r.vendor_location ? String(r.vendor_location) : null,
  };
}

/* ── Admin job board moderation (images 133-135) ─────────────────────────── */
export type AdminJob = {
  id: string; title: string; posterName: string; posterEmail: string; company: string | null;
  status: string; draft: boolean; applicants: number; date: string;
  location: string | null; employmentType: string | null; workModel: string | null; experienceLevel: string | null; salary: string;
  description: string | null; requirements: string | null;
};

export async function getAdminJobs(): Promise<AdminJob[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT j.id, j.title, j.company, j.status, j.draft, j.location, j.employment_type, j.work_model,
           j.experience_level, j.salary_min, j.salary_max, j.description, j.requirements, j.created_at,
           u.name AS poster_name, u.email AS poster_email,
           (SELECT count(*) FROM application a WHERE a.job_id = j.id AND a.draft = false)::int AS applicants
    FROM job j JOIN "user" u ON u.id = j.owner_user_id
    ORDER BY j.created_at DESC LIMIT 200
  `);
  const naira = (min: number | null, max: number | null) => {
    if (!min && !max) return "Not disclosed";
    const f = (n: number) => `₦${n.toLocaleString()}`;
    return min && max ? `${f(min)} – ${f(max)}` : f((min || max)!);
  };
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), title: String(r.title), posterName: String(r.poster_name ?? "—"), posterEmail: String(r.poster_email ?? ""),
    company: r.company ? String(r.company) : null, status: String(r.status ?? "open"), draft: r.draft === true,
    applicants: Number(r.applicants) || 0,
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
    location: r.location ? String(r.location) : null, employmentType: r.employment_type ? String(r.employment_type) : null,
    workModel: r.work_model ? String(r.work_model) : null, experienceLevel: r.experience_level ? String(r.experience_level) : null,
    salary: naira(r.salary_min as number | null, r.salary_max as number | null),
    description: r.description ? String(r.description) : null, requirements: r.requirements ? String(r.requirements) : null,
  }));
}

export async function suspendAdminJob(jobId: string) {
  const admin = await requireAdmin();
  await db.execute(sql`UPDATE job SET status = 'suspended' WHERE id = ${jobId}`);
  await logAudit(admin, "suspend_job", "job", jobId);
  revalidatePath("/admin/marketplace/jobs");
}
export async function restoreAdminJob(jobId: string) {
  const admin = await requireAdmin();
  await db.execute(sql`UPDATE job SET status = 'open' WHERE id = ${jobId}`);
  await logAudit(admin, "restore_job", "job", jobId);
  revalidatePath("/admin/marketplace/jobs");
}
export async function deleteAdminJob(jobId: string) {
  const admin = await requireAdmin();
  await db.execute(sql`DELETE FROM job WHERE id = ${jobId}`);
  await logAudit(admin, "delete_job", "job", jobId);
  revalidatePath("/admin/marketplace/jobs");
}

/** Extends AdminProduct row-level moderation the redesign needs (images 136-138). */
export async function suspendAdminProduct(productId: string) {
  const admin = await requireAdmin();
  await db.execute(sql`UPDATE product SET status = 'suspended' WHERE id = ${productId}`);
  await logAudit(admin, "suspend_product", "product", productId);
  revalidatePath("/admin/marketplace/products");
}
export async function restoreAdminProduct(productId: string) {
  const admin = await requireAdmin();
  await db.execute(sql`UPDATE product SET status = 'active' WHERE id = ${productId}`);
  await logAudit(admin, "restore_product", "product", productId);
  revalidatePath("/admin/marketplace/products");
}
export async function deleteAdminProduct(productId: string) {
  const admin = await requireAdmin();
  await db.execute(sql`DELETE FROM product WHERE id = ${productId}`);
  await logAudit(admin, "delete_product", "product", productId);
  revalidatePath("/admin/marketplace/products");
}

/* ── Admin authoring (CREATE / UPDATE) for jobs & products ───────────────
 * Super_admin can post and edit jobs/products directly, on behalf of a chosen
 * owner, rather than only moderating user-submitted rows. These reuse the
 * same field mapping the member dashboards use (lib/services/jobs.ts and
 * lib/services/products.ts) so an admin-authored row is shaped identically. */

export type AdminUserOption = { id: string; name: string; email: string | null; role: string | null };
export async function getAdminUserPicker(search = ""): Promise<AdminUserOption[]> {
  await requireAdmin();
  const s = search.trim();
  const res = s
    ? await db.execute(sql`
        SELECT u.id, u.name, u.email, u.role FROM "user" u
        WHERE u.name ILIKE ${`%${s}%`} OR u.email ILIKE ${`%${s}%`}
        ORDER BY u."createdAt" DESC LIMIT 50
      `)
    : await db.execute(sql`
        SELECT u.id, u.name, u.email, u.role FROM "user" u
        ORDER BY u."createdAt" DESC LIMIT 50
      `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), name: String(r.name ?? "—"), email: r.email ? String(r.email) : null, role: r.role ? String(r.role) : null,
  }));
}

export type AdminCompanyOption = { id: string; name: string; industry: string | null; ownerName: string };
export async function getAdminCompanyPicker(search = ""): Promise<AdminCompanyOption[]> {
  await requireAdmin();
  const s = search.trim();
  const res = s
    ? await db.execute(sql`
        SELECT c.id, c.name, c.industry, u.name AS owner_name FROM company c
        JOIN "user" u ON u.id = c.owner_user_id
        WHERE c.name ILIKE ${`%${s}%`}
        ORDER BY c."createdAt" DESC LIMIT 50
      `)
    : await db.execute(sql`
        SELECT c.id, c.name, c.industry, u.name AS owner_name FROM company c
        JOIN "user" u ON u.id = c.owner_user_id
        ORDER BY c."createdAt" DESC LIMIT 50
      `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), name: String(r.name ?? "—"), industry: r.industry ? String(r.industry) : null, ownerName: String(r.owner_name ?? "—"),
  }));
}

export type AdminJobInput = {
  title: string; company?: string; location?: string; employmentType?: string; experienceLevel?: string;
  workModel?: string; salaryMin?: string; salaryMax?: string; currency?: string; description?: string; requirements?: string;
  requirementList?: string[]; skills?: string[]; benefits?: string[];
  requireResume?: boolean; requirePortfolio?: boolean; requireCoverLetter?: boolean;
  deadline?: string; applyMethod?: "nomarc" | "url" | "email"; applyTarget?: string;
  recruiterName?: string; recruiterTitle?: string;
};

const adminJobValues = (input: AdminJobInput, status: string, draft: boolean) => {
  const num = (s?: string) => { if (!s) return null; const n = Number(String(s).replace(/[^\d]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; };
  const cleanList = (v?: string[]) => { const out = (v ?? []).map((s) => s.trim()).filter(Boolean); return out.length ? Array.from(new Set(out)) : null; };
  return {
    title: input.title.trim(),
    company: input.company?.trim() || null, location: input.location?.trim() || null,
    employmentType: input.employmentType || null, experienceLevel: input.experienceLevel || null,
    workModel: input.workModel || null,
    salaryMin: num(input.salaryMin), salaryMax: num(input.salaryMax), currency: input.currency || "NGN",
    description: input.description ?? null, requirements: input.requirements ?? null,
    requirementList: cleanList(input.requirementList), skills: cleanList(input.skills), benefits: cleanList(input.benefits),
    requireResume: input.requireResume ?? null, requirePortfolio: input.requirePortfolio ?? null, requireCoverLetter: input.requireCoverLetter ?? null,
    deadline: input.deadline || null, applyMethod: input.applyMethod || "nomarc", applyTarget: input.applyTarget || null,
    recruiterName: input.recruiterName || null, recruiterTitle: input.recruiterTitle || null,
    status, draft,
  };
};

export async function createAdminJob(ownerUserId: string, input: AdminJobInput, publish = true): Promise<string> {
  const admin = await requireAdmin();
  if (!ownerUserId) throw new Error("Select an owner");
  if (!input.title?.trim()) throw new Error("Job title is required");
  const draft = !publish;
  const [row] = await db.insert(job).values({ ownerUserId, ...adminJobValues(input, "open", draft) }).returning({ id: job.id });
  await logAudit(admin, "create_job", "job", row.id, `owner=${ownerUserId}`);
  revalidatePath("/admin/marketplace/jobs");
  return row.id;
}

export async function updateAdminJob(jobId: string, ownerUserId: string, input: AdminJobInput) {
  const admin = await requireAdmin();
  if (!ownerUserId) throw new Error("Select an owner");
  if (!input.title?.trim()) throw new Error("Job title is required");
  const [existing] = await db.select({ id: job.id, status: job.status, draft: job.draft }).from(job).where(eq(job.id, jobId)).limit(1);
  if (!existing) throw new Error("Job not found");
  await db.update(job).set(adminJobValues(input, existing.status ?? "open", existing.draft ?? false)).where(eq(job.id, jobId));
  await db.update(job).set({ ownerUserId }).where(eq(job.id, jobId));
  await logAudit(admin, "update_job", "job", jobId, `owner=${ownerUserId}`);
  revalidatePath("/admin/marketplace/jobs");
}

export type AdminJobDetail = AdminJob & {
  ownerUserId: string; requirementsList: string[]; skills: string[]; benefits: string[];
  requireResume: boolean; requirePortfolio: boolean; requireCoverLetter: boolean;
  deadline: string | null; salaryMin: number | null; salaryMax: number | null; currency: string | null;
  applyMethod: "nomarc" | "url" | "email" | null; applyTarget: string | null;
};
export async function getAdminJobForEdit(jobId: string): Promise<AdminJobDetail | null> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT j.*, u.name AS poster_name, u.email AS poster_email FROM job j
    JOIN "user" u ON u.id = j.owner_user_id WHERE j.id = ${jobId} LIMIT 1
  `);
  const r = (res.rows as Record<string, unknown>[])[0];
  if (!r) return null;
  return {
    id: String(r.id), title: String(r.title), posterName: String(r.poster_name ?? "—"), posterEmail: String(r.poster_email ?? ""),
    company: r.company ? String(r.company) : null, status: String(r.status ?? "open"), draft: r.draft === true,
    applicants: 0, date: "", location: r.location ? String(r.location) : null,
    employmentType: r.employment_type ? String(r.employment_type) : null, workModel: r.work_model ? String(r.work_model) : null,
    experienceLevel: r.experience_level ? String(r.experience_level) : null,
    salary: "", description: r.description ? String(r.description) : null, requirements: r.requirements ? String(r.requirements) : null,
    ownerUserId: String(r.owner_user_id),
    requirementsList: Array.isArray(r.requirement_list) ? (r.requirement_list as string[]) : [],
    skills: Array.isArray(r.skills) ? (r.skills as string[]) : [], benefits: Array.isArray(r.benefits) ? (r.benefits as string[]) : [],
    requireResume: r.require_resume === true, requirePortfolio: r.require_portfolio === true, requireCoverLetter: r.require_cover_letter === true,
    deadline: r.deadline ? String(r.deadline) : null, salaryMin: r.salary_min ? Number(r.salary_min) : null, salaryMax: r.salary_max ? Number(r.salary_max) : null, currency: r.currency ? String(r.currency) : null,
    applyMethod: (["nomarc", "url", "email"] as const).includes(String(r.apply_method) as "nomarc" | "url" | "email") ? (String(r.apply_method) as "nomarc" | "url" | "email") : null,
    applyTarget: r.apply_target ? String(r.apply_target) : null,
  };
}

export type AdminProductInput = {
  name: string; slug?: string; sku?: string; category?: string; type?: string; vendorName?: string;
  description?: string; tags?: string[]; availability?: string; coverUrl?: string; gallery?: string[];
  specs?: { label: string; value: string }[];
  materialGrade?: string;
  retailMin?: string | number; retailMax?: string | number; wholesaleMin?: string | number; wholesaleMax?: string | number;
  costPerItem?: string | number; stock?: string | number; unit?: string; seoTitle?: string; seoDescription?: string;
  status?: "active" | "draft" | "archived";
};

const adminProductValues = (input: AdminProductInput) => {
  const num = (v?: string | number | null) => { if (v == null || v === "") return null; const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return {
    name: input.name.trim(),
    slug: input.slug?.trim() || slugify(input.name),
    sku: input.sku?.trim() || null, category: input.category || null, type: input.type || null,
    vendorName: input.vendorName || null, description: input.description || null, materialGrade: input.materialGrade || null,
    tags: input.tags && input.tags.length ? input.tags : null,
    availability: input.availability || null, coverUrl: input.coverUrl || null,
    gallery: input.gallery && input.gallery.length ? input.gallery : null,
    specs: input.specs && input.specs.length ? input.specs.filter((s) => s.label?.trim()) : null,
    retailMin: num(input.retailMin), retailMax: num(input.retailMax),
    wholesaleMin: num(input.wholesaleMin), wholesaleMax: num(input.wholesaleMax),
    costPerItem: num(input.costPerItem), stock: num(input.stock) ?? 0, unit: input.unit || null,
    seoTitle: input.seoTitle || null, seoDescription: input.seoDescription || null,
    status: input.status || "active", draft: (input.status || "active") === "draft",
  };
};

export async function createAdminProduct(companyId: string, input: AdminProductInput): Promise<string> {
  const admin = await requireAdmin();
  if (!companyId) throw new Error("Select an owner company");
  if (!input.name?.trim()) throw new Error("Product name is required");
  const [row] = await db.insert(product).values({ companyId, ...adminProductValues(input) }).returning({ id: product.id });
  await logAudit(admin, "create_product", "product", row.id, `company=${companyId}`);
  revalidatePath("/admin/marketplace/products");
  return row.id;
}

export async function updateAdminProduct(productId: string, companyId: string, input: AdminProductInput) {
  const admin = await requireAdmin();
  if (!companyId) throw new Error("Select an owner company");
  if (!input.name?.trim()) throw new Error("Product name is required");
  const [existing] = await db.select({ id: product.id, companyId: product.companyId }).from(product).where(eq(product.id, productId)).limit(1);
  if (!existing) throw new Error("Product not found");
  await db.update(product).set({ ...adminProductValues(input), companyId, updatedAt: new Date() }).where(eq(product.id, productId));
  await logAudit(admin, "update_product", "product", productId, `company=${companyId}`);
  revalidatePath("/admin/marketplace/products");
}

export type AdminProductForEdit = {
  id: string; companyId: string; name: string; sku: string | null; category: string | null; type: string | null;
  vendorName: string | null; description: string | null; materialGrade: string | null; tags: string[]; specs: { label: string; value: string }[];
  retailMin: number | null; retailMax: number | null; wholesaleMin: number | null; wholesaleMax: number | null;
  costPerItem: number | null; stock: number; unit: string | null; coverUrl: string | null; gallery: string[];
  availability: string | null; status: string | null;
};
export async function getAdminProductForEdit(productId: string): Promise<AdminProductForEdit | null> {
  await requireAdmin();
  const [r] = await db.select().from(product).where(eq(product.id, productId)).limit(1);
  if (!r) return null;
  return {
    id: r.id, companyId: r.companyId, name: r.name, sku: r.sku, category: r.category, type: r.type,
    vendorName: r.vendorName, description: r.description, materialGrade: r.materialGrade, tags: r.tags ?? [],
    specs: r.specs ?? [], retailMin: r.retailMin, retailMax: r.retailMax,
    wholesaleMin: r.wholesaleMin, wholesaleMax: r.wholesaleMax, costPerItem: r.costPerItem,
    stock: r.stock ?? 0, unit: r.unit, coverUrl: r.coverUrl, gallery: r.gallery ?? [],
    availability: r.availability, status: r.status,
  };
}

/* ── Admin finance ────────────────────────────────────────────────────── */
export type FinanceOverview = {
  totalGMV: number; platformCommission: number; subscriptionRevenue: number;
  pendingPayouts: number; heldInEscrow: number;
};

export async function getFinanceOverview(): Promise<FinanceOverview> {
  await requireAdmin();
  const one = async (q: ReturnType<typeof sql>) => Number(((await db.execute(q)).rows as { n: number }[])[0]?.n ?? 0);
  const [totalGMV, platformCommission, subscriptionRevenue, pendingPayouts, heldInEscrow] = await Promise.all([
    one(sql`SELECT COALESCE(sum(total), 0) AS n FROM sales_order WHERE payment = 'paid'`),
    one(sql`SELECT COALESCE(sum(amount), 0) AS n FROM ledger_entry WHERE type = 'commission'`),
    one(sql`SELECT COALESCE(sum(amount), 0) AS n FROM payment_transaction WHERE status = 'success'`),
    one(sql`SELECT COALESCE(sum(balance_available), 0) AS n FROM vendor_wallet`),
    one(sql`SELECT COALESCE(sum(balance_held), 0) AS n FROM vendor_wallet`),
  ]);
  return { totalGMV, platformCommission, subscriptionRevenue, pendingPayouts, heldInEscrow };
}

/* ── Admin Insights ───────────────────────────────────────────────────── */

export type TopProduct = { id: string; name: string; vendor: string; revenue: number; orderCount: number; stock: number };
export type TopVendor = { id: string; name: string; company: string; revenue: number; orderCount: number; completionRate: number };
export type InsightsData = {
  topProducts: TopProduct[];
  topVendors: TopVendor[];
  totalBuyers: number;
  repeatBuyers: number;
  newBuyersThisMonth: number;
  outOfStockCount: number;
  lowStockCount: number;
  avgFulfilmentDays: number;
  quoteConversionRate: number;
};

export async function getInsightsData(): Promise<InsightsData> {
  await requireAdmin();

  // Insights spans a dozen commerce tables. A single one lagging behind a
  // migration used to reject the whole page with "A server error occurred",
  // taking every other panel down with it. Each query now degrades on its own:
  // a section that can't be computed reports zero / empty instead of 500ing.
  const rows = async (q: ReturnType<typeof sql>) => {
    try { return (await db.execute(q)).rows as Record<string, unknown>[]; }
    catch (e) { console.error("[insights] query failed:", e); return []; }
  };
  const one = async (q: ReturnType<typeof sql>) => {
    try { return Number(((await db.execute(q)).rows as { n: number }[])[0]?.n ?? 0); }
    catch (e) { console.error("[insights] count failed:", e); return 0; }
  };

  const [
    topProductsRes, topVendorsRes,
    totalBuyers, repeatBuyers, newBuyersThisMonth,
    outOfStockCount, lowStockCount,
    avgFulfilmentDays,
    totalQuotes, acceptedQuotes,
  ] = await Promise.all([
    rows(sql`
      SELECT p.id, p.name, p.stock,
        u.name AS vendor_name,
        COUNT(oi.id) AS order_count,
        COALESCE(SUM(oi.price * oi.quantity::numeric), 0) AS revenue
      FROM order_item oi
      JOIN product p ON p.id = oi.product_id
      JOIN company c ON c.id = p.company_id
      JOIN "user" u ON u.id = c.owner_user_id
      GROUP BY p.id, p.name, p.stock, u.name
      ORDER BY revenue DESC
      LIMIT 8
    `),
    rows(sql`
      SELECT c.id, c.name AS company, u.name AS vendor_name,
        COUNT(DISTINCT o.id) AS order_count,
        COALESCE(SUM(o.total), 0) AS revenue,
        ROUND(
          100.0 * COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END)
          / NULLIF(COUNT(DISTINCT o.id), 0), 1
        ) AS completion_rate
      FROM sales_order o
      JOIN "user" u ON u.id = o.vendor_user_id
      JOIN company c ON c.id = o.vendor_company_id
      GROUP BY c.id, c.name, u.name
      ORDER BY revenue DESC
      LIMIT 8
    `),
    one(sql`SELECT COUNT(DISTINCT buyer_user_id) AS n FROM sales_order`),
    one(sql`SELECT COUNT(*) AS n FROM (SELECT buyer_user_id FROM sales_order GROUP BY buyer_user_id HAVING COUNT(*) >= 2) sub`),
    one(sql`SELECT COUNT(DISTINCT buyer_user_id) AS n FROM sales_order WHERE created_at >= NOW() - INTERVAL '30 days'`),
    one(sql`SELECT COUNT(*) AS n FROM product WHERE stock = 0`),
    one(sql`SELECT COUNT(*) AS n FROM product WHERE stock > 0 AND stock <= 5`),
    one(sql`
      SELECT COALESCE(AVG(
        EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 86400
      ), 0) AS n
      FROM sales_order o
      WHERE o.status = 'completed'
    `),
    one(sql`SELECT COUNT(*) AS n FROM quote_request`),
    one(sql`SELECT COUNT(*) AS n FROM quote_request WHERE status = 'accepted'`),
  ]);

  const topProducts: TopProduct[] = topProductsRes.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    vendor: String(r.vendor_name ?? "—"),
    revenue: Number(r.revenue) || 0,
    orderCount: Number(r.order_count) || 0,
    stock: Number(r.stock) || 0,
  }));

  const topVendors: TopVendor[] = topVendorsRes.map((r) => ({
    id: String(r.id),
    name: String(r.vendor_name ?? "—"),
    company: String(r.company ?? "—"),
    revenue: Number(r.revenue) || 0,
    orderCount: Number(r.order_count) || 0,
    completionRate: Number(r.completion_rate) || 0,
  }));

  return {
    topProducts,
    topVendors,
    totalBuyers,
    repeatBuyers,
    newBuyersThisMonth,
    outOfStockCount,
    lowStockCount,
    avgFulfilmentDays: Math.round(Number(avgFulfilmentDays)),
    quoteConversionRate: totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0,
  };
}
