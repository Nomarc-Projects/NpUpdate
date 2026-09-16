"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireAdmin } from "@/lib/authz";
import { requireUserId } from "@/lib/server-user";

/**
 * Industry events — the last missing Phase 1 MVP surface. Admins curate
 * listings (conferences, workshops, webinars, site visits…); every signed-in
 * member can browse and RSVP ("going" / "interested"). RSVP counts and the
 * caller's own status are resolved in the same query so the list renders in
 * one round trip.
 */

export type EventCategory = "industry" | "conference" | "workshop" | "webinar" | "training" | "site_visit" | "networking";
export type EventFormat = "in_person" | "online" | "hybrid";
export type RsvpStatus = "going" | "interested";

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  format: EventFormat;
  location: string | null;
  startsAt: string; // ISO
  endsAt: string | null;
  imageUrl: string | null;
  externalUrl: string | null;
  organizer: string | null;
  published: boolean;
  goingCount: number;
  myStatus: RsvpStatus | null;
};

type Row = {
  id: string; title: string; description: string | null; category: string; format: string;
  location: string | null; starts_at: Date | string; ends_at: Date | string | null;
  image_url: string | null; external_url: string | null; organizer: string | null;
  published: boolean; going_count: number | string; my_status: string | null;
};

const map = (r: Row): EventItem => ({
  id: r.id,
  title: r.title,
  description: r.description,
  category: (r.category as EventCategory) ?? "industry",
  format: (r.format as EventFormat) ?? "in_person",
  location: r.location,
  startsAt: new Date(r.starts_at).toISOString(),
  endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
  imageUrl: r.image_url,
  externalUrl: r.external_url,
  organizer: r.organizer,
  published: !!r.published,
  goingCount: Number(r.going_count ?? 0),
  myStatus: (r.my_status as RsvpStatus | null) ?? null,
});

/** Every event, including drafts — admin console only. */
export async function listAllEvents(): Promise<EventItem[]> {
  await requireAdmin();
  const { rows } = await db.execute(sql`
    SELECT e.*,
      (SELECT count(*) FROM event_rsvp r WHERE r.event_id = e.id AND r.status = 'going')::int AS going_count,
      NULL::text AS my_status
    FROM event e ORDER BY e.starts_at DESC LIMIT 200`);
  return rows.map((r) => map(r as unknown as Row));
}

/** Published events for signed-in members, soonest first. */
export async function listEvents(): Promise<EventItem[]> {
  await requireUserId();
  const uid = await requireUserId();
  const { rows } = await db.execute(sql`
    SELECT e.*,
      (SELECT count(*) FROM event_rsvp r WHERE r.event_id = e.id AND r.status = 'going')::int AS going_count,
      (SELECT r.status FROM event_rsvp r WHERE r.event_id = e.id AND r.user_id = ${uid}) AS my_status
    FROM event e
    WHERE e.published = true
    ORDER BY e.starts_at ASC LIMIT 200`);
  return rows.map((r) => map(r as unknown as Row));
}

export async function setRsvp(eventId: string, status: RsvpStatus): Promise<void> {
  const uid = await requireUserId();
  await db.execute(sql`
    INSERT INTO event_rsvp (event_id, user_id, status)
    VALUES (${eventId}, ${uid}, ${status})
    ON CONFLICT (event_id, user_id) DO UPDATE SET status = ${status}`);
  revalidatePath("/dashboard/events");
}

export async function cancelRsvp(eventId: string): Promise<void> {
  const uid = await requireUserId();
  await db.execute(sql`DELETE FROM event_rsvp WHERE event_id = ${eventId} AND user_id = ${uid}`);
  revalidatePath("/dashboard/events");
}

export type EventInput = {
  title: string;
  description?: string;
  category?: EventCategory;
  format?: EventFormat;
  location?: string;
  startsAt: string; // ISO or parseable date string from <input type="datetime-local">
  endsAt?: string;
  imageUrl?: string;
  externalUrl?: string;
  organizer?: string;
  published?: boolean;
};

export async function createEvent(input: EventInput): Promise<string> {
  const adminId = await requireAdmin();
  if (!input.title.trim()) throw new Error("Title is required");
  if (!input.startsAt) throw new Error("Start date is required");
  const { rows } = await db.execute(sql`
    INSERT INTO event (title, description, category, format, location, starts_at, ends_at, image_url, external_url, organizer, published, created_by)
    VALUES (${input.title.trim()}, ${input.description || null}, ${input.category || "industry"}, ${input.format || "in_person"},
            ${input.location || null}, ${new Date(input.startsAt).toISOString()},
            ${input.endsAt ? new Date(input.endsAt).toISOString() : null},
            ${input.imageUrl || null}, ${input.externalUrl || null}, ${input.organizer || null},
            ${input.published ?? true}, ${adminId})
    RETURNING id`);
  revalidatePath("/admin/events");
  revalidatePath("/dashboard/events");
  return String(rows[0].id);
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  await requireAdmin();
  if (!input.title.trim()) throw new Error("Title is required");
  await db.execute(sql`
    UPDATE event SET title = ${input.title.trim()}, description = ${input.description || null},
      category = ${input.category || "industry"}, format = ${input.format || "in_person"},
      location = ${input.location || null}, starts_at = ${new Date(input.startsAt).toISOString()},
      ends_at = ${input.endsAt ? new Date(input.endsAt).toISOString() : null},
      image_url = ${input.imageUrl || null}, external_url = ${input.externalUrl || null},
      organizer = ${input.organizer || null}, published = ${input.published ?? true},
      updated_at = now()
    WHERE id = ${id}`);
  revalidatePath("/admin/events");
  revalidatePath("/dashboard/events");
}

export async function deleteEvent(id: string): Promise<void> {
  await requireAdmin();
  await db.execute(sql`DELETE FROM event WHERE id = ${id}`);
  revalidatePath("/admin/events");
  revalidatePath("/dashboard/events");
}
