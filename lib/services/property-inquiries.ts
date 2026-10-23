"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { property, propertyEvent, propertyInquiry } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { getOrCreateDirectConversation, sendMessage } from "@/lib/services/messaging";
import { notify } from "@/lib/notify-internal";

export async function startPropertyInquiry(propertyId: string, body: string) {
  const uid = await requireUserId();
  const message = body.trim();
  if (message.length < 2) throw new Error("Write a short message to the lister");

  const [row] = await db
    .select({ id: property.id, ownerUserId: property.ownerUserId, title: property.title, slug: property.slug, status: property.status })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.status, "published")))
    .limit(1);
  if (!row) throw new Error("This property is not available");
  if (row.ownerUserId === uid) throw new Error("You can't inquire about your own listing");

  const conversationId = await getOrCreateDirectConversation(row.ownerUserId);
  await sendMessage(conversationId, message, { metadata: { propertyId, propertyTitle: row.title, propertySlug: row.slug } });

  const [existing] = await db
    .select({ id: propertyInquiry.id })
    .from(propertyInquiry)
    .where(and(eq(propertyInquiry.propertyId, propertyId), eq(propertyInquiry.buyerUserId, uid), eq(propertyInquiry.status, "open")))
    .limit(1);

  if (existing) {
    await db.update(propertyInquiry).set({ message, conversationId, updatedAt: new Date() }).where(eq(propertyInquiry.id, existing.id));
  } else {
    await db.insert(propertyInquiry).values({
      propertyId,
      buyerUserId: uid,
      listerUserId: row.ownerUserId,
      conversationId,
      message,
    });
  }

  await db.insert(propertyEvent).values({ propertyId, userId: uid, eventType: "inquiry", metadata: { conversationId } });
  await notify(row.ownerUserId, {
    type: "property_inquiry",
    title: `New inquiry for “${row.title}”`,
    body: message.slice(0, 140),
    href: `/dashboard/messages?to=${uid}`,
  }).catch(() => {});

  revalidatePath("/dashboard/properties/inquiries");
  revalidatePath("/dashboard/messages");
  return conversationId;
}

export type OwnerInquiry = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertySlug: string;
  buyerUserId: string;
  buyerName: string;
  message: string | null;
  status: string;
  conversationId: string | null;
  createdAt: string;
};

export async function getOwnerPropertyInquiries(): Promise<OwnerInquiry[]> {
  const uid = await requireUserId();
  const res = await db.execute(sql`
    SELECT pi.id, pi.property_id, p.title, p.slug, pi.buyer_user_id,
           u.name AS buyer_name, pi.message, pi.status, pi.conversation_id, pi.created_at
    FROM property_inquiry pi
    JOIN property p ON p.id = pi.property_id
    JOIN "user" u ON u.id = pi.buyer_user_id
    WHERE pi.lister_user_id = ${uid}
    ORDER BY pi.created_at DESC
    LIMIT 100
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    propertyId: String(r.property_id),
    propertyTitle: String(r.title),
    propertySlug: String(r.slug),
    buyerUserId: String(r.buyer_user_id),
    buyerName: String(r.buyer_name ?? "Member"),
    message: r.message ? String(r.message) : null,
    status: String(r.status),
    conversationId: r.conversation_id ? String(r.conversation_id) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
}

export async function closePropertyInquiry(id: string) {
  const uid = await requireUserId();
  await db.update(propertyInquiry).set({ status: "closed", updatedAt: new Date() })
    .where(and(eq(propertyInquiry.id, id), eq(propertyInquiry.listerUserId, uid)));
  revalidatePath("/dashboard/properties/inquiries");
}
