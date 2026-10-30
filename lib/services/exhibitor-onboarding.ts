"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { exhibitorGuidelineAcceptance } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

/** The version of the guideline copy shown in the onboarding wizard. */
export const EXHIBITOR_GUIDELINE_VERSION = "2026-07-10";

/**
 * Whether the current user has accepted the exhibitor guidelines. Users who
 * already hold the exhibitor role accepted them during onboarding, so callers
 * can skip the check for those. Fails closed on a missing table (migration
 * 0067 unapplied) so the funnel keeps showing the guidelines page.
 */
export async function hasAcceptedExhibitorGuidelines(): Promise<boolean> {
  try {
    const uid = await requireUserId();
    const rows = await db
      .select({ userId: exhibitorGuidelineAcceptance.userId })
      .from(exhibitorGuidelineAcceptance)
      .where(eq(exhibitorGuidelineAcceptance.userId, uid))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Records the current user's acceptance of the exhibitor guidelines. */
export async function acceptExhibitorGuidelines(): Promise<void> {
  const uid = await requireUserId();
  await db
    .insert(exhibitorGuidelineAcceptance)
    .values({ userId: uid, guidelineVersion: EXHIBITOR_GUIDELINE_VERSION, acceptedAt: new Date() })
    .onConflictDoUpdate({
      target: exhibitorGuidelineAcceptance.userId,
      set: { guidelineVersion: EXHIBITOR_GUIDELINE_VERSION, acceptedAt: new Date() },
    });
}
