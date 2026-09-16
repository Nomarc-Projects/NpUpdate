"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { notificationPreference } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { DEFAULT_NOTIFICATION_PREFS, resolvePref, type NotificationPrefKey } from "@/lib/constants/notification-prefs";

export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

/** Full preference map for the signed-in user, unset keys filled with their documented default. */
export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const uid = await requireUserId();
  let saved: Partial<Record<NotificationPrefKey, boolean>> = {};
  try {
    const [row] = await db.select({ prefs: notificationPreference.prefs }).from(notificationPreference).where(eq(notificationPreference.userId, uid)).limit(1);
    saved = (row?.prefs as Partial<Record<NotificationPrefKey, boolean>>) ?? {};
  } catch {
    // table not yet migrated — fall back to defaults
  }
  const out = {} as NotificationPrefs;
  for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFS) as NotificationPrefKey[]) {
    out[key] = resolvePref(saved, key);
  }
  return out;
}

/** Upsert one toggle. Merges into the existing sparse jsonb map. */
export async function setNotificationPref(key: NotificationPrefKey, value: boolean): Promise<{ ok: boolean; error?: string }> {
  const uid = await requireUserId();
  try {
    const [existing] = await db.select({ id: notificationPreference.id, prefs: notificationPreference.prefs }).from(notificationPreference).where(eq(notificationPreference.userId, uid)).limit(1);
    const merged = { ...(existing?.prefs as Record<string, boolean> | null ?? {}), [key]: value };
    if (existing) {
      await db.update(notificationPreference).set({ prefs: merged, updatedAt: new Date() }).where(eq(notificationPreference.userId, uid));
    } else {
      await db.insert(notificationPreference).values({ userId: uid, prefs: merged });
    }
    revalidatePath("/dashboard/settings/account");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save preference." };
  }
}

/**
 * Notification-send gate for other server code (e.g. future `lib/email/mailer.ts`
 * call sites for job matches, application updates, etc.) — resolves a given
 * user + toggle to on/off, defaulting per `DEFAULT_NOTIFICATION_PREFS` when
 * unset. Imported directly by call sites rather than re-exported from
 * `mailer.ts` itself, since `mailer.ts` is imported by `lib/auth.ts` and this
 * service also imports `lib/auth.ts` (via `requireUserId`) — routing through
 * mailer.ts would create a require cycle.
 */
export async function shouldNotify(userId: string, key: NotificationPrefKey): Promise<boolean> {
  try {
    const [row] = await db.select({ prefs: notificationPreference.prefs }).from(notificationPreference).where(eq(notificationPreference.userId, userId)).limit(1);
    return resolvePref(row?.prefs as Partial<Record<NotificationPrefKey, boolean>> | undefined, key);
  } catch {
    return DEFAULT_NOTIFICATION_PREFS[key];
  }
}
