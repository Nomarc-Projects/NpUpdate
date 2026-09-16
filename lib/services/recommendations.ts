"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { recommendation } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { getOrCreateDirectConversation, sendMessage } from "@/lib/services/messaging";

export type ReceivedRec = {
  id: string; name: string; relationship: string; date: string; body: string; avatarUrl: string; status: string; pinned: boolean;
};

/**
 * Recommendations written about the current user. `scope: "published"` = the
 * main Recommendations list (approved, pinned first); `scope: "drafts"` =
 * pending + hidden (the Drafts sub-tab, images 8/81/97).
 */
export async function getMyReceivedRecommendations(scope: "published" | "drafts" = "published"): Promise<ReceivedRec[]> {
  const uid = await requireUserId();
  const statusFilter = scope === "published" ? sql`r.status = 'approved'` : sql`r.status IN ('pending', 'hidden')`;
  const res = await db.execute(sql`
    SELECT r.id, r.relationship, r.body, r.status, r.pinned, r.created_at,
           u.name, COALESCE(p.avatar_url, u.image) AS avatar, COALESCE(p.headline,'') AS headline
    FROM recommendation r
    JOIN "user" u ON u.id = r.recommender_user_id
    LEFT JOIN profile p ON p.user_id = r.recommender_user_id
    WHERE r.recommendee_user_id = ${uid} AND ${statusFilter}
    ORDER BY r.pinned DESC, (r.status = 'pending') DESC, r.created_at DESC
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? "Member"),
    relationship: String(r.relationship || r.headline || ""),
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
    body: String(r.body ?? ""),
    avatarUrl: String(r.avatar ?? ""),
    status: String(r.status ?? "pending"),
    pinned: Boolean(r.pinned),
  }));
}

async function setStatus(id: string, status: string) {
  const uid = await requireUserId();
  await db.update(recommendation).set({ status }).where(and(eq(recommendation.id, id), eq(recommendation.recommendeeUserId, uid)));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
}

export async function approveRecommendation(id: string) { await setStatus(id, "approved"); }
export async function hideRecommendation(id: string) { await setStatus(id, "hidden"); }
/** Hidden → back to Drafts (images 81/97 "Unhide"). */
export async function unhideRecommendation(id: string) { await setStatus(id, "pending"); }

export async function togglePinRecommendation(id: string, pinned: boolean) {
  const uid = await requireUserId();
  await db.update(recommendation).set({ pinned }).where(and(eq(recommendation.id, id), eq(recommendation.recommendeeUserId, uid)));
  revalidatePath("/dashboard");
}

export async function deleteRecommendation(id: string) {
  const uid = await requireUserId();
  await db.delete(recommendation).where(and(eq(recommendation.id, id), eq(recommendation.recommendeeUserId, uid)));
  revalidatePath("/dashboard");
}

/**
 * "Write a recommendation for someone" already exists as `recommendProfessional`
 * in `lib/services/directory.ts` (used from the Find Professionals / profile
 * view) — it inserts the same row + notifies the recipient. Reuse that; don't
 * duplicate it here.
 *
 * "Ask for a recommendation" (image 8/75) — there's no separate request table,
 * so the ask is a direct message with a friendly prompt; the recipient replies
 * by using the same "Write a recommendation" flow on the requester's profile.
 */
export async function requestRecommendation(targetUserId: string, note?: string) {
  const uid = await requireUserId();
  if (uid === targetUserId) throw new Error("Cannot request from yourself");
  const conversationId = await getOrCreateDirectConversation(targetUserId);
  const body =
    note?.trim() ||
    "Hi! Would you be open to writing me a short recommendation on Nomarc? It'd mean a lot — thank you!";
  await sendMessage(conversationId, body);
  return conversationId;
}

/** Recommendations the current user has written for others (their "given" list). */
export async function getRecommendationsGivenByMe(): Promise<ReceivedRec[]> {
  const uid = await requireUserId();
  const res = await db.execute(sql`
    SELECT r.id, r.relationship, r.body, r.status, r.pinned, r.created_at,
           u.name, COALESCE(p.avatar_url, u.image) AS avatar, COALESCE(p.headline,'') AS headline
    FROM recommendation r
    JOIN "user" u ON u.id = r.recommendee_user_id
    LEFT JOIN profile p ON p.user_id = r.recommendee_user_id
    WHERE r.recommender_user_id = ${uid}
    ORDER BY r.created_at DESC
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? "Member"),
    relationship: String(r.relationship || r.headline || ""),
    pinned: Boolean(r.pinned),
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
    body: String(r.body ?? ""),
    avatarUrl: String(r.avatar ?? ""),
    status: String(r.status ?? "pending"),
  }));
}
