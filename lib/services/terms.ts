"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userTermsAcceptance } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

export type TermsAcceptanceStatus = {
  accepted: boolean;
  version: string | null;
  acceptedAt: Date | null;
};

/**
 * Whether the given user has accepted the current Terms/Privacy version.
 * Fails closed (not accepted) on lookup errors so users are prompted rather
 * than silently bypassing consent.
 */
export async function getUserTermsAcceptanceStatus(userId: string): Promise<TermsAcceptanceStatus> {
  try {
    const rows = await db
      .select({ termsVersion: userTermsAcceptance.termsVersion, acceptedAt: userTermsAcceptance.acceptedAt })
      .from(userTermsAcceptance)
      .where(eq(userTermsAcceptance.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row) return { accepted: false, version: null, acceptedAt: null };
    return {
      accepted: row.termsVersion === CURRENT_TERMS_VERSION,
      version: row.termsVersion,
      acceptedAt: row.acceptedAt,
    };
  } catch {
    return { accepted: false, version: null, acceptedAt: null };
  }
}

export async function getMyTermsAcceptanceStatus(): Promise<TermsAcceptanceStatus> {
  const uid = await requireUserId();
  return getUserTermsAcceptanceStatus(uid);
}

/** Records the current user's acceptance of the current Terms/Privacy version. */
export async function acceptCurrentTerms(): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const uid = await requireUserId();
    await recordUserTermsAcceptance(uid, CURRENT_TERMS_VERSION);
    return { success: true };
  } catch (error) {
    console.error("Could not record terms acceptance", error);
    return { success: false, error: "We couldn't save your acceptance. Please try again." };
  }
}

/** Internal/server-side upsert used by actions and auth hooks. */
export async function recordUserTermsAcceptance(userId: string, version = CURRENT_TERMS_VERSION, acceptedAt = new Date()) {
  await db
    .insert(userTermsAcceptance)
    .values({ userId, termsVersion: version, acceptedAt })
    .onConflictDoUpdate({
      target: userTermsAcceptance.userId,
      set: { termsVersion: version, acceptedAt },
    });
}
