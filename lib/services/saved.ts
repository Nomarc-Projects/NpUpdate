"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { savedItem } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type SavedType = "job" | "product" | "professional";

/** IDs the current user has saved for a given type. */
export async function getSavedIds(itemType: SavedType): Promise<string[]> {
  const uid = await requireUserId();
  const rows = await db
    .select({ itemId: savedItem.itemId })
    .from(savedItem)
    .where(and(eq(savedItem.userId, uid), eq(savedItem.itemType, itemType)));
  return rows.map((r) => r.itemId);
}

/** Toggle a bookmark. Returns the new saved state (true = now saved). */
export async function toggleSaved(itemType: SavedType, itemId: string): Promise<boolean> {
  const uid = await requireUserId();
  const existing = await db
    .select({ id: savedItem.id })
    .from(savedItem)
    .where(and(eq(savedItem.userId, uid), eq(savedItem.itemType, itemType), eq(savedItem.itemId, itemId)))
    .limit(1);
  let saved: boolean;
  if (existing.length) {
    await db.delete(savedItem).where(eq(savedItem.id, existing[0].id));
    saved = false;
  } else {
    await db.insert(savedItem).values({ userId: uid, itemType, itemId });
    saved = true;
  }
  for (const p of ["/dashboard/products", "/dashboard/products/saved", "/dashboard/jobs", "/dashboard/jobs/saved"]) revalidatePath(p);
  return saved;
}
