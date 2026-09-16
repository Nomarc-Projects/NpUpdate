"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { review } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { notify } from "@/lib/notify-internal";

export type ReviewRow = { id: string; name: string; avatarUrl: string; rating: number; comment: string | null; date: string; mine: boolean };
export type RatingSummary = { avg: number; count: number };

export async function getReviews(subjectType: "professional" | "company", subjectId: string): Promise<{ summary: RatingSummary; reviews: ReviewRow[] }> {
  let me: string | null = null;
  try { me = await requireUserId(); } catch { /* public view */ }
  const res = await db.execute(sql`
    SELECT r.id, r.rating, r.comment, r.created_at, r.reviewer_user_id,
           u.name, COALESCE(p.avatar_url, u.image) AS avatar
    FROM review r JOIN "user" u ON u.id = r.reviewer_user_id
    LEFT JOIN profile p ON p.user_id = r.reviewer_user_id
    WHERE r.subject_type = ${subjectType} AND r.subject_id = ${subjectId}
    ORDER BY r.created_at DESC
  `);
  const rows = res.rows as Record<string, unknown>[];
  const reviews: ReviewRow[] = rows.map((r) => ({
    id: String(r.id), name: String(r.name ?? "Member"), avatarUrl: String(r.avatar ?? ""),
    rating: Number(r.rating ?? 0), comment: (r.comment as string) ?? null,
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
    mine: me != null && String(r.reviewer_user_id) === me,
  }));
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return { summary: { avg, count }, reviews };
}

export async function leaveReview(input: { subjectType: "professional" | "company"; subjectId: string; rating: number; comment?: string }) {
  const uid = await requireUserId();
  if (input.subjectType === "professional" && input.subjectId === uid) throw new Error("You can't review yourself");
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  if (!rating) throw new Error("Pick a rating");

  // one review per reviewer per subject — upsert
  const existing = await db.execute(sql`
    SELECT id FROM review WHERE reviewer_user_id = ${uid} AND subject_type = ${input.subjectType} AND subject_id = ${input.subjectId} LIMIT 1
  `);
  const row = (existing.rows as { id: string }[])[0];
  if (row) {
    await db.update(review).set({ rating, comment: input.comment || null }).where(sql`${review.id} = ${row.id}`);
  } else {
    await db.insert(review).values({ reviewerUserId: uid, subjectType: input.subjectType, subjectId: input.subjectId, rating, comment: input.comment || null });
    if (input.subjectType === "professional") {
      await notify(input.subjectId, { type: "recommendation", title: "You received a new review", body: `${rating}★ — view it on your profile.`, href: "/dashboard/profile" });
    }
  }
  revalidatePath("/dashboard/find-professionals");
}
