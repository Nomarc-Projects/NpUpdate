"use server";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { normalizeEmail } from "@/lib/email-normalize";

/**
 * Returns false when an alias of this email already has an account, so provider
 * aliases (john.doe@gmail.com vs johndoe@gmail.com vs john.doe+x@gmail.com)
 * can't be used to create duplicate accounts. Compares canonical forms.
 *
 * Resilient: on any DB error we return true (available) so signup is never
 * blocked by an infra hiccup — Better Auth still enforces exact-email
 * uniqueness as the hard backstop.
 */
export async function isEmailAvailable(raw: string): Promise<boolean> {
  const target = normalizeEmail(raw);
  if (!target.includes("@")) return false;
  try {
    const res = await db.execute(sql`SELECT email FROM "user"`);
    const rows = res.rows as { email: string }[];
    return !rows.some((r) => normalizeEmail(r.email) === target);
  } catch {
    return true;
  }
}
