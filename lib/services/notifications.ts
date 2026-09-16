"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { notification } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type NotificationRow = {
  id: string; type: string; title: string; body: string | null; href: string | null; read: boolean; time: string; createdAt: string;
};

function rel(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// `notify` now lives in lib/notify-internal.ts. Exported from here — a
// "use server" module — it was an anonymous POST endpoint that let anyone drop
// a notification linking anywhere into any user's feed.

// Read paths degrade to an empty result rather than throwing: the pages that
// call them await them bare, and a dropped connection took the whole page to
// the error boundary. Writes still throw — the caller needs to know those failed.
export async function getMyNotifications(): Promise<NotificationRow[]> {
  try {
    const uid = await requireUserId();
    const rows = await db.select().from(notification).where(eq(notification.userId, uid)).orderBy(desc(notification.createdAt)).limit(50);
    return rows.map((n) => ({
      id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, read: !!n.read,
      time: rel(new Date(n.createdAt)), createdAt: new Date(n.createdAt).toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const uid = await requireUserId();
    const res = await db.execute(sql`SELECT count(*) AS n FROM notification WHERE user_id = ${uid} AND read = false`);
    return Number((res.rows as { n: number }[])[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: string) {
  const uid = await requireUserId();
  await db.update(notification).set({ read: true }).where(and(eq(notification.id, id), eq(notification.userId, uid)));
  revalidatePath("/dashboard/notifications");
}

export async function markAllNotificationsRead() {
  const uid = await requireUserId();
  await db.update(notification).set({ read: true }).where(eq(notification.userId, uid));
  revalidatePath("/dashboard/notifications");
}

export async function deleteNotification(id: string) {
  const uid = await requireUserId();
  await db.delete(notification).where(and(eq(notification.id, id), eq(notification.userId, uid)));
  revalidatePath("/dashboard/notifications");
}
