"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userRole } from "@/lib/db/schema";
import { resolveExhibitorPlan } from "@/lib/services/exhibitor-trial";
import { getActiveTrial } from "@/lib/services/trial";

/**
 * Whether buyers may contact this user as a seller. Only an exhibitor with a
 * lapsed plan/trial is unavailable — everyone else (including professionals
 * chatting with each other) is unaffected. Used for both the buyer-facing UI
 * and the server actions, since a hidden button is not an access control.
 */
export async function isSellerActive(userId: string): Promise<boolean> {
  const [role] = await db
    .select({ status: userRole.status })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.role, "exhibitor")))
    .limit(1);

  if (!role || role.status !== "active") return true;

  if (await getActiveTrial(userId, "exhibitor")) return true;
  return (await resolveExhibitorPlan(userId)) !== "free";
}
