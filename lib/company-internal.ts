import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { company } from "@/lib/db/schema";

/**
 * Company lookups keyed by user id — server-internal.
 *
 * Both take a `uid` and were exported from a `"use server"` module, so both
 * were anonymous endpoints. `ensureCompany` is the worse of the two: it
 * *creates* a company row for whatever id it is handed and stamps
 * `trialStartedAt`, which would burn another user's 30-day free-listing window
 * before they ever signed up.
 *
 * Callers resolve the user from the session first (see `requireUserId`).
 */

export async function getOwnCompany(uid: string) {
  const [c] = await db.select().from(company).where(eq(company.ownerUserId, uid)).limit(1);
  return c;
}

/** Ensure the owner has a company row; returns its id. */
export async function ensureCompany(uid: string, name?: string) {
  const c = await getOwnCompany(uid);
  if (c) return c.id;
  // Anchors the 30-day free-listing window from the moment the company exists,
  // which is what "your first 30 days" means to a new exhibitor. Only ever set
  // on insert, so it can't be reset by re-saving the profile.
  const [created] = await db
    .insert(company)
    .values({ ownerUserId: uid, name: name?.trim() || "My Company", trialStartedAt: new Date() })
    .returning({ id: company.id });
  return created.id;
}
