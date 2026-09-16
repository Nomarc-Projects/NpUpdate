import "server-only";
import { db } from "@/lib/db/client";
import { notification } from "@/lib/db/schema";

/**
 * Enqueue a notification for a user — server-internal.
 *
 * Its docstring already called it "server-only", but it was exported from a
 * `"use server"` module, so it was in fact an anonymous POST endpoint taking a
 * target user id, a title, a body and an `href`. That is an in-app phishing
 * primitive: anyone could drop a plausible-looking notification linking
 * anywhere into any user's feed.
 */
export async function notify(userId: string, input: { type: string; title: string; body?: string; href?: string }) {
  await db.insert(notification).values({
    userId,
    type: input.type,
    title: input.title,
    body: input.body || null,
    href: input.href || null,
  });
}
