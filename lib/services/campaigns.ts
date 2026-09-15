"use server";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { sendEmail, sendBulkEmails, emailLayout, isEmailConfigured, siteUrl } from "@/lib/email/mailer";
import { applyShortcodes, previewRecipient } from "@/lib/email/shortcodes";
import { unsubscribeUrlFor } from "@/lib/email/unsubscribe";
import { withTracking } from "@/lib/email/tracking";
import type { SegmentRule, SegmentMatchMode } from "@/lib/services/segment-rules";

async function requireAdmin(): Promise<{ id: string; email: string; name: string }> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { role?: string; email?: string; name?: string } | undefined;
  if (u?.role !== "admin" && u?.role !== "super_admin") throw new Error("Forbidden");
  return { id: uid, email: u?.email ?? "", name: u?.name ?? "Admin" };
}

/**
 * Releasing a platform-wide blast is super-admin only. Composing, testing and
 * submitting stay open to any admin — the gate is on the irreversible step.
 */
async function requireSuperAdmin(): Promise<{ id: string; email: string; name: string }> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { role?: string; email?: string; name?: string } | undefined;
  if (u?.role !== "super_admin") throw new Error("Only a super admin can approve or send a campaign.");
  return { id: uid, email: u?.email ?? "", name: u?.name ?? "Admin" };
}

export type CampaignStatus = "draft" | "pending_review" | "scheduled" | "sending" | "sent" | "failed";

export type CampaignRow = {
  id: string;
  name: string;
  segmentId: string | null;
  segmentName: string | null;
  audienceKey: string;
  audienceLabel: string;
  /** audienceKey = "custom": hand-picked recipients. */
  recipientUserIds: string[] | null;
  /** audienceKey = "segments": one or more saved segments. */
  segmentIds: string[] | null;
  subject: string;
  previewText: string | null;
  fromName: string | null;
  replyTo: string | null;
  bodyHtml: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  scheduledAtRaw: string | null;
  sentAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  /** Unique-recipient rates, null until the campaign has actually sent. */
  openRate: number | null;
  clickRate: number | null;
  createdAtRaw: string;
};

const AUDIENCE_LABELS: Record<string, string> = {
  all_users: "All Active Users",
  professionals: "Professionals",
  exhibitors: "Exhibitors",
  employers: "Employers",
};

const fmtDateTime = (raw: string | null) =>
  raw ? new Date(raw).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }) : null;

/**
 * Record an opt-out. Called from the unauthenticated unsubscribe route, so it
 * deliberately does not require an admin; the route verifies a signed token
 * before calling, and this only ever inserts a suppression for the address
 * already attached to that user id.
 *
 * Returns the suppressed address so the confirmation page can name it back.
 */
export async function suppressEmailForUser(userId: string): Promise<string | null> {
  const found = await db.execute(sql`SELECT email FROM "user" WHERE id = ${userId} LIMIT 1`);
  const email = (found.rows[0] as { email: string | null } | undefined)?.email;
  if (!email) return null;
  await db.execute(sql`
    INSERT INTO email_suppression (email, user_id, reason)
    VALUES (${email.toLowerCase()}, ${userId}, 'unsubscribe')
    ON CONFLICT (email) DO NOTHING
  `);
  revalidatePath("/admin/email-campaigns");
  return email;
}

/**
 * Built-in audience → recipients. Mirrors the segment query's exclusions.
 *
 * Opted-out addresses are excluded here rather than at send time so the
 * composer's audience count tells the truth about who will actually be mailed.
 */
