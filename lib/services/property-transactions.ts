"use server";

import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { property, propertyCertificate, propertyTransaction } from "@/lib/db/schema";
import { isAdmin, requireAdmin } from "@/lib/authz";
import { requireUserId } from "@/lib/server-user";
import { notify } from "@/lib/notify-internal";
import { getProperties } from "@/lib/services/platform-settings-read";

export type MyPropertyTransaction = {
  id: string;
  propertyId: string | null;
  propertyTitle: string | null;
  propertySlug: string | null;
  role: "buyer" | "seller";
  counterpartyName: string | null;
  kind: string;
  amountMinor: number;
  currency: string;
  status: string;
  certificateId: string | null;
  certificateNo: string | null;
  createdAt: string;
  completedAt: string | null;
};

async function displayNames(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, string>();
  const rows = (await db.execute(sql`
    SELECT id, COALESCE(name, email, id) AS name FROM "user"
    WHERE id IN (${sql.join(unique.map((id) => sql`${id}`), sql`, `)})
  `)).rows as { id: string; name: string | null }[];
  return new Map(rows.map((r) => [r.id, r.name || "Nomarc user"]));
}

export async function startPropertyTransaction(propertyId: string) {
  const uid = await requireUserId();
  const settings = await getProperties();
  if (!settings.enabled) throw new Error("Nomarc Projects is not available right now");
  const [row] = await db.select().from(property).where(eq(property.id, propertyId)).limit(1);
  if (!row || row.status !== "published") throw new Error("This property is not available");
  if (row.ownerUserId === uid) throw new Error("You cannot start a transaction on your own listing");
  if (!["sale", "bulk_land"].includes(row.kind)) throw new Error("This listing is not available for purchase");

  const [existing] = await db
    .select({ id: propertyTransaction.id })
    .from(propertyTransaction)
    .where(and(
      eq(propertyTransaction.propertyId, row.id),
      eq(propertyTransaction.buyerUserId, uid),
      inArray(propertyTransaction.status, ["pending", "paid", "completed"]),
    ))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db.insert(propertyTransaction).values({
    propertyId: row.id,
    buyerUserId: uid,
    sellerUserId: row.ownerUserId,
    kind: "purchase",
    amountMinor: row.priceMinor,
    currency: row.currency,
    status: "pending",
  }).returning({ id: propertyTransaction.id });

  await notify(row.ownerUserId, {
    type: "property_purchase_request",
    title: "New purchase request",
    body: `A buyer wants to purchase “${row.title}”.`,
    href: "/dashboard/properties/transactions",
  }).catch(() => {});
  await notify(uid, {
    type: "property_purchase_started",
    title: "Purchase request started",
    body: `Your request for “${row.title}” was recorded. The lister has been notified.`,
    href: "/dashboard/properties/transactions",
  }).catch(() => {});

  revalidatePath("/dashboard/properties/transactions");
  revalidatePath("/admin/properties/transactions");
  return created.id;
}

export async function cancelMyPropertyTransaction(id: string) {
  const uid = await requireUserId();
  const [row] = await db.select().from(propertyTransaction).where(and(
    eq(propertyTransaction.id, id),
    eq(propertyTransaction.buyerUserId, uid),
  )).limit(1);
  if (!row) throw new Error("Transaction not found");
  if (!["pending", "paid"].includes(row.status)) throw new Error("This transaction can no longer be cancelled");
  await db.update(propertyTransaction).set({ status: "cancelled", updatedAt: new Date() }).where(eq(propertyTransaction.id, id));
  revalidatePath("/dashboard/properties/transactions");
  revalidatePath("/admin/properties/transactions");
}

export async function getMyPropertyTransactions(): Promise<MyPropertyTransaction[]> {
  const uid = await requireUserId();
  const rows = await db
    .select({
      id: propertyTransaction.id,
      propertyId: propertyTransaction.propertyId,
      buyerUserId: propertyTransaction.buyerUserId,
      sellerUserId: propertyTransaction.sellerUserId,
      kind: propertyTransaction.kind,
      amountMinor: propertyTransaction.amountMinor,
      currency: propertyTransaction.currency,
      status: propertyTransaction.status,
      completedAt: propertyTransaction.completedAt,
      createdAt: propertyTransaction.createdAt,
      propertyTitle: property.title,
      propertySlug: property.slug,
      certificateId: propertyCertificate.id,
      certificateNo: propertyCertificate.certificateNo,
    })
    .from(propertyTransaction)
    .leftJoin(property, eq(property.id, propertyTransaction.propertyId))
    .leftJoin(propertyCertificate, eq(propertyCertificate.transactionId, propertyTransaction.id))
    .where(or(eq(propertyTransaction.buyerUserId, uid), eq(propertyTransaction.sellerUserId, uid)))
    .orderBy(desc(propertyTransaction.createdAt))
    .limit(200);

  const names = await displayNames(rows.flatMap((r) => [r.buyerUserId, r.sellerUserId]));
  return rows.map((r) => {
    const role = r.buyerUserId === uid ? "buyer" as const : "seller" as const;
    const otherId = role === "buyer" ? r.sellerUserId : r.buyerUserId;
    return {
      id: r.id,
      propertyId: r.propertyId,
      propertyTitle: r.propertyTitle,
      propertySlug: r.propertySlug,
      role,
      counterpartyName: names.get(otherId) ?? null,
      kind: r.kind,
      amountMinor: r.amountMinor,
      currency: r.currency,
      status: r.status,
      certificateId: r.certificateId,
      certificateNo: r.certificateNo,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    };
  });
}

