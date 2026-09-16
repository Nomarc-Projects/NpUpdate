"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { follow } from "@/lib/db/schema";
import { requireUserId, getCurrentUserId } from "@/lib/server-user";

export type NetPerson = {
  id: string; name: string; avatarUrl: string; headline: string; location: string;
  verified: boolean; followsMe: boolean; iFollow: boolean; online: boolean;
};

// "online" = last_seen within 90s (enforced inline in the SQL below).

/** Heartbeat — mark the current user active now. Safe no-op if not signed in. */
export async function heartbeat(): Promise<void> {
  try {
    const uid = await getCurrentUserId();
    if (!uid) return;
    await db.execute(sql`UPDATE "user" SET "last_seen_at" = now() WHERE id = ${uid}`);
  } catch { /* pre-migration / transient — ignore */ }
}

export async function followUser(followeeId: string): Promise<void> {
  const uid = await requireUserId();
  if (followeeId === uid) return;
  await db.insert(follow).values({ followerId: uid, followeeId }).onConflictDoNothing();
  revalidatePath("/dashboard/people");
  revalidatePath("/dashboard/find-professionals");
}

export async function unfollowUser(followeeId: string): Promise<void> {
  const uid = await requireUserId();
  await db.delete(follow).where(and(eq(follow.followerId, uid), eq(follow.followeeId, followeeId)));
  revalidatePath("/dashboard/people");
  revalidatePath("/dashboard/find-professionals");
}

/** Set of userIds (from the given list) that the current user already follows. */
export async function getFollowingSet(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const uid = await getCurrentUserId();
    if (!uid) return [];
    const rows = await db.select({ f: follow.followeeId }).from(follow)
      .where(and(eq(follow.followerId, uid), sql`${follow.followeeId} = ANY(${ids})`));
    return rows.map((r) => r.f);
  } catch { return []; }
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  try {
    const res = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM "follow" WHERE followee_id = ${userId}) AS followers,
        (SELECT count(*) FROM "follow" WHERE follower_id = ${userId}) AS following
    `);
    const r = (res.rows as { followers: number; following: number }[])[0];
    return { followers: Number(r?.followers ?? 0), following: Number(r?.following ?? 0) };
  } catch { return { followers: 0, following: 0 }; }
}

/** People I follow ("Following") or who follow me ("Followers"). */
export async function getNetwork(kind: "following" | "followers"): Promise<NetPerson[]> {
  try {
    const uid = await getCurrentUserId();
    if (!uid) return [];
    // The "other" user is the followee (following) or the follower (followers).
    const otherCol = kind === "following" ? sql`f.followee_id` : sql`f.follower_id`;
    const meCol = kind === "following" ? sql`f.follower_id` : sql`f.followee_id`;
    const res = await db.execute(sql`
      SELECT u.id, u.name, COALESCE(p.avatar_url, u.image, '') AS avatar,
             COALESCE(p.headline, '') AS headline, COALESCE(p.location, '') AS location,
             (SELECT count(*) FROM "verification_request" v WHERE v.user_id = u.id AND v.status = 'approved') > 0 AS verified,
             EXISTS(SELECT 1 FROM "follow" x WHERE x.follower_id = ${uid} AND x.followee_id = u.id) AS i_follow,
             EXISTS(SELECT 1 FROM "follow" y WHERE y.follower_id = u.id AND y.followee_id = ${uid}) AS follows_me,
             (u.last_seen_at IS NOT NULL AND u.last_seen_at > now() - interval '90 seconds') AS online
      FROM "follow" f
      JOIN "user" u ON u.id = ${otherCol}
      LEFT JOIN profile p ON p.user_id = u.id
      WHERE ${meCol} = ${uid}
      ORDER BY f.created_at DESC
    `);
    return (res.rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id), name: String(r.name ?? "Member"), avatarUrl: String(r.avatar ?? ""),
      headline: String(r.headline ?? ""), location: String(r.location ?? ""),
      verified: r.verified === true, iFollow: r.i_follow === true, followsMe: r.follows_me === true,
      online: r.online === true,
    }));
  } catch { return []; }
}

/** Whether the current user and `otherId` are connected (either follows the other). */
export async function relationTo(otherId: string): Promise<{ iFollow: boolean; followsMe: boolean }> {
  try {
    const uid = await getCurrentUserId();
    if (!uid) return { iFollow: false, followsMe: false };
    const res = await db.execute(sql`
      SELECT
        EXISTS(SELECT 1 FROM "follow" WHERE follower_id = ${uid} AND followee_id = ${otherId}) AS i_follow,
        EXISTS(SELECT 1 FROM "follow" WHERE follower_id = ${otherId} AND followee_id = ${uid}) AS follows_me
    `);
    const r = (res.rows as { i_follow: boolean; follows_me: boolean }[])[0];
    return { iFollow: r?.i_follow === true, followsMe: r?.follows_me === true };
  } catch { return { iFollow: false, followsMe: false }; }
}

/** Map of userId → online (seen within the window). */
export async function presenceFor(userIds: string[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  if (userIds.length === 0) return out;
  try {
    const res = await db.execute(sql`
      SELECT id, (last_seen_at IS NOT NULL AND last_seen_at > now() - interval '90 seconds') AS online
      FROM "user" WHERE id IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})
    `);
    for (const r of res.rows as { id: string; online: boolean }[]) out[r.id] = r.online === true;
  } catch { /* pre-migration */ }
  return out;
}