async function builtinRecipients(key: string): Promise<{ id: string; name: string; email: string }[]> {
  const roleFilter =
    key === "professionals" ? sql`AND COALESCE(u.role,'client') = 'professional'`
    : key === "exhibitors" ? sql`AND COALESCE(u.role,'client') = 'exhibitor'`
    : key === "employers" ? sql`AND COALESCE(u.role,'client') = 'employer'`
    : sql``;
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email FROM "user" u
    WHERE u.banned IS NOT TRUE AND u.email IS NOT NULL ${roleFilter}
      AND NOT EXISTS (SELECT 1 FROM email_suppression s WHERE s.email = lower(u.email))
  `);
  return res.rows as { id: string; name: string; email: string }[];
}

/**
 * Rule→SQL lives in ./segments.ts and is intentionally not re-exported, so the
 * audience for a saved segment is resolved by delegating there rather than by
 * duplicating the whitelist (two copies would drift apart).
 */
async function segmentRecipientsById(segmentId: string): Promise<{ id: string; name: string; email: string }[]> {
  const res = await db.execute(sql`SELECT rules_json, match_mode FROM audience_segment WHERE id = ${segmentId} LIMIT 1`);
  const r = (res.rows as Record<string, unknown>[])[0];
  if (!r) return [];
  let rules: SegmentRule[] = [];
  try {
    const v = JSON.parse(String(r.rules_json ?? "[]"));
    if (Array.isArray(v)) rules = v as SegmentRule[];
  } catch { rules = []; }
  const mode = (String(r.match_mode ?? "all") === "any" ? "any" : "all") as SegmentMatchMode;
  const { segmentRecipients } = await import("@/lib/services/segments");
  return segmentRecipients(rules, mode);
}

/** Explicit hand-picked recipients (audienceKey = "custom"). */
async function explicitRecipients(userIds: string[]): Promise<{ id: string; name: string; email: string }[]> {
  if (!userIds.length) return [];
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email FROM "user" u
    WHERE u.id IN (${sql.join(userIds.map((i) => sql`${i}`), sql`, `)})
      AND u.banned IS NOT TRUE AND u.email IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM email_suppression s WHERE s.email = lower(u.email))
  `);
  return res.rows as { id: string; name: string; email: string }[];
}

/** Union of several saved segments, de-duplicated by user id. */
async function multiSegmentRecipients(segmentIds: string[]): Promise<{ id: string; name: string; email: string }[]> {
  const lists = await Promise.all(segmentIds.map((id) => segmentRecipientsById(id).catch(() => [])));
  const byId = new Map<string, { id: string; name: string; email: string }>();
  for (const list of lists) for (const r of list) byId.set(r.id, r);
  return [...byId.values()];
}

/**
 * Audience → recipients.
 *
 * Order matters: the two new explicit audiences are checked before the legacy
 * single `segmentId`, which stays supported so campaigns saved before this
 * still resolve exactly as they did.
 */
async function resolveRecipients(c: {
  segmentId: string | null;
  audienceKey: string;
  recipientUserIds?: string[] | null;
  segmentIds?: string[] | null;
}) {
  if (c.audienceKey === "custom") return explicitRecipients(c.recipientUserIds ?? []);
  if (c.audienceKey === "segments") return multiSegmentRecipients(c.segmentIds ?? []);
  return c.segmentId ? segmentRecipientsById(c.segmentId) : builtinRecipients(c.audienceKey);
}

/**
 * User search for the "Custom recipients" picker.
 *
 * Capped and query-gated: the whole user table is 1,795 rows and growing, and a
 * picker that loads everyone would be unusable long before it was slow.
 * Suppressed addresses are excluded, since choosing someone who has opted out
 * and then watching them silently drop from the count would be baffling.
 */
export async function searchCampaignRecipients(query: string): Promise<{ id: string; name: string; email: string }[]> {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q.toLowerCase()}%`;
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email FROM "user" u
    WHERE u.banned IS NOT TRUE AND u.email IS NOT NULL
      AND (lower(u.name) LIKE ${like} OR lower(u.email) LIKE ${like})
      AND NOT EXISTS (SELECT 1 FROM email_suppression s WHERE s.email = lower(u.email))
    ORDER BY u.name
    LIMIT 25
  `);
  return res.rows as { id: string; name: string; email: string }[];
}

/** Live recipient count for the composer's audience picker. */
export async function getCampaignAudienceCount(input: {
  segmentId?: string | null;
  audienceKey?: string;
  recipientUserIds?: string[] | null;
  segmentIds?: string[] | null;
}): Promise<number> {
  await requireAdmin();
  const rows = await resolveRecipients({
    segmentId: input.segmentId ?? null,
    audienceKey: input.audienceKey ?? "all_users",
    recipientUserIds: input.recipientUserIds ?? null,
    segmentIds: input.segmentIds ?? null,
  });
  return rows.length;
}