export async function getMyCertificate(transactionId: string) {
  const uid = await requireUserId();
  const [row] = await db
    .select({
      transaction: propertyTransaction,
      certificate: propertyCertificate,
      property: property,
    })
    .from(propertyTransaction)
    .innerJoin(propertyCertificate, eq(propertyCertificate.transactionId, propertyTransaction.id))
    .leftJoin(property, eq(property.id, propertyTransaction.propertyId))
    .where(eq(propertyTransaction.id, transactionId))
    .limit(1);
  if (!row) return null;
  const admin = await isAdmin().catch(() => false);
  if (row.transaction.buyerUserId !== uid && !admin) return null;
  const names = await displayNames([row.transaction.buyerUserId, row.transaction.sellerUserId]);
  return {
    certificateNo: row.certificate.certificateNo,
    issuedAt: row.certificate.issuedAt?.toISOString() ?? row.transaction.completedAt?.toISOString() ?? null,
    propertyTitle: row.property?.title ?? "Property",
    propertyLocation: [row.property?.address, row.property?.city, row.property?.state].filter(Boolean).join(", "),
    buyerName: names.get(row.transaction.buyerUserId) ?? "Buyer",
    sellerName: names.get(row.transaction.sellerUserId) ?? "Seller",
    amountMinor: row.transaction.amountMinor,
    currency: row.transaction.currency,
  };
}

export type AdminPropertyTransaction = {
  id: string;
  propertyId: string | null;
  propertyTitle: string | null;
  buyerUserId: string;
  sellerUserId: string;
  buyerName: string | null;
  sellerName: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  certificateNo: string | null;
  createdAt: string;
};

export async function getAdminPropertyTransactions(status?: string): Promise<AdminPropertyTransaction[]> {
  await requireAdmin();
  const where = status && status !== "all" ? eq(propertyTransaction.status, status) : undefined;
  const rows = await db
    .select({
      id: propertyTransaction.id,
      propertyId: propertyTransaction.propertyId,
      propertyTitle: property.title,
      buyerUserId: propertyTransaction.buyerUserId,
      sellerUserId: propertyTransaction.sellerUserId,
      amountMinor: propertyTransaction.amountMinor,
      currency: propertyTransaction.currency,
      status: propertyTransaction.status,
      certificateNo: propertyCertificate.certificateNo,
      createdAt: propertyTransaction.createdAt,
    })
    .from(propertyTransaction)
    .leftJoin(property, eq(property.id, propertyTransaction.propertyId))
    .leftJoin(propertyCertificate, eq(propertyCertificate.transactionId, propertyTransaction.id))
    .where(where)
    .orderBy(desc(propertyTransaction.createdAt))
    .limit(200);
  const names = await displayNames(rows.flatMap((r) => [r.buyerUserId, r.sellerUserId]));
  return rows.map((r) => ({
    ...r,
    buyerName: names.get(r.buyerUserId) ?? null,
    sellerName: names.get(r.sellerUserId) ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getAdminTransactionStats() {
  await requireAdmin();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
    })
    .from(propertyTransaction);
  return row ?? { total: 0, pending: 0, completed: 0, cancelled: 0 };
}

export async function completePropertyTransaction(id: string) {
  const admin = await requireAdmin();
  const [row] = await db.select().from(propertyTransaction).where(eq(propertyTransaction.id, id)).limit(1);
  if (!row) throw new Error("Transaction not found");
  if (row.status === "completed" && row.paymentReference) return row.paymentReference;
  if (!["pending", "paid"].includes(row.status)) throw new Error("This transaction cannot be completed");

  const certificateNo = `NMP-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  await db.transaction(async (tx) => {
    await tx.update(propertyTransaction).set({
      status: "completed",
      paymentReference: certificateNo,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(propertyTransaction.id, id));
    await tx.insert(propertyCertificate).values({
      transactionId: id,
      propertyId: row.propertyId,
      buyerUserId: row.buyerUserId,
      certificateNo,
      issuedAt: new Date(),
    });
    if (row.propertyId) {
      await tx.update(property).set({ status: "sold", updatedAt: new Date() }).where(eq(property.id, row.propertyId));
      await tx.update(propertyTransaction)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(
          eq(propertyTransaction.propertyId, row.propertyId),
          inArray(propertyTransaction.status, ["pending", "paid"]),
          sql`${propertyTransaction.id} <> ${id}`,
        ));
    }
  });

  await notify(row.buyerUserId, {
    type: "property_purchase_completed",
    title: "Purchase completed — certificate ready",
    body: `Your certificate ${certificateNo} is available in your dashboard.`,
    href: "/dashboard/properties/transactions",
  }).catch(() => {});
  await notify(row.sellerUserId, {
    type: "property_sale_completed",
    title: "Property marked sold",
    body: `Transaction ${certificateNo} was completed and the listing is now marked sold.`,
    href: "/dashboard/properties/transactions",
  }).catch(() => {});

  revalidatePath("/admin/properties/transactions");
  revalidatePath("/dashboard/properties/transactions");
  revalidatePath("/properties");
  return certificateNo;
}

export async function cancelAdminPropertyTransaction(id: string) {
  await requireAdmin();
  await db.update(propertyTransaction).set({ status: "cancelled", updatedAt: new Date() }).where(eq(propertyTransaction.id, id));
  revalidatePath("/admin/properties/transactions");
  revalidatePath("/dashboard/properties/transactions");
}

export async function hasPropertyTransaction(propertyId: string) {
  const uid = await requireUserId();
  const [row] = await db.select({ id: propertyTransaction.id }).from(propertyTransaction).where(and(
    eq(propertyTransaction.propertyId, propertyId),
    eq(propertyTransaction.buyerUserId, uid),
    inArray(propertyTransaction.status, ["pending", "paid", "completed"]),
  )).limit(1);
  return row?.id ?? null;
}

