"use server";

import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { buyerAddress } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  isDefault: boolean;
};

function mapRow(r: Record<string, unknown>): SavedAddress {
  return {
    id: String(r.id),
    label: String(r.label ?? ""),
    address: String(r.address ?? ""),
    city: String(r.city ?? ""),
    state: String(r.state ?? ""),
    country: String(r.country ?? "Nigeria"),
    phone: String(r.phone ?? ""),
    isDefault: r.is_default === true || r.isDefault === true,
  };
}

export async function getMyAddresses(): Promise<SavedAddress[]> {
  // requireUserId() belongs inside the try — sitting above it, it read as
  // guarded while its throw sailed straight past the catch to the page.
  try {
    const uid = await requireUserId();
    const rows = await db
      .select()
      .from(buyerAddress)
      .where(eq(buyerAddress.userId, uid))
      .orderBy(desc(buyerAddress.isDefault), desc(buyerAddress.createdAt));
    return rows.map((r) => mapRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function saveAddress(data: {
  id?: string;
  label: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  phone: string;
  isDefault?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const uid = await requireUserId();
  try {
    const existing = await db
      .select({ id: buyerAddress.id })
      .from(buyerAddress)
      .where(eq(buyerAddress.userId, uid));
    if (!data.id && existing.length >= 5) {
      return { ok: false, error: "You can save up to 5 addresses." };
    }
    if (data.isDefault) {
      await db
        .update(buyerAddress)
        .set({ isDefault: false })
        .where(eq(buyerAddress.userId, uid));
    }
    if (data.id) {
      await db
        .update(buyerAddress)
        .set({
          label: data.label,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country || "Nigeria",
          phone: data.phone,
          isDefault: data.isDefault ?? false,
        })
        .where(and(eq(buyerAddress.id, data.id), eq(buyerAddress.userId, uid)));
    } else {
      const isFirst = existing.length === 0;
      await db.insert(buyerAddress).values({
        userId: uid,
        label: data.label,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country || "Nigeria",
        phone: data.phone,
        isDefault: data.isDefault ?? isFirst,
      });
    }
    revalidatePath("/dashboard/addresses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save address" };
  }
}

export async function deleteAddress(addressId: string): Promise<{ ok: boolean }> {
  const uid = await requireUserId();
  try {
    const [row] = await db
      .select()
      .from(buyerAddress)
      .where(and(eq(buyerAddress.id, addressId), eq(buyerAddress.userId, uid)));
    await db
      .delete(buyerAddress)
      .where(and(eq(buyerAddress.id, addressId), eq(buyerAddress.userId, uid)));
    if (row?.isDefault) {
      const remaining = await db
        .select({ id: buyerAddress.id })
        .from(buyerAddress)
        .where(eq(buyerAddress.userId, uid))
        .orderBy(desc(buyerAddress.createdAt))
        .limit(1);
      if (remaining[0]) {
        await db
          .update(buyerAddress)
          .set({ isDefault: true })
          .where(eq(buyerAddress.id, remaining[0].id));
      }
    }
    revalidatePath("/dashboard/addresses");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function setDefaultAddress(addressId: string): Promise<{ ok: boolean }> {
  const uid = await requireUserId();
  try {
    await db.update(buyerAddress).set({ isDefault: false }).where(eq(buyerAddress.userId, uid));
    await db
      .update(buyerAddress)
      .set({ isDefault: true })
      .where(and(eq(buyerAddress.id, addressId), eq(buyerAddress.userId, uid)));
    revalidatePath("/dashboard/addresses");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
