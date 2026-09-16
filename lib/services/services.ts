"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { service, serviceTier } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type TierInput = { name: string; price?: number; deliveryDays?: number; scope?: string };
export type Tier = { id: string; name: string; price: number | null; deliveryDays: number | null; scope: string | null };
export type ServiceWithTiers = {
  id: string; title: string; category: string | null; description: string | null; active: boolean; tiers: Tier[];
};

const bump = () => { revalidatePath("/dashboard/services"); revalidatePath("/dashboard/find-professionals"); };

async function loadTiers(serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, Tier[]>();
  const rows = await db.select().from(serviceTier).where(inArray(serviceTier.serviceId, serviceIds)).orderBy(asc(serviceTier.sortOrder));
  const map = new Map<string, Tier[]>();
  for (const r of rows) {
    const arr = map.get(r.serviceId) ?? [];
    arr.push({ id: r.id, name: r.name, price: r.price, deliveryDays: r.deliveryDays, scope: r.scope });
    map.set(r.serviceId, arr);
  }
  return map;
}

async function withTiers(rows: { id: string; title: string; category: string | null; description: string | null; active: boolean | null }[]): Promise<ServiceWithTiers[]> {
  const tiers = await loadTiers(rows.map((r) => r.id));
  return rows.map((r) => ({ id: r.id, title: r.title, category: r.category, description: r.description, active: r.active ?? true, tiers: tiers.get(r.id) ?? [] }));
}

export async function getMyServices(): Promise<ServiceWithTiers[]> {
  try {
    const uid = await requireUserId();
    const rows = await db.select().from(service).where(eq(service.userId, uid)).orderBy(desc(service.createdAt));
    return withTiers(rows);
  } catch {
    return [];
  }
}

export async function getServicesForUser(userId: string): Promise<ServiceWithTiers[]> {
  const rows = await db.select().from(service).where(and(eq(service.userId, userId), eq(service.active, true))).orderBy(desc(service.createdAt));
  return withTiers(rows);
}

function cleanTiers(tiers: TierInput[]) {
  return tiers
    .filter((t) => t.price != null || t.deliveryDays != null || (t.scope && t.scope.trim()))
    .map((t, i) => ({ name: t.name, price: t.price ?? null, deliveryDays: t.deliveryDays ?? null, scope: t.scope?.trim() || null, sortOrder: i }));
}

export async function createService(input: { title: string; category?: string; description?: string; tiers: TierInput[] }) {
  const uid = await requireUserId();
  if (!input.title.trim()) throw new Error("Service title is required");
  const tiers = cleanTiers(input.tiers);
  if (tiers.length === 0) throw new Error("Add at least one priced tier");
  const [row] = await db.insert(service).values({ userId: uid, title: input.title.trim(), category: input.category || null, description: input.description || null }).returning({ id: service.id });
  await db.insert(serviceTier).values(tiers.map((t) => ({ ...t, serviceId: row.id })));
  bump();
  return row.id;
}

async function assertOwns(serviceId: string, uid: string) {
  const [s] = await db.select({ id: service.id }).from(service).where(and(eq(service.id, serviceId), eq(service.userId, uid))).limit(1);
  if (!s) throw new Error("Not found");
}

export async function updateService(serviceId: string, input: { title: string; category?: string; description?: string; tiers: TierInput[] }) {
  const uid = await requireUserId();
  await assertOwns(serviceId, uid);
  if (!input.title.trim()) throw new Error("Service title is required");
  const tiers = cleanTiers(input.tiers);
  if (tiers.length === 0) throw new Error("Add at least one priced tier");
  await db.update(service).set({ title: input.title.trim(), category: input.category || null, description: input.description || null }).where(eq(service.id, serviceId));
  await db.delete(serviceTier).where(eq(serviceTier.serviceId, serviceId));
  await db.insert(serviceTier).values(tiers.map((t) => ({ ...t, serviceId })));
  bump();
}

export async function toggleServiceActive(serviceId: string, active: boolean) {
  const uid = await requireUserId();
  await assertOwns(serviceId, uid);
  await db.update(service).set({ active }).where(eq(service.id, serviceId));
  bump();
}

export async function deleteService(serviceId: string) {
  const uid = await requireUserId();
  await assertOwns(serviceId, uid);
  await db.delete(service).where(eq(service.id, serviceId)); // cascades tiers
  bump();
}
