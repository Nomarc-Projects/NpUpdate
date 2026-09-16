"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { savedSearch } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type SearchKind = "people" | "companies";
export type SavedSearchRow = { id: string; name: string | null; query: Record<string, unknown>; createdAt: string };

/** Named saves + recent (unnamed) searches for a Directory table's "My searches" control. */
export async function getSavedSearches(kind: SearchKind): Promise<{ saved: SavedSearchRow[]; recent: SavedSearchRow[] }> {
  const uid = await requireUserId();
  const rows = await db.select().from(savedSearch).where(and(eq(savedSearch.userId, uid), eq(savedSearch.kind, kind))).orderBy(desc(savedSearch.createdAt)).limit(50);
  const map = (r: typeof rows[number]): SavedSearchRow => ({ id: r.id, name: r.name, query: r.query as Record<string, unknown>, createdAt: r.createdAt.toISOString() });
  return {
    saved: rows.filter((r) => r.name).map(map),
    recent: rows.filter((r) => !r.name).slice(0, 5).map(map),
  };
}

/** Records a search — `name` set = an explicit "Save this search"; omitted = a recent-searches entry. */
export async function recordSearch(kind: SearchKind, query: Record<string, unknown>, name?: string) {
  const uid = await requireUserId();
  await db.insert(savedSearch).values({ userId: uid, kind, name: name?.trim() || null, query });
  revalidatePath(kind === "people" ? "/dashboard/people" : "/dashboard/companies");
}

export async function deleteSavedSearch(id: string) {
  const uid = await requireUserId();
  await db.delete(savedSearch).where(and(eq(savedSearch.id, id), eq(savedSearch.userId, uid)));
}
