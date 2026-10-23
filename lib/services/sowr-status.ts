import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sowrEnrollment } from "@/lib/db/schema";

export type SowrStatus = {
  enrolled: boolean;
  status: string | null;
  joinedAt: string | null;
};

const ACTIVE = "active";

export async function getSowrStatusFor(userId: string): Promise<SowrStatus> {
  const [row] = await db
    .select()
    .from(sowrEnrollment)
    .where(and(eq(sowrEnrollment.userId, userId), eq(sowrEnrollment.status, ACTIVE)))
    .orderBy(desc(sowrEnrollment.createdAt))
    .limit(1);
  return {
    enrolled: !!row,
    status: row?.status ?? null,
    joinedAt: row?.joinedAt?.toISOString() ?? null,
  };
}
