"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { tickerItem } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/authz";
import { getTickerSpeed } from "@/lib/services/platform-settings-read";

export type TickerItem = { id: string; content: string; href: string | null; active: boolean };

/** Public: active ticker items in order, plus the configured scroll speed.
 *  Both travel together so the strip needs one round trip, not two — it renders
 *  on every marketing page. */
export async function getActiveTicker(): Promise<{
  items: { content: string; href: string | null }[];
  seconds: number;
}> {
  const [rows, speed] = await Promise.all([
    db.select().from(tickerItem).where(eq(tickerItem.active, true)).orderBy(asc(tickerItem.sortOrder), asc(tickerItem.createdAt)),
    getTickerSpeed(),
  ]);
  return {
    items: rows.map((r) => ({ content: r.content, href: r.href })),
    seconds: speed.seconds,
  };
}

export async function listTicker(): Promise<TickerItem[]> {
  await requireAdmin();
  const rows = await db.select().from(tickerItem).orderBy(asc(tickerItem.sortOrder), asc(tickerItem.createdAt));
  return rows.map((r) => ({ id: r.id, content: r.content, href: r.href, active: !!r.active }));
}

export async function addTicker(content: string, href?: string) {
  await requireAdmin();
  if (!content.trim()) throw new Error("Text is required");
  await db.insert(tickerItem).values({ content: content.trim(), href: href?.trim() || null });
  revalidatePath("/admin/news-ticker"); revalidatePath("/");
}

export async function toggleTicker(id: string, active: boolean) {
  await requireAdmin();
  await db.update(tickerItem).set({ active }).where(eq(tickerItem.id, id));
  revalidatePath("/admin/news-ticker"); revalidatePath("/");
}

export async function updateTicker(id: string, content: string, href?: string) {
  await requireAdmin();
  if (!content.trim()) throw new Error("Text is required");
  await db.update(tickerItem).set({ content: content.trim(), href: href?.trim() || null }).where(eq(tickerItem.id, id));
  revalidatePath("/admin/news-ticker"); revalidatePath("/");
}

export async function deleteTicker(id: string) {
  await requireAdmin();
  await db.delete(tickerItem).where(eq(tickerItem.id, id));
  revalidatePath("/admin/news-ticker"); revalidatePath("/");
}

export async function moveTickerUp(id: string) {
  await requireAdmin();
  const rows = await db.select().from(tickerItem).orderBy(asc(tickerItem.sortOrder), asc(tickerItem.createdAt));
  const idx = rows.findIndex((r) => r.id === id);
  if (idx <= 0) return;
  const a = rows[idx - 1], b = rows[idx];
  await db.update(tickerItem).set({ sortOrder: b.sortOrder ?? idx }).where(eq(tickerItem.id, a.id));
  await db.update(tickerItem).set({ sortOrder: a.sortOrder ?? idx - 1 }).where(eq(tickerItem.id, b.id));
  revalidatePath("/admin/news-ticker"); revalidatePath("/");
}

export async function moveTickerDown(id: string) {
  await requireAdmin();
  const rows = await db.select().from(tickerItem).orderBy(asc(tickerItem.sortOrder), asc(tickerItem.createdAt));
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0 || idx >= rows.length - 1) return;
  const a = rows[idx], b = rows[idx + 1];
  await db.update(tickerItem).set({ sortOrder: b.sortOrder ?? idx + 1 }).where(eq(tickerItem.id, a.id));
  await db.update(tickerItem).set({ sortOrder: a.sortOrder ?? idx }).where(eq(tickerItem.id, b.id));
  revalidatePath("/admin/news-ticker"); revalidatePath("/");
}
