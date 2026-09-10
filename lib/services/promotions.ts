"use server";

import { headers } from "next/headers";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { promotion, userRole } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { asExhibitorPlan, PLAN_LABEL } from "@/lib/entitlements";
import { EXHIBITOR_PROFILE_ADS } from "@/lib/services/exhibitor-plan-rules";

/** Admin-only guard for the review functions below (approve/reject/terminate). */
async function requireAdmin(): Promise<string> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "super_admin") throw new Error("Forbidden");
  return uid;
}

export type PromotionKind = "profile" | "project" | "product";
/** draft = composed but not yet paid for; see lib/services/promotion-checkout.ts */
export type PromotionStatus = "draft" | "pending_review" | "active" | "paused" | "rejected" | "completed";

export type Promotion = {
  id: string;
  kind: PromotionKind;
  refId: string | null;
  headline: string;
  description: string | null;
  bannerImageUrl: string | null;
  status: PromotionStatus;
  rejectionReason: string | null;
  views: number;
  clicks: number;
  createdAt: string;
  durationDays: number | null;
  amount: number | null;
  paidAt: string | null;
  endsAt: string | null;
};

function mapRow(r: typeof promotion.$inferSelect): Promotion {
  return {
    id: r.id,
    kind: r.kind as PromotionKind,
    refId: r.refId,
    headline: r.headline,
    description: r.description,
    bannerImageUrl: r.bannerImageUrl,
    status: r.status as PromotionStatus,
    rejectionReason: r.rejectionReason,
    views: r.views,
    clicks: r.clicks,
    createdAt: r.createdAt.toISOString(),
    durationDays: r.durationDays ?? null,
    amount: r.amount ?? null,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    endsAt: r.endsAt ? r.endsAt.toISOString() : null,
  };
}

export type PromotionEligibility = { eligible: boolean; via: "partner" | "key_player" | null; planLabel: string };

/**
 * Who may run promotions (paid campaigns). Two routes qualify, and only two:
 *  - an exhibitor on the top `key_player` plan (Exhibition Hub premium), or
 *  - an account manually granted partnership by an admin (`user.is_partner`).
 * Everything else — free accounts, professional paid plans, the lower
 * exhibitor tiers — is blocked here AND surfaced as "not eligible" to the
 * dashboard, so the ads product can't be bought or created off-books.
 */
export async function requirePromotionEligibility(uid: string): Promise<PromotionEligibility> {
  // Guarded: if the is_partner column isn't migrated yet, no one is a partner
  // (the key_player check below still runs), so eligibility fails closed.
  let isPartner = false;
  try {
    const [u] = (await db.execute(sql`SELECT COALESCE(is_partner, false) AS is_partner FROM "user" WHERE id = ${uid} LIMIT 1`)).rows as { is_partner: boolean | null }[];
    isPartner = u?.is_partner === true;
  } catch { /* column not present yet — no partners */ }
  if (isPartner) return { eligible: true, via: "partner", planLabel: "Partner" };

  const rows = await db
    .select({ plan: userRole.plan })
    .from(userRole)
    .where(and(eq(userRole.userId, uid), eq(userRole.role, "exhibitor"), eq(userRole.status, "active")));
  if (rows.some((r) => r.plan === "key_player")) return { eligible: true, via: "key_player", planLabel: PLAN_LABEL.key_player };

  return { eligible: false, via: null, planLabel: PLAN_LABEL.key_player };
}

/** The signed-in user's own promotion rights, for the dashboard tabs. */
export async function getPromotionEligibility(): Promise<PromotionEligibility> {
  const uid = await requireUserId();
  return requirePromotionEligibility(uid);
}

/** Shared rejection copy for every blocked promotions entry point. */
const PROMOTIONS_NOT_ALLOWED_MESSAGE =
  "Promotions are reserved for Key players on the Exhibition Hub and for Nomarc partners.";

/** The current user's own Ads Board — every promotion they've submitted. */
export async function getMyPromotions(): Promise<Promotion[]> {
  const uid = await requireUserId();
  const rows = await db.select().from(promotion).where(eq(promotion.ownerUserId, uid)).orderBy(desc(promotion.createdAt));
  return rows.map(mapRow);
}

/**
 * Profile promotion ads bundled with the caller's exhibitor tier, and how many
 * of them are already spoken for. A pending_review ad counts against the
 * allowance — it is queued to go live, so releasing the slot on submission
 * would let someone stack an unlimited backlog past their entitlement.
 *
 * Returns null when the caller isn't a subscribed exhibitor: professionals buy
 * profile ads individually and are not capped by this ladder.
 */
