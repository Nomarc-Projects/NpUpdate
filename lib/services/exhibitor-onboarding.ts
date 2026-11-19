"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { exhibitorGuidelineAcceptance } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

/** The version of the guideline copy shown in the onboarding wizard. Module
 *  local (never exported) — "use server" files may only export async funcs. */
const EXHIBITOR_GUIDELINE_VERSION = "2026-07-10";

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

/**
 * Records the current user's acceptance of the exhibitor guidelines.
 *
 * Returns a serializable result rather than throwing: an unhandled throw from
 * a server action is redacted by Next.js in production into the generic
 * "Server Components render" error, which is what the modal's catch was
 * surfacing as a red toast. Keeping the error inside a returned value means the
 * caller can show a useful message while the real cause is logged server-side.
 */
export async function acceptExhibitorGuidelines(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const uid = await requireUserId();
    await db
      .insert(exhibitorGuidelineAcceptance)
      .values({ userId: uid, guidelineVersion: EXHIBITOR_GUIDELINE_VERSION, acceptedAt: new Date() })
      .onConflictDoUpdate({
        target: exhibitorGuidelineAcceptance.userId,
        set: { guidelineVersion: EXHIBITOR_GUIDELINE_VERSION, acceptedAt: new Date() },
      });
    revalidatePath("/dashboard/add-product");
    return { success: true };
  } catch (error) {
    console.error("Could not record exhibitor guideline acceptance", error);
    return {
      success: false,
      error: "We couldn't record your acceptance. Please try again, or contact support if it keeps happening.",
    };
  }
}