function toRow(r: Record<string, unknown>, opens: number, clicks: number): CampaignRow {
  const sentCount = Number(r.sent_count ?? 0);
  const status = String(r.status ?? "draft") as CampaignStatus;
  const denom = sentCount > 0 ? sentCount : 0;
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    segmentId: r.segment_id ? String(r.segment_id) : null,
    segmentName: r.segment_name ? String(r.segment_name) : null,
    audienceKey: String(r.audience_key ?? "all_users"),
    audienceLabel: r.segment_name ? String(r.segment_name) : (AUDIENCE_LABELS[String(r.audience_key ?? "all_users")] ?? String(r.audience_key ?? "")),
    recipientUserIds: Array.isArray(r.recipient_user_ids) ? (r.recipient_user_ids as string[]) : null,
    segmentIds: Array.isArray(r.segment_ids) ? (r.segment_ids as string[]).map(String) : null,
    subject: String(r.subject ?? ""),
    previewText: r.preview_text ? String(r.preview_text) : null,
    fromName: r.from_name ? String(r.from_name) : null,
    replyTo: r.reply_to ? String(r.reply_to) : null,
    bodyHtml: String(r.body_html ?? ""),
    status,
    scheduledAt: fmtDateTime(r.scheduled_at ? String(r.scheduled_at) : null),
    scheduledAtRaw: r.scheduled_at ? new Date(String(r.scheduled_at)).toISOString() : null,
    sentAt: fmtDateTime(r.sent_at ? String(r.sent_at) : null),
    recipientCount: Number(r.recipient_count ?? 0),
    sentCount,
    failedCount: Number(r.failed_count ?? 0),
    // Rates are only meaningful once something was delivered; showing 0% for a
    // draft would read as "nobody opened it" rather than "not sent yet".
    openRate: denom ? Math.round((opens / denom) * 100) : null,
    clickRate: denom ? Math.round((clicks / denom) * 100) : null,
    createdAtRaw: r.created_at ? String(r.created_at) : "",
  };
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT c.id, c.name, c.segment_id, c.audience_key, c.subject, c.preview_text, c.from_name, c.reply_to,
           c.body_html, c.status, c.scheduled_at, c.sent_at, c.recipient_count, c.sent_count, c.failed_count,
           c.recipient_user_ids, c.segment_ids,
           c.created_at, s.name AS segment_name,
           (SELECT count(DISTINCT e.user_id) FROM email_campaign_event e WHERE e.campaign_id = c.id AND e.kind = 'open')::int AS opens,
           (SELECT count(DISTINCT e.user_id) FROM email_campaign_event e WHERE e.campaign_id = c.id AND e.kind = 'click')::int AS clicks
    FROM email_campaign c
    LEFT JOIN audience_segment s ON s.id = c.segment_id
    ORDER BY c.created_at DESC LIMIT 200
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => toRow(r, Number(r.opens ?? 0), Number(r.clicks ?? 0)));
}

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT c.*, s.name AS segment_name,
           (SELECT count(DISTINCT e.user_id) FROM email_campaign_event e WHERE e.campaign_id = c.id AND e.kind = 'open')::int AS opens,
           (SELECT count(DISTINCT e.user_id) FROM email_campaign_event e WHERE e.campaign_id = c.id AND e.kind = 'click')::int AS clicks
    FROM email_campaign c LEFT JOIN audience_segment s ON s.id = c.segment_id
    WHERE c.id = ${id} LIMIT 1
  `);
  const r = (res.rows as Record<string, unknown>[])[0];
  return r ? toRow(r, Number(r.opens ?? 0), Number(r.clicks ?? 0)) : null;
}

export type CampaignInput = {
  name: string;
  subject: string;
  previewText?: string;
  fromName?: string;
  replyTo?: string;
  bodyHtml: string;
  segmentId?: string | null;
  audienceKey?: string;
  /** audienceKey = "custom". */
  recipientUserIds?: string[] | null;
  /** audienceKey = "segments". */
  segmentIds?: string[] | null;
};

function validate(input: CampaignInput): string | null {
  if (!input.name.trim()) return "Give the campaign a name.";
  if (!input.subject.trim()) return "A subject line is required.";
  if (!input.bodyHtml.trim()) return "The email needs some content.";
  if (input.replyTo?.trim() && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(input.replyTo.trim())) return "That reply-to address doesn't look right.";
  return null;
}

/**
 * A test send only needs something to render.
 *
 * It used to run the full `validate`, so previewing your work was blocked by
 * "Give the campaign a name." — a field that has nothing to do with what lands in
 * the inbox, and which sits well above the Send Test button. Naming stays
 * required to save or release.
 */
function validateForTest(input: CampaignInput): string | null {
  if (!input.subject.trim()) return "Add a subject line before sending a test.";
  if (!input.bodyHtml.trim()) return "Add some content before sending a test.";
  if (input.replyTo?.trim() && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(input.replyTo.trim())) return "That reply-to address doesn't look right.";
  return null;
}

/**
 * Reserved TLDs that can never receive mail (RFC 2606 / RFC 6761).
 *
 * The composer prefills the test field with the acting admin's own address, and
 * seeded admin accounts use `admin@nomarc.test`. Resend either rejects that
 * outright or blackholes it, so "Send Test Email" reported success and nothing
 * ever arrived. Better to refuse with an explanation than to appear to work.
 */
const UNDELIVERABLE_TLD = /\.(test|invalid|example|localhost|local)$/i;

export async function saveCampaign(input: CampaignInput & { id?: string }): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const admin = await requireAdmin();
    const err = validate(input);
    if (err) return { ok: false, error: err };
    // "custom" and "segments" carry their own arrays and must not be rewritten
    // to the legacy single-segment shape just because segmentId happens to be set.
    const explicit = input.audienceKey === "custom" || input.audienceKey === "segments";
    const segmentId = explicit ? null : (input.segmentId || null);
    const audienceKey = explicit ? input.audienceKey! : segmentId ? "segment" : (input.audienceKey || "all_users");
    const recipientIds = input.audienceKey === "custom" ? (input.recipientUserIds ?? []) : null;
    const segIds = input.audienceKey === "segments" ? (input.segmentIds ?? []) : null;
    const asTextArray = (v: string[] | null) => (v === null ? null : sql`${v}::text[]`);
    const asUuidArray = (v: string[] | null) => (v === null ? null : sql`${v}::uuid[]`);

    if (input.id) {
      // A sent campaign is a historical record — editing it would invalidate its
      // own open/click numbers, so it's frozen.
      const cur = await db.execute(sql`SELECT status FROM email_campaign WHERE id = ${input.id} LIMIT 1`);
      const status = String((cur.rows[0] as Record<string, unknown>)?.status ?? "draft");
      if (status === "sent" || status === "sending") return { ok: false, error: "This campaign has already gone out and can't be edited. Duplicate it instead." };
      await db.execute(sql`
        UPDATE email_campaign SET
          name = ${input.name.trim()}, subject = ${input.subject.trim()},
          preview_text = ${input.previewText?.trim() || null}, from_name = ${input.fromName?.trim() || null},
          reply_to = ${input.replyTo?.trim() || null}, body_html = ${input.bodyHtml},
          segment_id = ${segmentId}, audience_key = ${audienceKey},
          recipient_user_ids = ${asTextArray(recipientIds)}, segment_ids = ${asUuidArray(segIds)},
          updated_at = now()
        WHERE id = ${input.id}
      `);
      revalidatePath("/admin/email-campaigns");
      return { ok: true, id: input.id };
    }

    const res = await db.execute(sql`
      INSERT INTO email_campaign (name, subject, preview_text, from_name, reply_to, body_html, segment_id, audience_key,
                                  recipient_user_ids, segment_ids, status, created_by)
      VALUES (${input.name.trim()}, ${input.subject.trim()}, ${input.previewText?.trim() || null}, ${input.fromName?.trim() || null},
              ${input.replyTo?.trim() || null}, ${input.bodyHtml}, ${segmentId}, ${audienceKey},
              ${asTextArray(recipientIds)}, ${asUuidArray(segIds)}, 'draft', ${admin.id})
      RETURNING id
    `);
    revalidatePath("/admin/email-campaigns");
    return { ok: true, id: String((res.rows[0] as Record<string, unknown>)?.id ?? "") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the campaign." };
  }
}

export async function deleteCampaign(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    await db.execute(sql`DELETE FROM email_campaign_event WHERE campaign_id = ${id}`);
    await db.execute(sql`DELETE FROM email_campaign WHERE id = ${id}`);
    revalidatePath("/admin/email-campaigns");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't delete the campaign." };
  }
}

export async function duplicateCampaign(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    // Copies the content but never the delivery history — the duplicate starts
    // as a fresh draft with zeroed counters.
    await db.execute(sql`
      INSERT INTO email_campaign (name, subject, preview_text, from_name, reply_to, body_html, segment_id, audience_key, status, created_by)
      SELECT name || ' (copy)', subject, preview_text, from_name, reply_to, body_html, segment_id, audience_key, 'draft', ${admin.id}
      FROM email_campaign WHERE id = ${id}
    `);
    revalidatePath("/admin/email-campaigns");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't duplicate the campaign." };
  }
}

/**
 * One-off send so the admin can eyeball the real thing before the blast.
 * Defaults to the acting admin's own address; `to` allows a different inbox
 * (handy when the admin account's address isn't one you actually read).
 */
export async function sendTestEmail(input: CampaignInput & { to?: string }): Promise<{ ok: boolean; error?: string; to?: string }> {
  try {
    const admin = await requireAdmin();
    const err = validateForTest(input);
    if (err) return { ok: false, error: err };
    const target = (input.to?.trim() || admin.email).trim();
    if (!target) return { ok: false, error: "No address to send the test to." };
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(target)) return { ok: false, error: "That test address doesn't look right." };
    if (UNDELIVERABLE_TLD.test(target)) {
      return { ok: false, error: `${target} can't receive mail — that domain is reserved for testing. Enter a real inbox you can open.` };
    }
    if (!isEmailConfigured) return { ok: false, error: "Email isn't configured, so no test could be sent." };
    const baseUrl = siteUrl();
    await sendEmail({
      to: target,
      subject: `[Test] ${input.subject.trim()}`,
      // Same emailLayout wrapper every other Nomarc email uses, so the test
      // reflects the real branding rather than a bare HTML body. Shortcodes are
      // resolved too, against the test recipient, so the preview shows what a
      // real recipient sees rather than raw "{{first_name}}" tokens.
      html: emailLayout({
        heading: input.subject.trim(),
        body: applyShortcodes(input.bodyHtml, previewRecipient(target, admin.name), { baseUrl }),
        preheader: input.previewText?.trim(),
        unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?preview=1`,
      }),
      fromName: input.fromName,
      replyTo: input.replyTo,
    });
    return { ok: true, to: target };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't send the test email." };
  }
}

/** Any admin: hand a draft to a super admin for release. */
export async function submitCampaignForApproval(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    const c = await getCampaign(id);
    if (!c) return { ok: false, error: "That campaign no longer exists." };
    const err = validate({ name: c.name, subject: c.subject, bodyHtml: c.bodyHtml, audienceKey: c.audienceKey, segmentId: c.segmentId });
    if (err) return { ok: false, error: err };
    await db.execute(sql`
      UPDATE email_campaign
      SET status = 'pending_review', submitted_by = ${admin.id}, submitted_at = now(),
          rejection_reason = NULL, updated_at = now()
      WHERE id = ${id} AND status IN ('draft','failed')
    `);
    revalidatePath("/admin/email-campaigns");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't submit the campaign." };
  }
}

/** Super admin only: send a submitted campaign back to its author. */
export async function rejectCampaign(id: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const r = reason.trim();
    if (!r) return { ok: false, error: "Give a reason so the author knows what to change." };
    await db.execute(sql`
      UPDATE email_campaign SET status = 'draft', rejection_reason = ${r}, updated_at = now()
      WHERE id = ${id} AND status = 'pending_review'
    `);
    revalidatePath("/admin/email-campaigns");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't reject the campaign." };
  }
}

/**
 * Super admin only. Scheduling is a deferred send, so it carries the same
 * authority as sending — a plain admin scheduling for one minute's time would
 * otherwise walk straight around the approval gate.
 */
export async function scheduleCampaign(id: string, whenIso: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireSuperAdmin();
    const when = new Date(whenIso);
    if (Number.isNaN(when.getTime())) return { ok: false, error: "That date and time couldn't be read." };
    if (when.getTime() < Date.now()) return { ok: false, error: "Pick a time in the future." };
    await db.execute(sql`
      UPDATE email_campaign
      SET status = 'scheduled', scheduled_at = ${when.toISOString()},
          approved_by = ${admin.id}, approved_at = now(), updated_at = now()
      WHERE id = ${id} AND status IN ('draft','pending_review','scheduled')
    `);
    revalidatePath("/admin/email-campaigns");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't schedule the campaign." };
  }
}

/**
 * Session-free read of the fields enqueueing needs. `getCampaign()` requires an
 * admin session, but the drain route enqueues due scheduled campaigns as a
 * machine caller (secret-guarded) — this avoids the session check without
 * loosening `getCampaign` itself.
 */
async function readCampaignForEnqueue(id: string): Promise<Pick<CampaignRow, "status" | "segmentId" | "audienceKey" | "recipientUserIds" | "segmentIds" | "scheduledAtRaw"> | null> {
  const res = await db.execute(sql`
    SELECT status, segment_id, audience_key, recipient_user_ids, segment_ids, scheduled_at
    FROM email_campaign WHERE id = ${id} LIMIT 1
  `);
  const r = res.rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    status: String(r.status ?? "") as CampaignStatus,
    segmentId: r.segment_id ? String(r.segment_id) : null,
    audienceKey: String(r.audience_key ?? "all_users"),
    recipientUserIds: Array.isArray(r.recipient_user_ids) ? (r.recipient_user_ids as string[]) : null,
    segmentIds: Array.isArray(r.segment_ids) ? (r.segment_ids as string[]).map(String) : null,
    scheduledAtRaw: r.scheduled_at ? new Date(String(r.scheduled_at)).toISOString() : null,
  };
}

/**
 * Enqueue every recipient into the delivery ledger, then hand off to the drain.
 *
 * This used to loop over all recipients inline. With 1,795 of them and a rate
 * ceiling measured in hundreds per hour, that loop needs hours, so it was always
 * killed partway: the process died before the catch could run, the row stayed
 * 'sending', and the guard below then refused to ever retry it. The campaign
 * wedged, with no record of who had already been mailed.
 *
 * Now the work is queued and drained incrementally (see `drainCampaign`), so
 * progress survives a restart and a retry cannot double-send.
 *
 * The queueing core is `enqueueCampaignForDelivery` below — deliberately NOT
 * session-gated, because two machine contexts need it: the drain route firing a
 * due *scheduled* campaign (pre-approved by a super admin at schedule time) and
 * recovering a wedged campaign whose ledger is already exhausted. The only
 * public, browser-facing entry stays `startCampaignSend`, which keeps the
 * super-admin gate.
 */
async function enqueueCampaignForDelivery(
  id: string,
  actorId: string | null,
  opts: { allowWedgedResume?: boolean } = {},
): Promise<{ ok: boolean; error?: string; queued?: number }> {
  const c = await readCampaignForEnqueue(id);
  if (!c) return { ok: false, error: "That campaign no longer exists." };
  if (c.status === "sent") return { ok: false, error: "This campaign has already been sent." };
  if (!isEmailConfigured) return { ok: false, error: "Email isn't configured, so nothing was queued." };

  // A campaign stuck in 'sending' is usually still mid-drain. Re-queueing it
  // would just add ledger rows the drain is already working through. The only
  // legitimate resume is the wedged case: the process died before the catch
  // ran, leaving status='sending' with no pending ledger rows to drain. Only
  // then (and only when explicitly allowed) do we re-enqueue.
  if (c.status === "sending" && !opts.allowWedgedResume) {
    return { ok: false, error: "This campaign is already sending — wait for the drain to finish it." };
  }

  const recipients = await resolveRecipients({ segmentId: c.segmentId, audienceKey: c.audienceKey, recipientUserIds: c.recipientUserIds, segmentIds: c.segmentIds });
  if (recipients.length === 0) return { ok: false, error: "That audience currently matches nobody — nothing was queued." };

  // ON CONFLICT DO NOTHING is what makes re-running safe: anyone already in the
  // ledger keeps their existing row (and therefore their 'sent' status).
  for (const batch of chunk(recipients, 200)) {
    const values = batch.map((r) => sql`(${id}, ${r.id}, ${r.email}, 'pending')`);
    await db.execute(sql`
      INSERT INTO email_campaign_delivery (campaign_id, user_id, email, status)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (campaign_id, user_id) DO NOTHING
    `);
  }

  await db.execute(sql`
    UPDATE email_campaign
    SET status = 'sending', recipient_count = ${recipients.length},
        approved_by = COALESCE(${actorId}, approved_by),
        approved_at = COALESCE(${actorId}, approved_at),
        updated_at = now()
    WHERE id = ${id}
  `);

  revalidatePath("/admin/email-campaigns");
  return { ok: true, queued: recipients.length };
}

export async function startCampaignSend(id: string): Promise<{ ok: boolean; error?: string; queued?: number }> {
  try {
    // Super admin only — this is the irreversible, platform-wide step.
    const admin = await requireSuperAdmin();
    return await enqueueCampaignForDelivery(id, admin.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't queue the campaign." };
  }
}

/**
 * Re-queue a campaign whose status is 'sending' but whose delivery ledger has
 * no pending rows left — the signature of a wedged send (the process died
 * before the old inline loop's catch could flip it to 'failed'). Re-enqueues
 * only recipients not already marked sent, so nobody is mailed twice.
 */
export async function requeueWedgedCampaign(id: string): Promise<{ ok: boolean; error?: string; queued?: number }> {
  try {
    const admin = await requireSuperAdmin();
    const c = await readCampaignForEnqueue(id);
    if (!c) return { ok: false, error: "That campaign no longer exists." };
    if (c.status !== "sending") return { ok: false, error: "This campaign isn't stuck — it doesn't need re-queueing." };

    const counts = await db.execute(sql`
      SELECT count(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM email_campaign_delivery WHERE campaign_id = ${id}
    `);
    const pending = Number((counts.rows[0] as { pending: number }).pending ?? 0);
    if (pending > 0) return { ok: false, error: "This campaign still has pending recipients — the drain is working on it." };

    return await enqueueCampaignForDelivery(id, admin.id, { allowWedgedResume: true });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't re-queue the campaign." };
  }
}

/**
 * Fire a campaign whose scheduled time has arrived. Called by the drain route
 * (machine context, secret-guarded); the campaign was already approved by a
 * super admin when it was scheduled, so no session re-check is needed here.
 */
export async function fireDueScheduledCampaign(id: string): Promise<{ ok: boolean; error?: string; queued?: number }> {
  try {
    const c = await readCampaignForEnqueue(id);
    if (!c) return { ok: false, error: "That campaign no longer exists." };
    if (c.status !== "scheduled") return { ok: false, error: "This campaign isn't scheduled." };
    if (c.scheduledAtRaw && new Date(c.scheduledAtRaw).getTime() > Date.now()) {
      return { ok: false, error: "Not due yet." };
    }
    return await enqueueCampaignForDelivery(id, null);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't start the scheduled campaign." };
  }
}

const CHUNK = 20;
const chunk = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Legacy immediate send, kept for the small broadcast-style audiences it was
 * written for. Large campaigns go through startCampaignSend + drainCampaign.
 */
export async function sendCampaignNow(id: string): Promise<{ ok: boolean; error?: string; sentCount?: number; failedCount?: number }> {
  try {
    // Super admin only — this is the irreversible, platform-wide step.
    const admin = await requireSuperAdmin();
    const c = await getCampaign(id);
    if (!c) return { ok: false, error: "That campaign no longer exists." };
    if (c.status === "sent" || c.status === "sending") return { ok: false, error: "This campaign has already been sent." };
    if (!isEmailConfigured) return { ok: false, error: "Email isn't configured, so nothing was sent." };

    const recipients = await resolveRecipients({ segmentId: c.segmentId, audienceKey: c.audienceKey, recipientUserIds: c.recipientUserIds, segmentIds: c.segmentIds });
    if (recipients.length === 0) return { ok: false, error: "That audience currently matches nobody — nothing was sent." };

    await db.execute(sql`
      UPDATE email_campaign
      SET status = 'sending', recipient_count = ${recipients.length},
          approved_by = ${admin.id}, approved_at = now(), updated_at = now()
      WHERE id = ${id}
    `);

    let sentCount = 0;
    let failedCount = 0;
    for (const batch of chunk(recipients, CHUNK)) {
      const messages = batch.map((r) => ({
        to: r.email,
        subject: c.subject,
        html: emailLayout({
          heading: c.subject,
          body: withTracking(
            applyShortcodes(c.bodyHtml, r, { baseUrl: siteUrl(), unsubscribeUrl: unsubscribeUrlFor(r.id) }),
            id,
            r.id,
          ),
          preheader: c.previewText ?? undefined,
          unsubscribeUrl: unsubscribeUrlFor(r.id),
        }),
        replyTo: c.replyTo ?? undefined,
      }));
      const results = await sendBulkEmails(messages).catch((e) => {
        // Both the old allSettled path and this one must absorb a batch-wide
        // failure (network, provider 5xx) without tripping the outer catch and
        // marking the whole campaign failed — those addresses just didn't go out.
        return messages.map(() => ({ to: "", error: e instanceof Error ? e.message : "send failed" }));
      });
      for (const res of results) res.error ? failedCount++ : sentCount++;
      if (recipients.length > CHUNK) await sleep(300);
    }

    await db.execute(sql`
      UPDATE email_campaign
      SET status = ${failedCount > 0 && sentCount === 0 ? "failed" : "sent"},
          sent_at = now(), sent_count = ${sentCount}, failed_count = ${failedCount}, updated_at = now()
      WHERE id = ${id}
    `);
    revalidatePath("/admin/email-campaigns");
    return { ok: true, sentCount, failedCount };
  } catch (e) {
    // Don't strand the row in 'sending' if the batch loop blew up partway.
    await db.execute(sql`UPDATE email_campaign SET status = 'failed', updated_at = now() WHERE id = ${id} AND status = 'sending'`).catch(() => {});
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't send the campaign." };
  }
}

/**
 * Records an open/click. Called from the unauthenticated tracking routes, so it
 * deliberately does NOT require an admin — it only ever inserts, and only for a
 * campaign that exists.
 *
 * ON CONFLICT DO NOTHING pairs with the partial unique indexes from
 * drizzle/0030: one open per recipient, one click per recipient per link. Repeat
 * fetches of a pixel or a link are therefore free rather than each adding a row
 * to a table an unauthenticated caller can write to.
 */
export async function recordCampaignEvent(campaignId: string, userId: string, kind: "open" | "click", url?: string): Promise<void> {
  if (!campaignId || !userId || (kind !== "open" && kind !== "click")) return;
  await db.execute(sql`
    INSERT INTO email_campaign_event (campaign_id, user_id, kind, url)
    SELECT ${campaignId}, ${userId}, ${kind}, ${url ?? null}
    WHERE EXISTS (SELECT 1 FROM email_campaign WHERE id = ${campaignId})
    ON CONFLICT DO NOTHING
  `).catch(() => {});
}

/** Campaigns whose scheduled time has passed and still need sending. */
export async function dueCampaignIds(): Promise<string[]> {
  const res = await db.execute(sql`
    SELECT id FROM email_campaign WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now() LIMIT 25
  `);
  return (res.rows as { id: string }[]).map((r) => String(r.id));
}

/* ── Campaign tracking (per-recipient logs + engagement) ──────────────── */

export type CampaignRecipientLog = {
  userId: string;
  email: string;
  name: string | null;
  status: "pending" | "sent" | "failed";
  attempts: number;
  error: string | null;
  sentAt: string | null;
};

export type CampaignEngagementRow = {
  userId: string;
  email: string;
  name: string | null;
  kind: "open" | "click";
  url: string | null;
  createdAt: string;
};

export type CampaignTracking = {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  scheduledAt: string | null;
  opens: number;
  clicks: number;
  uniqueOpens: number;
  uniqueClicks: number;
  recipients: CampaignRecipientLog[];
  engagement: CampaignEngagementRow[];
};

/**
 * Everything the Campaign Tracking drawer needs: headline counts plus the
 * per-recipient delivery log (who got it / failed / is queued) and the
 * engagement log (who opened / clicked what, when). Admin-only read.
 */
export async function getCampaignTracking(id: string): Promise<CampaignTracking | null> {
  await requireAdmin();
  const [c] = (await db.execute(sql`
    SELECT id, name, subject, status, recipient_count, sent_count, failed_count, sent_at, scheduled_at
    FROM email_campaign WHERE id = ${id} LIMIT 1
  `)).rows as Record<string, unknown>[];
  if (!c) return null;

  const [counts] = (await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE kind = 'open')  AS opens,
      count(*) FILTER (WHERE kind = 'click') AS clicks,
      count(DISTINCT user_id) FILTER (WHERE kind = 'open')  AS unique_opens,
      count(DISTINCT user_id) FILTER (WHERE kind = 'click') AS unique_clicks
    FROM email_campaign_event WHERE campaign_id = ${id}
  `)).rows as Record<string, unknown>[];

  const recipients = await db.execute(sql`
    SELECT d.user_id, d.email, d.status, COALESCE(d.attempts, 0) AS attempts, d.error, d.sent_at,
           u.name
    FROM email_campaign_delivery d
    LEFT JOIN "user" u ON u.id = d.user_id
    WHERE d.campaign_id = ${id}
    ORDER BY d.created_at DESC
    LIMIT 500
  `);

  const engagement = await db.execute(sql`
    SELECT e.user_id, e.kind, e.url, e.created_at, u.name, u.email
    FROM email_campaign_event e
    LEFT JOIN "user" u ON u.id = e.user_id
    WHERE e.campaign_id = ${id}
    ORDER BY e.created_at DESC
    LIMIT 500
  `);

  const fmt = (raw: unknown) => raw ? new Date(String(raw)).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }) : null;

  return {
    id: String(c.id),
    name: String(c.name ?? ""),
    subject: String(c.subject ?? ""),
    status: String(c.status ?? "draft") as CampaignStatus,
    recipientCount: Number(c.recipient_count ?? 0),
    sentCount: Number(c.sent_count ?? 0),
    failedCount: Number(c.failed_count ?? 0),
    sentAt: fmt(c.sent_at),
    scheduledAt: fmt(c.scheduled_at),
    opens: Number(counts?.opens ?? 0),
    clicks: Number(counts?.clicks ?? 0),
    uniqueOpens: Number(counts?.unique_opens ?? 0),
    uniqueClicks: Number(counts?.unique_clicks ?? 0),
    recipients: (recipients.rows as Record<string, unknown>[]).map((r) => ({
      userId: String(r.user_id),
      email: String(r.email ?? ""),
      name: r.name ? String(r.name) : null,
      status: (r.status as "pending" | "sent" | "failed") ?? "pending",
      attempts: Number(r.attempts ?? 0),
      error: r.error ? String(r.error) : null,
      sentAt: fmt(r.sent_at),
    })),
    engagement: (engagement.rows as Record<string, unknown>[]).map((r) => ({
      userId: String(r.user_id),
      email: r.email ? String(r.email) : "",
      name: r.name ? String(r.name) : null,
      kind: (r.kind as "open" | "click") ?? "open",
      url: r.url ? String(r.url) : null,
      createdAt: fmt(r.created_at) ?? "",
    })),
  };
}
