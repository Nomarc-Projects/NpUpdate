"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { quoteProposal, quoteRequest } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { notify } from "@/lib/notify-internal";

/**
 * Typed quote proposals — the priced offer an exhibitor sends against a
 * request, and the buyer's response to it.
 *
 * Replaces `respondToQuote`'s free-text reply, which wrote only `status` and
 * delivered the text as a notification body, leaving no record of the terms.
 *
 * Money is kobo end-to-end. The naira figure a user types is converted once, at
 * the edge, in `sendQuoteProposal`.
 */

export type ProposalStatus = "sent" | "withdrawn" | "accepted" | "declined" | "changes_requested";

export type Proposal = {
  id: string;
  quoteRequestId: string;
  quantityQuoted: string | null;
  /** Kobo. Divide by 100 to display. */
  totalPrice: number | null;
  currency: string;
  validUntil: string | null;
  note: string | null;
  attachments: string[];
  status: ProposalStatus;
  buyerNote: string | null;
  createdAt: string;
};

function mapRow(r: typeof quoteProposal.$inferSelect): Proposal {
  return {
    id: r.id,
    quoteRequestId: r.quoteRequestId,
    quantityQuoted: r.quantityQuoted,
    totalPrice: r.totalPrice ?? null,
    currency: r.currency,
    validUntil: r.validUntil,
    note: r.note,
    attachments: r.attachments ?? [],
    status: r.status as ProposalStatus,
    buyerNote: r.buyerNote,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Both sides of a request may read its proposals; nobody else may. */
async function assertParticipant(quoteRequestId: string): Promise<{ uid: string; buyerUserId: string; exhibitorUserId: string | null }> {
  const uid = await requireUserId();
  const [q] = await db
    .select({ buyerUserId: quoteRequest.buyerUserId, exhibitorUserId: quoteRequest.exhibitorUserId })
    .from(quoteRequest)
    .where(eq(quoteRequest.id, quoteRequestId))
    .limit(1);
  if (!q) throw new Error("That request no longer exists.");
  if (q.buyerUserId !== uid && q.exhibitorUserId !== uid) throw new Error("Not allowed");
  return { uid, buyerUserId: q.buyerUserId, exhibitorUserId: q.exhibitorUserId };
}

/** Newest first. The live offer is the first row that is not withdrawn. */
export async function getProposals(quoteRequestId: string): Promise<Proposal[]> {
  await assertParticipant(quoteRequestId);
  const rows = await db
    .select()
    .from(quoteProposal)
    .where(eq(quoteProposal.quoteRequestId, quoteRequestId))
    .orderBy(desc(quoteProposal.createdAt));
  return rows.map(mapRow);
}

export async function sendQuoteProposal(input: {
  quoteRequestId: string;
  quantityQuoted?: string;
  /** Naira, as typed. Converted to kobo here. */
  totalPriceNaira?: number;
  validUntil?: string;
  note?: string;
  attachments?: string[];
}): Promise<{ id: string }> {
  const { uid, buyerUserId, exhibitorUserId } = await assertParticipant(input.quoteRequestId);
  if (uid !== exhibitorUserId) throw new Error("Only the supplier can send a quote.");
  if (input.totalPriceNaira !== undefined && !(input.totalPriceNaira >= 0)) {
    throw new Error("Enter a valid total price.");
  }

  // Superseding an offer: the previous one stops being live rather than sitting
  // alongside the new one, so "the newest non-withdrawn row" stays unambiguous.
  await db
    .update(quoteProposal)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(and(eq(quoteProposal.quoteRequestId, input.quoteRequestId), eq(quoteProposal.status, "sent")));

  const [row] = await db
    .insert(quoteProposal)
    .values({
      quoteRequestId: input.quoteRequestId,
      exhibitorUserId: uid,
      quantityQuoted: input.quantityQuoted?.trim() || null,
      totalPrice: input.totalPriceNaira !== undefined ? Math.round(input.totalPriceNaira * 100) : null,
      validUntil: input.validUntil || null,
      note: input.note?.trim() || null,
      attachments: input.attachments?.length ? input.attachments : null,
      status: "sent",
    })
    .returning({ id: quoteProposal.id });

  await db.update(quoteRequest).set({ status: "quoted" }).where(eq(quoteRequest.id, input.quoteRequestId));
  await notify(buyerUserId, {
    type: "quote",
    title: "You've received a quote",
    body: "A supplier has sent priced terms for your request.",
    href: `/dashboard/quotes/${input.quoteRequestId}`,
  });
  revalidatePath("/dashboard/quotes");
  return { id: row.id };
}

/** Exhibitor pulls the live offer back off the table. */
export async function withdrawQuoteProposal(id: string): Promise<void> {
  const uid = await requireUserId();
  const [p] = await db.select().from(quoteProposal).where(eq(quoteProposal.id, id)).limit(1);
  if (!p) throw new Error("That quote no longer exists.");
  if (p.exhibitorUserId !== uid) throw new Error("Not allowed");
  if (p.status !== "sent") throw new Error("Only a live quote can be withdrawn.");
  await db.update(quoteProposal).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(quoteProposal.id, id));
  await db.update(quoteRequest).set({ status: "pending" }).where(eq(quoteRequest.id, p.quoteRequestId));
  revalidatePath("/dashboard/quotes");
}

/**
 * Buyer's verdict on the live offer.
 *
 * "changes_requested" deliberately puts the request back to `pending` rather
 * than declining it — the thread stays open and the exhibitor can re-quote,
 * which is the whole reason proposals are rows and not columns.
 */
export async function respondToProposal(
  id: string,
  verdict: "accepted" | "declined" | "changes_requested",
  buyerNote?: string,
): Promise<void> {
  const uid = await requireUserId();
  const [p] = await db.select().from(quoteProposal).where(eq(quoteProposal.id, id)).limit(1);
  if (!p) throw new Error("That quote no longer exists.");
  const { buyerUserId } = await assertParticipant(p.quoteRequestId);
  if (buyerUserId !== uid) throw new Error("Only the buyer can respond to a quote.");
  if (p.status !== "sent") throw new Error("That quote is no longer open.");
  if (verdict === "changes_requested" && !buyerNote?.trim()) {
    throw new Error("Say what you'd like changed so the supplier can revise it.");
  }

  await db
    .update(quoteProposal)
    .set({ status: verdict, buyerNote: buyerNote?.trim() || null, updatedAt: new Date() })
    .where(eq(quoteProposal.id, id));

  const requestStatus = verdict === "accepted" ? "accepted" : verdict === "declined" ? "declined" : "pending";
  await db.update(quoteRequest).set({ status: requestStatus }).where(eq(quoteRequest.id, p.quoteRequestId));

  const title =
    verdict === "accepted" ? "Your quote was accepted"
    : verdict === "declined" ? "Your quote was declined"
    : "Changes requested on your quote";
  await notify(p.exhibitorUserId, {
    type: "quote",
    title,
    body: buyerNote?.trim() || "Open the request to see the details.",
    href: `/dashboard/quotes/${p.quoteRequestId}`,
  });
  revalidatePath("/dashboard/quotes");
}

/** Clears a finished thread out of the inbox — drives the "Archived" chip. */
export async function setQuoteArchived(quoteRequestId: string, archived: boolean): Promise<void> {
  await assertParticipant(quoteRequestId);
  await db
    .update(quoteRequest)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(quoteRequest.id, quoteRequestId));
  revalidatePath("/dashboard/quotes");
}