export async function getProfileAdAllowance(): Promise<{ allowance: number; used: number; planLabel: string } | null> {
  const uid = await requireUserId();
  const rows = await db
    .select({ plan: userRole.plan })
    .from(userRole)
    .where(and(eq(userRole.userId, uid), eq(userRole.role, "exhibitor"), eq(userRole.status, "active")));
  if (rows.length === 0) return null;

  const plan = rows.map((r) => asExhibitorPlan(r.plan)).find((p) => p !== "free") ?? "free";
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(promotion)
    .where(
      and(
        eq(promotion.ownerUserId, uid),
        eq(promotion.kind, "profile"),
        sql`${promotion.status} in ('active', 'pending_review')`,
      ),
    );
  return { allowance: EXHIBITOR_PROFILE_ADS[plan], used: Number(row?.n ?? 0), planLabel: PLAN_LABEL[plan] };
}

/**
 * Submit a new promotion (profile / project / product) for review — the
 * "Create Profile/Project/Product Promotion" forms (images 11/12/83/85).
 * Always lands as `pending_review`; admins approve/reject via the Ad Reviews
 * console.
 */
export async function createPromotion(input: {
  kind: PromotionKind;
  refId?: string;
  headline: string;
  description?: string;
  bannerImageUrl?: string;
}): Promise<string> {
  const uid = await requireUserId();
  if (!input.headline.trim()) throw new Error("Headline is required");

  // Restriction gate: only Key players exhibitors and Nomarc partners may run
  // promotions. Enforced on the server, not just in the dashboard UI.
  const eligibility = await requirePromotionEligibility(uid);
  if (!eligibility.eligible) throw new Error(PROMOTIONS_NOT_ALLOWED_MESSAGE);

  // Enforced here, not just in the UI — the server action is callable directly.
  if (input.kind === "profile") {
    const quota = await getProfileAdAllowance();
    if (quota && quota.used >= quota.allowance) {
      throw new Error(
        quota.allowance === 0
          ? `Profile promotion ads aren't included on the ${quota.planLabel} plan. Upgrade to Key players to run one.`
          : `Your ${quota.planLabel} plan includes ${quota.allowance} profile promotion ad. Remove the active one to run another.`,
      );
    }
  }

  const [row] = await db
    .insert(promotion)
    .values({
      ownerUserId: uid,
      kind: input.kind,
      refId: input.refId ?? null,
      headline: input.headline.trim(),
      description: input.description?.trim() || null,
      bannerImageUrl: input.bannerImageUrl || null,
      // Composed, not queued: a campaign only reaches review once its run has
      // been paid for (see lib/services/promotion-checkout.ts).
      status: "draft",
    })
    .returning({ id: promotion.id });
  revalidatePath("/dashboard");
  return row.id;
}

async function ownedUpdate(id: string, set: Partial<typeof promotion.$inferInsert>) {
  const uid = await requireUserId();
  await db.update(promotion).set({ ...set, updatedAt: new Date() }).where(and(eq(promotion.id, id), eq(promotion.ownerUserId, uid)));
  revalidatePath("/dashboard");
}

/** Pause an active campaign — owner action (image 86/142). */
export async function pausePromotion(id: string) {
  await ownedUpdate(id, { status: "paused" });
}

/** Resume a paused campaign. */
export async function resumePromotion(id: string) {
  const uid = await requireUserId();
  const eligibility = await requirePromotionEligibility(uid);
  if (!eligibility.eligible) throw new Error("Your promotion eligibility has lapsed.");
  await ownedUpdate(id, { status: "active" });
}

/** Withdraw a pending submission before it's reviewed. */
export async function cancelPromotionSubmission(id: string) {
  const uid = await requireUserId();
  await db.delete(promotion).where(and(eq(promotion.id, id), eq(promotion.ownerUserId, uid), eq(promotion.status, "pending_review")));
  revalidatePath("/dashboard");
}

/** Edit a rejected promotion and resubmit it for review. */
/**
 * Corrected resubmission after a rejection. Deliberately does not re-charge:
 * the original payment stays on the row, which is the "held as a credit … at no
 * extra cost" guarantee shown on the campaign-duration modal.
 */
export async function resubmitPromotion(id: string, input: { headline: string; description?: string; bannerImageUrl?: string }) {
  const uid = await requireUserId();
  const eligibility = await requirePromotionEligibility(uid);
  if (!eligibility.eligible) throw new Error("Your promotion eligibility has lapsed.");
  await ownedUpdate(id, {
    headline: input.headline.trim(),
    description: input.description?.trim() || null,
    bannerImageUrl: input.bannerImageUrl || undefined,
    // Back to draft, not straight to review: the duration step runs again and
    // reuses the existing payment, so the credit is applied rather than the ad
    // skipping the paid gate entirely.
    status: "draft",
    rejectionReason: null,
  });
}

/** Permanently remove a completed/rejected record from the owner's list. */
export async function deletePromotion(id: string) {
  const uid = await requireUserId();
  await db.delete(promotion).where(and(eq(promotion.id, id), eq(promotion.ownerUserId, uid)));
  revalidatePath("/dashboard");
}

