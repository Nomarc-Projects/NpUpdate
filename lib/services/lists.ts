"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { list, listItem } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type ListWithCount = {
  id: string; name: string; description: string | null; count: number;
  peopleCount: number; companyCount: number; createdAt: string; updatedAt: string;
};

/** All of the current user's lists, with item counts (image 64's Name/Count/Date Created/Last Modified table). */
export async function getMyLists(): Promise<ListWithCount[]> {
  const uid = await requireUserId();
  const rows = await db
    .select({
      id: list.id,
      name: list.name,
      description: list.description,
      count: sql<number>`count(${listItem.id})::int`,
      peopleCount: sql<number>`count(${listItem.id}) filter (where ${listItem.itemType} = 'professional')::int`,
      companyCount: sql<number>`count(${listItem.id}) filter (where ${listItem.itemType} = 'company')::int`,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    })
    .from(list)
    .leftJoin(listItem, eq(listItem.listId, list.id))
    .where(eq(list.userId, uid))
    .groupBy(list.id)
    .orderBy(desc(list.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
}

export async function createList(name: string, description?: string): Promise<string> {
  const uid = await requireUserId();
  const clean = name.trim();
  if (!clean) throw new Error("Name is required");
  const [row] = await db.insert(list).values({ userId: uid, name: clean, description: description?.trim() || null }).returning({ id: list.id });
  revalidatePath("/dashboard/lists");
  return row.id;
}

export async function deleteList(id: string) {
  const uid = await requireUserId();
  await db.delete(list).where(and(eq(list.id, id), eq(list.userId, uid)));
  revalidatePath("/dashboard/lists");
}

export async function renameList(id: string, name: string, description?: string) {
  const uid = await requireUserId();
  const clean = name.trim();
  if (!clean) throw new Error("Name is required");
  await db.update(list).set({ name: clean, description: description?.trim() || null }).where(and(eq(list.id, id), eq(list.userId, uid)));
  revalidatePath("/dashboard/lists");
}

async function assertOwns(listId: string, uid: string) {
  const [row] = await db.select({ id: list.id }).from(list).where(and(eq(list.id, listId), eq(list.userId, uid))).limit(1);
  if (!row) throw new Error("List not found");
}

export type ListItemType = "professional" | "company";

async function touchList(listId: string) {
  await db.update(list).set({ updatedAt: new Date() }).where(eq(list.id, listId));
}

/** Add an item to a list (idempotent). */
export async function addToList(listId: string, itemType: ListItemType, itemId: string) {
  const uid = await requireUserId();
  await assertOwns(listId, uid);
  const [existing] = await db.select({ id: listItem.id }).from(listItem)
    .where(and(eq(listItem.listId, listId), eq(listItem.itemType, itemType), eq(listItem.itemId, itemId))).limit(1);
  if (!existing) { await db.insert(listItem).values({ listId, itemType, itemId }); await touchList(listId); }
  revalidatePath("/dashboard/lists");
}

export async function removeFromList(listId: string, itemType: ListItemType, itemId: string) {
  const uid = await requireUserId();
  await assertOwns(listId, uid);
  await db.delete(listItem).where(and(eq(listItem.listId, listId), eq(listItem.itemType, itemType), eq(listItem.itemId, itemId)));
  await touchList(listId);
  revalidatePath("/dashboard/lists");
}

/** Copies a list (name + description + members) into a new list — Actions > "Duplicate list" (image 65). */
export async function duplicateList(listId: string): Promise<string> {
  const uid = await requireUserId();
  await assertOwns(listId, uid);
  const [src] = await db.select().from(list).where(eq(list.id, listId)).limit(1);
  if (!src) throw new Error("List not found");
  const [row] = await db.insert(list).values({ userId: uid, name: `${src.name} (copy)`, description: src.description }).returning({ id: list.id });
  const items = await db.select({ itemType: listItem.itemType, itemId: listItem.itemId }).from(listItem).where(eq(listItem.listId, listId));
  if (items.length) await db.insert(listItem).values(items.map((i) => ({ listId: row.id, itemType: i.itemType, itemId: i.itemId })));
  revalidatePath("/dashboard/lists");
  return row.id;
}

export type ListMember = { itemType: ListItemType; id: string; name: string; avatarUrl: string; subtitle: string; email: string; phone: string };

/**
 * A list's members enriched with directory data (image 66) — joins each
 * `listItem` back to `profile`/`company` + the Better Auth `user` for
 * name/avatar/email, since list_item only stores a bare (type, id) pointer.
 */
export async function getListMembers(listId: string): Promise<{ list: ListWithCount; members: ListMember[] } | null> {
  const uid = await requireUserId();
  const [row] = await db
    .select({
      id: list.id, name: list.name, description: list.description,
      count: sql<number>`count(${listItem.id})::int`,
      peopleCount: sql<number>`count(${listItem.id}) filter (where ${listItem.itemType} = 'professional')::int`,
      companyCount: sql<number>`count(${listItem.id}) filter (where ${listItem.itemType} = 'company')::int`,
      createdAt: list.createdAt, updatedAt: list.updatedAt,
    })
    .from(list)
    .leftJoin(listItem, eq(listItem.listId, list.id))
    .where(and(eq(list.id, listId), eq(list.userId, uid)))
    .groupBy(list.id)
    .limit(1);
  if (!row) return null;

  const items = await db.select({ itemType: listItem.itemType, itemId: listItem.itemId }).from(listItem).where(eq(listItem.listId, listId));
  const peopleIds = items.filter((i) => i.itemType === "professional").map((i) => i.itemId);
  const companyIds = items.filter((i) => i.itemType === "company").map((i) => i.itemId);

  const members: ListMember[] = [];
  if (peopleIds.length) {
    const res = await db.execute(sql`
      SELECT u.id, u.name, u.email, COALESCE(p.avatar_url, u.image) AS avatar_url, COALESCE(p.headline,'') AS headline, COALESCE(p.phone,'') AS phone
      FROM profile p JOIN "user" u ON u.id = p.user_id WHERE p.user_id IN (${sql.join(peopleIds.map((id) => sql`${id}`), sql`, `)})
    `);
    for (const r of res.rows as Record<string, unknown>[]) {
      members.push({ itemType: "professional", id: String(r.id), name: String(r.name ?? "Member"), avatarUrl: String(r.avatar_url ?? ""), subtitle: String(r.headline ?? ""), email: String(r.email ?? ""), phone: String(r.phone ?? "") });
    }
  }
  if (companyIds.length) {
    const res = await db.execute(sql`
      SELECT c.id, c.name, c.avatar_url, c.industry, c.phone, u.email
      FROM company c JOIN "user" u ON u.id = c.owner_user_id WHERE c.id IN (${sql.join(companyIds.map((id) => sql`${id}`), sql`, `)})
    `);
    for (const r of res.rows as Record<string, unknown>[]) {
      members.push({ itemType: "company", id: String(r.id), name: String(r.name ?? "Company"), avatarUrl: String(r.avatar_url ?? ""), subtitle: String(r.industry ?? ""), email: String(r.email ?? ""), phone: String(r.phone ?? "") });
    }
  }

  return {
    list: { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() },
    members,
  };
}

/** The user's lists, each flagged with whether it already contains the given item. */
export async function getListsWithMembership(itemType: ListItemType, itemId: string): Promise<(ListWithCount & { hasItem: boolean })[]> {
  const lists = await getMyLists(); // calls requireUserId
  if (!lists.length) return [];
  const members = await db.select({ listId: listItem.listId }).from(listItem)
    .where(and(eq(listItem.itemType, itemType), eq(listItem.itemId, itemId)));
  const set = new Set(members.map((m) => m.listId));
  return lists.map((l) => ({ ...l, hasItem: set.has(l.id) }));
}
