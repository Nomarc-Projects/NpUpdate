"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { announcement } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { requireAdmin } from "@/lib/authz";

export type Announcement = { id: string; title: string; body: string | null; href: string | null; audience: string; active: boolean; date: string };

const map = (r: typeof announcement.$inferSelect): Announcement => ({
  id: r.id, title: r.title, body: r.body, href: r.href, audience: r.audience ?? "all", active: !!r.active,
  date: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
});

export async function listAnnouncements(): Promise<Announcement[]> {
  await requireAdmin();
  const rows = await db.select().from(announcement).orderBy(desc(announcement.createdAt));
  return rows.map(map);
}

export async function createAnnouncement(input: { title: string; body?: string; href?: string; audience?: string }) {
  await requireAdmin();
  if (!input.title.trim()) throw new Error("Title is required");
  await db.insert(announcement).values({ title: input.title.trim(), body: input.body || null, href: input.href || null, audience: input.audience || "all" });
  revalidatePath("/admin/announcements");
}

export async function toggleAnnouncementActive(id: string, active: boolean) {
  await requireAdmin();
  await db.update(announcement).set({ active }).where(eq(announcement.id, id));
  revalidatePath("/admin/announcements");
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();
  await db.delete(announcement).where(eq(announcement.id, id));
  revalidatePath("/admin/announcements");
}

/** Public: the latest active announcement for a given audience (or 'all'). */
export async function getActiveAnnouncement(audience: string): Promise<Announcement | null> {
  const rows = await db.select().from(announcement).where(eq(announcement.active, true)).orderBy(desc(announcement.createdAt)).limit(20);
  const match = rows.find((r) => (r.audience ?? "all") === "all" || r.audience === audience);
  return match ? map(match) : null;
}
