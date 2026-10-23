"use server";

import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { property, propertyDocument, propertyListerProfile, propertyMedia } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/authz";
import { notify } from "@/lib/notify-internal";

export type AdminPropertyRow = {
  id: string;
  title: string;
  slug: string;
  ownerUserId: string;
  kind: string;
  category: string;
  city: string | null;
  state: string | null;
  priceMinor: number;
  currency: string;
  status: string;
  feeAmountMinor: number | null;
  documentStatus: string;
  createdAt: string;
};

export async function getAdminProperties(status?: string): Promise<AdminPropertyRow[]> {
  await requireAdmin();
  const where = status && status !== "all" ? eq(property.status, status) : undefined;
  const rows = await db
    .select({
      id: property.id, title: property.title, slug: property.slug, ownerUserId: property.ownerUserId,
      kind: property.kind, category: property.category, city: property.city, state: property.state,
      priceMinor: property.priceMinor, currency: property.currency, status: property.status,
      feeAmountMinor: property.feeAmountMinor, documentStatus: property.documentStatus,
      createdAt: property.createdAt,
    })
    .from(property)
    .where(where)
    .orderBy(desc(property.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getAdminPropertyStats() {
  await requireAdmin();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending_approval')::int`,
      changes: sql<number>`count(*) filter (where status = 'changes_requested')::int`,
      approved: sql<number>`count(*) filter (where status = 'approved_awaiting_payment')::int`,
      live: sql<number>`count(*) filter (where status = 'published')::int`,
    })
    .from(property);
  return row ?? { total: 0, pending: 0, changes: 0, approved: 0, live: 0 };
}

export async function getAdminProperty(id: string) {
  await requireAdmin();
  const [row] = await db.select().from(property).where(eq(property.id, id)).limit(1);
  if (!row) return null;
  const [media, docs, lister] = await Promise.all([
    db.select().from(propertyMedia).where(eq(propertyMedia.propertyId, id)).orderBy(propertyMedia.sortOrder),
    db.select().from(propertyDocument).where(eq(propertyDocument.propertyId, id)),
    row.listerProfileId
      ? db.select().from(propertyListerProfile).where(eq(propertyListerProfile.id, row.listerProfileId)).limit(1)
      : Promise.resolve([]),
  ]);
  return { ...row, createdAt: row.createdAt.toISOString(), media, docs, lister: lister[0] ?? null };
}

export type ReviewDecision = "approve" | "reject" | "request_changes";

export async function reviewProperty(id: string, decision: ReviewDecision, note?: string) {
  const admin = await requireAdmin();
  const [row] = await db.select({ ownerUserId: property.ownerUserId, title: property.title, status: property.status }).from(property).where(eq(property.id, id)).limit(1);
  if (!row) throw new Error("Listing not found");
  if (!["pending_approval", "changes_requested"].includes(row.status)) throw new Error("This listing is not in the review queue");

  const cleanNote = note?.trim() || null;
  if ((decision === "reject" || decision === "request_changes") && !cleanNote) {
    throw new Error("Add a note explaining what needs to change");
  }

  const next =
    decision === "approve"
      ? { status: "approved_awaiting_payment", approvedBy: admin, approvedAt: new Date(), rejectionReason: null }
      : decision === "reject"
        ? { status: "rejected", rejectionReason: cleanNote }
        : { status: "changes_requested", rejectionReason: cleanNote };

  await db.update(property).set({ ...next, updatedAt: new Date() }).where(eq(property.id, id));

  await notify(row.ownerUserId, {
    type: "property_review",
    title: decision === "approve" ? `“${row.title}” was approved` : decision === "reject" ? `“${row.title}” was rejected` : `Changes requested for “${row.title}”`,
    body: decision === "approve" ? "Pay the listing fee to publish it on Nomarc Projects." : cleanNote || undefined,
    href: `/dashboard/properties/listings`,
  }).catch(() => {});

  revalidatePath("/admin/properties");
  revalidatePath("/dashboard/properties/listings");
  revalidatePath("/properties");
  return next.status;
}

export async function reviewPropertyDocument(id: string, decision: "approve" | "reject", note?: string) {
  const admin = await requireAdmin();
  const [doc] = await db.select().from(propertyDocument).where(eq(propertyDocument.id, id)).limit(1);
  if (!doc) throw new Error("Document not found");
  await db.update(propertyDocument).set({
    status: decision === "approve" ? "approved" : "rejected",
    reviewedBy: admin,
    reviewedAt: new Date(),
    note: note?.trim() || null,
  }).where(eq(propertyDocument.id, id));

  const docs = await db.select({ status: propertyDocument.status }).from(propertyDocument).where(eq(propertyDocument.propertyId, doc.propertyId));
  const allApproved = docs.length > 0 && docs.every((d) => d.status === "approved");
  await db.update(property).set({ documentStatus: allApproved ? "verified" : "pending", updatedAt: new Date() }).where(eq(property.id, doc.propertyId));
  revalidatePath(`/admin/properties/${doc.propertyId}`);
  return decision;
}

export async function getPropertyDocumentById(id: string) {
  await requireAdmin();
  const [doc] = await db.select().from(propertyDocument).where(eq(propertyDocument.id, id)).limit(1);
  return doc ?? null;
}
