"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { property, propertyEvent, propertyFeePayment } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { requireAdmin } from "@/lib/authz";
import { activeProvider, getProvider, type ProviderName } from "@/lib/payments";
import { getProperties } from "@/lib/services/platform-settings-read";
import { computeListingFee } from "@/lib/properties/pricing";
import { notify } from "@/lib/notify-internal";
import { resolveSiteUrl } from "@/lib/site-url";

const APP_URL = resolveSiteUrl();

export type PropertyCheckoutResult = { demo?: boolean; checkoutUrl?: string; reference: string };

async function publishAfterPayment(propertyId: string, feePaymentId: string, reference: string) {
  const settings = await getProperties();
  const [row] = await db
    .select({ ownerUserId: property.ownerUserId, title: property.title, slug: property.slug })
    .from(property)
    .where(eq(property.id, propertyId))
    .limit(1);
  if (!row) return;

  const now = new Date();
  const expires = new Date(now.getTime() + settings.listingDurationDays * 24 * 60 * 60 * 1000);
  await db.update(property).set({
    status: "published",
    feeStatus: "paid",
    publishedAt: now,
    expiresAt: expires,
    updatedAt: now,
  }).where(eq(property.id, propertyId));

  await db.update(propertyFeePayment).set({ status: "success", paidAt: now }).where(eq(propertyFeePayment.id, feePaymentId));
  await db.insert(propertyEvent).values({
    propertyId,
    userId: row.ownerUserId,
    eventType: "publish",
    metadata: { reference, expiresAt: expires.toISOString() },
  });
  await notify(row.ownerUserId, {
    type: "property_published",
    title: `“${row.title}” is now live`,
    body: `Your listing is live on Nomarc Projects until ${expires.toLocaleDateString("en-NG")}.`,
    href: `/properties/${row.slug}`,
  }).catch(() => {});

  revalidatePath("/properties");
  revalidatePath(`/properties/${row.slug}`);
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/properties/listings");
  revalidatePath("/dashboard/properties/purchases");
  revalidatePath("/admin/properties");
}

export async function startPropertyFeeCheckout(
  propertyId: string,
  preferred?: ProviderName,
): Promise<PropertyCheckoutResult> {
  const uid = await requireUserId();
  const [row] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.ownerUserId, uid)))
    .limit(1);
  if (!row) throw new Error("Listing not found");
  if (row.status !== "approved_awaiting_payment") throw new Error("This listing is not awaiting payment");
  if (row.feeStatus === "paid") throw new Error("The listing fee is already paid");

  const settings = await getProperties();
  const fee = computeListingFee({
    valueMinor: row.priceMinor,
    currency: row.currency,
    flatFeeMinor: settings.flatListingFeeMinor,
    fxRates: { ...settings.fxRates, NGN: 1 },
  });
  const amountMinor = row.feeAmountMinor ?? fee.totalFeeMinor;
  if (amountMinor <= 0) throw new Error("The listing fee is not configured");
  const amountNaira = amountMinor / 100;

  const chosen = preferred ? getProvider(preferred) : null;
  const provider = chosen?.isConfigured() ? chosen : activeProvider();
  const reference = `nm_prop_${crypto.randomBytes(12).toString("hex")}`;

  if (!provider) {
    if (process.env.ALLOW_DEMO_PAYMENTS !== "true") {
      throw new Error("Payments are unavailable right now. Please try again shortly.");
    }
    const [feeRow] = await db.insert(propertyFeePayment).values({
      propertyId, userId: uid, amountMinor, currency: "NGN",
      flatFeeMinor: row.flatFeeMinor ?? fee.flatFeeMinor, rateBps: row.rateBps ?? fee.rateBps,
      valueNgnMinor: row.priceNgnMinor, provider: "demo", reference, status: "success", paidAt: new Date(),
    }).returning({ id: propertyFeePayment.id });
    await publishAfterPayment(propertyId, feeRow.id, reference);
    return { demo: true, reference };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? "";
  await db.insert(propertyFeePayment).values({
    propertyId, userId: uid, amountMinor, currency: "NGN",
    flatFeeMinor: row.flatFeeMinor ?? fee.flatFeeMinor, rateBps: row.rateBps ?? fee.rateBps,
    valueNgnMinor: row.priceNgnMinor, provider: provider.name, reference, status: "pending",
  });

  const callbackUrl = `${APP_URL}/dashboard/properties/purchases/verify?reference=${reference}`;
  const { checkoutUrl } = await provider.init({
    email,
    amountNaira,
    reference,
    callbackUrl,
    metadata: { uid, kind: "property_fee", propertyId },
  });
  return { checkoutUrl, reference };
}