/* ── Admin moderation (Ad Reviews + Active Campaigns) ────────────────────── */

export type AdminPromotion = Promotion & { ownerUserId: string; ownerName: string; ownerEmail: string; ownerRole: string };

function mapAdminRow(r: Record<string, unknown>): AdminPromotion {
  return {
    id: String(r.id),
    kind: String(r.kind) as PromotionKind,
    refId: (r.ref_id as string) ?? null,
    headline: String(r.headline),
    description: (r.description as string) ?? null,
    bannerImageUrl: (r.banner_image_url as string) ?? null,
    status: String(r.status) as PromotionStatus,
    rejectionReason: (r.rejection_reason as string) ?? null,
    views: Number(r.views ?? 0),
    clicks: Number(r.clicks ?? 0),
    createdAt: r.created_at ? new Date(String(r.created_at)).toISOString() : "",
    ownerUserId: String(r.owner_user_id),
    ownerName: String(r.owner_name ?? "Member"),
    ownerEmail: String(r.owner_email ?? ""),
    ownerRole: String(r.owner_role ?? "professional"),
    durationDays: r.duration_days ? Number(r.duration_days) : null,
    amount: r.amount ? Number(r.amount) : null,
    paidAt: r.paid_at ? new Date(String(r.paid_at)).toISOString() : null,
    endsAt: r.ends_at ? new Date(String(r.ends_at)).toISOString() : null,
  };
}

/** Pending submissions awaiting admin decision (Ad Reviews, image 139). */
export async function listPendingPromotions(): Promise<AdminPromotion[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT p.*, u.name AS owner_name, u.email AS owner_email, COALESCE(u.role, 'professional') AS owner_role
    FROM promotion p JOIN "user" u ON u.id = p.owner_user_id
    WHERE p.status = 'pending_review'
    ORDER BY p.created_at ASC
  `);
  return (res.rows as Record<string, unknown>[]).map(mapAdminRow);
}

/** Live/paused/completed/rejected campaigns (Active Campaigns, image 141). */
export async function listAllPromotions(): Promise<AdminPromotion[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT p.*, u.name AS owner_name, u.email AS owner_email, COALESCE(u.role, 'professional') AS owner_role
    FROM promotion p JOIN "user" u ON u.id = p.owner_user_id
    WHERE p.status <> 'pending_review'
    ORDER BY p.created_at DESC
  `);
  return (res.rows as Record<string, unknown>[]).map(mapAdminRow);
}

async function adminReview(id: string, status: PromotionStatus, rejectionReason?: string) {
  const uid = await requireAdmin();
  await db.update(promotion).set({ status, rejectionReason: rejectionReason ?? null, reviewedBy: uid, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(promotion.id, id));
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

/**
 * Approve and start the clock. The run window opens on approval, not on
 * payment — an ad held two days in review must still get the full week or
 * month that was bought.
 */
export async function approvePromotion(id: string) {
  const uid = await requireAdmin();
  const [row] = await db
    .select({ durationDays: promotion.durationDays, ownerUserId: promotion.ownerUserId })
    .from(promotion)
    .where(eq(promotion.id, id))
    .limit(1);
  if (!row) throw new Error("That promotion no longer exists.");
  // Second line of the restriction gate: don't let a lapsed campaign slip
  // through approval even though its owner was eligible when it was paid for.
  const eligibility = await requirePromotionEligibility(row.ownerUserId);
  if (!eligibility.eligible) throw new Error(
    "This campaign's owner is no longer eligible to run promotions (Key players exhibitor plan or Nomarc partner required).",
  );
  const days = row.durationDays ?? 30;
  const now = new Date();
  await db
    .update(promotion)
    .set({
      status: "active",
      rejectionReason: null,
      reviewedBy: uid,
      reviewedAt: now,
      startedAt: now,
      endsAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
      updatedAt: now,
    })
    .where(eq(promotion.id, id));
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function rejectPromotion(id: string, reason: string) {
  await adminReview(id, "rejected", reason);
}

/** Admin ends a campaign outright (Terminate, image 142). */
export async function terminatePromotion(id: string) {
  await adminReview(id, "completed");
}

/**
 * Admin-scoped pause/resume — NOT the same as the owner-scoped
 * `pausePromotion`/`resumePromotion` above (those filter by
 * `owner_user_id = requireUserId()`, so an admin calling them updates zero
 * rows since the admin isn't the campaign's owner). This is the bug the
 * Active Campaigns view used to work around by calling `terminatePromotion`
 * for "Pause" and `approvePromotion` for "Resume" — which actually
 * completed/re-approved the campaign instead of pausing/resuming it.
 */
export async function adminPausePromotion(id: string) {
  await adminReview(id, "paused");
}
export async function adminResumePromotion(id: string) {
  await adminReview(id, "active");
}
