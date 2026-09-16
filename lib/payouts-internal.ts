import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ledgerEntry } from "@/lib/db/schema";

/**
 * Payout settlement — server-internal.
 *
 * Called by the payment webhook after HMAC verification. It was exported from
 * a `"use server"` module, which made it an anonymous POST endpoint that could
 * flip any matching ledger row to `paid`.
 */

/** Ledger note that binds an entry to a provider transfer, so a
 *  `transfer.success` webhook can find it again. */
export const transferNote = (reference: string) => `transfer:${reference}`;

export async function updatePayoutStatus(reference: string, status: "completed" | "failed"): Promise<void> {
  try {
    await db
      .update(ledgerEntry)
      .set({ status: status === "completed" ? "paid" : "failed" })
      .where(eq(ledgerEntry.note, transferNote(reference)));
  } catch { /* ledger entry may not use this reference pattern */ }
}