async function settlePropertyFee(reference: string): Promise<"success" | "failed" | "pending"> {
  const lock = await db.execute(sql`
    SELECT id, property_id, user_id, amount_minor, provider, status
    FROM property_fee_payment
    WHERE reference = ${reference}
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `);
  const fee = (lock.rows as Record<string, unknown>[])[0];
  if (!fee) return "pending";
  if (fee.status === "success") return "success";

  const provider = getProvider(fee.provider as ProviderName);
  if (!provider || !provider.isConfigured()) return "pending";
  const result = await provider.verify(reference);

  if (result.status === "success") {
    if (result.amountNaira < Number(fee.amount_minor) / 100) {
      await db.update(propertyFeePayment).set({ status: "failed" })
        .where(and(eq(propertyFeePayment.id, String(fee.id)), eq(propertyFeePayment.status, "pending")));
      throw new Error(`Amount mismatch: expected ${Number(fee.amount_minor) / 100}, got ${result.amountNaira}`);
    }
    const updated = await db.update(propertyFeePayment)
      .set({ status: "success", paidAt: new Date() })
      .where(and(eq(propertyFeePayment.id, String(fee.id)), eq(propertyFeePayment.status, "pending")))
      .returning({ id: propertyFeePayment.id });
    if (updated.length > 0) {
      await publishAfterPayment(String(fee.property_id), String(fee.id), reference);
    }
    return "success";
  }

  if (result.status === "failed") {
    await db.update(propertyFeePayment).set({ status: "failed" })
      .where(and(eq(propertyFeePayment.id, String(fee.id)), eq(propertyFeePayment.status, "pending")));
    return "failed";
  }
  return "pending";
}

export async function verifyPropertyFee(reference: string): Promise<"success" | "failed" | "pending"> {
  const uid = await requireUserId();
  const [row] = await db.select({ userId: propertyFeePayment.userId }).from(propertyFeePayment).where(eq(propertyFeePayment.reference, reference)).limit(1);
  if (!row || row.userId !== uid) throw new Error("Payment not found");
  return settlePropertyFee(reference);
}

export async function settlePropertyFeeByWebhook(reference: string) {
  return settlePropertyFee(reference);
}

export async function retryPropertyFeeAsAdmin(reference: string) {
  await requireAdmin();
  return settlePropertyFee(reference);
}

export async function getMyPropertyFeePayments() {
  const uid = await requireUserId();
  const rows = await db
    .select({
      id: propertyFeePayment.id,
      propertyId: propertyFeePayment.propertyId,
      propertyTitle: property.title,
      propertySlug: property.slug,
      amountMinor: propertyFeePayment.amountMinor,
      provider: propertyFeePayment.provider,
      reference: propertyFeePayment.reference,
      status: propertyFeePayment.status,
      createdAt: propertyFeePayment.createdAt,
      paidAt: propertyFeePayment.paidAt,
    })
    .from(propertyFeePayment)
    .leftJoin(property, eq(property.id, propertyFeePayment.propertyId))
    .where(eq(propertyFeePayment.userId, uid))
    .orderBy(desc(propertyFeePayment.createdAt))
    .limit(100);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), paidAt: r.paidAt?.toISOString() ?? null }));
}


export async function getAdminPropertyFeePayments(status?: string) {
  await requireAdmin();
  const rows = await db
    .select({
      id: propertyFeePayment.id,
      propertyId: propertyFeePayment.propertyId,
      propertyTitle: property.title,
      propertySlug: property.slug,
      userId: propertyFeePayment.userId,
      amountMinor: propertyFeePayment.amountMinor,
      provider: propertyFeePayment.provider,
      reference: propertyFeePayment.reference,
      status: propertyFeePayment.status,
      createdAt: propertyFeePayment.createdAt,
      paidAt: propertyFeePayment.paidAt,
    })
    .from(propertyFeePayment)
    .leftJoin(property, eq(property.id, propertyFeePayment.propertyId))
    .where(status && status !== "all" ? eq(propertyFeePayment.status, status) : undefined)
    .orderBy(desc(propertyFeePayment.createdAt))
    .limit(200);

  const uids = [...new Set(rows.map((r) => r.userId))];
  const names = new Map<string, string>();
  if (uids.length) {
    const users = (await db.execute(sql`
      SELECT id, COALESCE(name, email, id) AS name FROM "user"
      WHERE id IN (${sql.join(uids.map((id) => sql`${id}`), sql`, `)})
    `)).rows as { id: string; name: string | null }[];
    for (const u of users) names.set(u.id, u.name || "Nomarc user");
  }

  return rows.map((r) => ({
    ...r,
    ownerName: names.get(r.userId) ?? null,
    createdAt: r.createdAt.toISOString(),
    paidAt: r.paidAt?.toISOString() ?? null,
  }));
}

export async function getAdminPropertyFeeStats() {
  await requireAdmin();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      success: sql<number>`count(*) filter (where status = 'success')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      collectedMinor: sql<number>`coalesce(sum(amount_minor) filter (where status = 'success'), 0)::bigint`,
    })
    .from(propertyFeePayment);
  return {
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    success: Number(row?.success ?? 0),
    failed: Number(row?.failed ?? 0),
    collectedMinor: Number(row?.collectedMinor ?? 0),
  };
}
