"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { sowrEnrollment } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { getProperties } from "@/lib/services/platform-settings-read";
import { getSowrStatusFor, type SowrStatus } from "@/lib/services/sowr-status";

const ACTIVE = "active";

export async function getMySowrStatus(): Promise<SowrStatus> {
  const uid = await requireUserId();
  return getSowrStatusFor(uid);
}

export async function joinSowr() {
  const uid = await requireUserId();
  const settings = await getProperties();
  if (!settings.sowr.enabled) throw new Error("SOWR enrollment is not open right now");

  const existing = await getSowrStatusFor(uid);
  if (existing.enrolled) return existing;

  const [latest] = await db
    .select()
    .from(sowrEnrollment)
    .where(eq(sowrEnrollment.userId, uid))
    .orderBy(desc(sowrEnrollment.createdAt))
    .limit(1);

  if (latest && latest.status === "withdrawn") {
    await db.update(sowrEnrollment).set({ status: ACTIVE, joinedAt: new Date() }).where(eq(sowrEnrollment.id, latest.id));
  } else {
    await db.insert(sowrEnrollment).values({ userId: uid, status: ACTIVE, joinedAt: new Date() });
  }

  revalidatePath("/properties/sowr");
  revalidatePath("/dashboard/properties");
  return getSowrStatusFor(uid);
}

export async function withdrawSowr() {
  const uid = await requireUserId();
  await db
    .update(sowrEnrollment)
    .set({ status: "withdrawn" })
    .where(and(eq(sowrEnrollment.userId, uid), eq(sowrEnrollment.status, ACTIVE)));
  revalidatePath("/properties/sowr");
  revalidatePath("/dashboard/properties");
}
