"use server";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { broadcastLog, emailCampaign } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { sendBulkEmails, emailLayout, siteUrl } from "@/lib/email/mailer";
import { applyShortcodes } from "@/lib/email/shortcodes";
import { getMailThroughput } from "@/lib/services/platform-settings-read";

export const QUEUE_THRESHOLD = 4000;

async function requireAdmin(): Promise<string> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "super_admin") throw new Error("Forbidden");
  return uid;
}

/**
 * This one-shot tool sends immediately, with no draft or approval step. It is
 * therefore super-admin only — otherwise it is a way straight around the
 * approval gate on email_campaign (see lib/services/campaigns.ts).
 */
async function requireSuperAdmin(): Promise<string> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  if ((session?.user as { role?: string } | undefined)?.role !== "super_admin") {
    throw new Error("Only a super admin can send a broadcast.");
  }
  return uid;
}

export type AudienceFilter = {
  role?: "professional" | "exhibitor" | "all";
  plan?: "free" | "plus" | "pro" | "premium" | "all";
  verifiedOnly?: boolean;
  /** When set, targets a single user and the role/plan/verified filters are ignored. */
  userId?: string;
  /** Non-registered recipients typed in by the admin (e.g. jane@gmail.com). */
  externalEmails?: string[];
  /** When true, the audience is EXACTLY `externalEmails` — no registered-user
   *  targeting happens at all. */
  externalOnly?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EXTERNAL = 5000;

/** Normalize a comma/newline/space-separated list of external email addresses. */
function parseExternalEmails(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (!EMAIL_RE.test(trimmed)) throw new Error(`Invalid email address: ${trimmed}`);
    const e = trimmed.toLowerCase();
    if (!seen.has(e)) {
      if (seen.size >= MAX_EXTERNAL) throw new Error(`Too many external recipients (max ${MAX_EXTERNAL}).`);
      seen.add(e);
      out.push(e);
    }
  }
  return out;
}

/** Audience conditions (no leading WHERE) for the compose form's group targets. */
const audienceConditions = (f: AudienceFilter) =>
  sql`u.banned IS NOT TRUE
      ${f.role && f.role !== "all" ? sql`AND u.role = ${f.role}` : sql``}
      ${f.plan && f.plan !== "all" ? sql`AND u.plan = ${f.plan}` : sql``}
      ${f.verifiedOnly ? sql`AND COALESCE(p.verified, c.verified, false) = true` : sql``}`;

/** FROM/JOIN/WHERE tail shared by count, recipient resolution, and the queue's
 *  delivery-ledger bulk insert — one definition so all three stay in step. */
const audienceFrom = (filter: AudienceFilter, userId?: string) =>
  sql`FROM "user" u
      LEFT JOIN profile p ON p.user_id = u.id
      LEFT JOIN company c ON c.owner_user_id = u.id
      WHERE ${userId ? sql`u.id = ${userId}` : audienceConditions(filter)}`;

/** Resolve the recipients for a send. When a single user is targeted (`userId`)
 *  only that user matches; otherwise the audience filter is applied. */
async function matchingRecipients(filter: AudienceFilter, userId?: string): Promise<{ id: string; name: string; email: string }[]> {
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email
    ${audienceFrom(filter, userId)}
  `);
  return (res.rows as { id: string; name: string; email: string }[]);
}

/** Search matching users (by name/email) for the single-recipient picker. */
export async function searchUsers(query: string): Promise<{ id: string; name: string; email: string }[]> {
  await requireAdmin();
  const q = `%${query.toLowerCase().trim()}%`;
  if (!query.trim()) return [];
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email
    FROM "user" u
    WHERE lower(u.name) LIKE ${q} OR lower(u.email) LIKE ${q}
    ORDER BY u."createdAt" DESC LIMIT 25
  `);
  return (res.rows as { id: string; name: string; email: string }[]);
}

/**
 * Live recipient count for the compose form's audience preview. When a single
 * user is targeted (`userId`), the count reflects just that user.
 */
export async function getAudienceCount(filter: AudienceFilter, userId?: string): Promise<number> {
  await requireAdmin();
  // External-only sends have exactly as many recipients as valid addresses typed.
  if (filter.externalOnly) return filter.externalEmails?.length ?? 0;
  const rows = await matchingRecipients(filter, userId);
  return rows.length + (filter.externalEmails?.length ?? 0);
}

export type BroadcastLogEntry = {
  id: string;
  subject: string;
  filter: AudienceFilter;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  /** Present when the broadcast was enqueued to the delivery ledger. */
  queued?: boolean;
  /** Queued campaign still draining at render time. */
  active?: boolean;
  recipientCount?: number;
};

export async function listBroadcasts(): Promise<BroadcastLogEntry[]> {
  await requireAdmin();
  const rows = await db.select().from(broadcastLog).orderBy(broadcastLog.createdAt);
  const entries: BroadcastLogEntry[] = rows
    .slice()
    .reverse()
    .map((r) => ({
      id: r.id,
      subject: r.subject,
      filter: JSON.parse(r.filterJson) as AudienceFilter,
      sentCount: r.sentCount ?? 0,
      failedCount: r.failedCount ?? 0,
      createdAt: new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }),
    }));

  // Queued broadcasts log 0/0 at enqueue time; the interesting numbers live in
  // the campaign's delivery ledger. Enrich from there so history shows live
  // progress while the drain works and the true totals once it finishes.
  await Promise.all(
    entries.map(async (e) => {
      const campaignId = (e.filter as { campaignId?: string }).campaignId;
      if (!campaignId) return;
      const res = await db.execute(sql`
        SELECT status, recipient_count::int, sent_count::int, failed_count::int
        FROM email_campaign WHERE id = ${campaignId} LIMIT 1
      `);
      const c = res.rows[0] as { status: string; recipient_count: number; sent_count: number; failed_count: number } | undefined;
      if (!c) return;
      e.queued = true;
      e.active = c.status === "sending";
      e.recipientCount = c.recipient_count;
      e.sentCount = c.sent_count;
      e.failedCount = c.failed_count;
    }),
  );

  return entries;
}

const chunk = <T,>(arr: T[], size: number): T[][] => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resend's batch endpoint accepts up to 100 messages per call. */
const BULK_BATCH = 100;

/**
 * One-shot broadcast. A tiny registered audience (or an external/mixed send)
 * goes out immediately through Resend's BULK endpoint — one round-trip per 100
 * recipients, which finishes a few thousand inside a single request. A large
 * registered audience (over `QUEUE_THRESHOLD`) is instead enqueued as a
 * campaign with a per-recipient delivery ledger, so the /api/email/drain ticker
 * delivers 30k+ progressively and survives request timeouts — a blast that big
 * cannot fit in one function window.
 *
 * If Resend isn't configured, sendBulkEmails() itself no-ops per recipient
 * (consistent with how every other transactional email in this app already
 * behaves); the caller should check isEmailConfigured to warn the admin
 * beforehand.
 */
export async function sendBroadcast(input: { subject: string; bodyHtml: string; filter: AudienceFilter }): Promise<{
  sentCount: number;
  failedCount: number;
  queued?: boolean;
  campaignId?: string;
  recipientCount?: number;
}> {
  const admin = await requireSuperAdmin();
  if (!input.subject.trim()) throw new Error("Subject is required");
  if (!input.bodyHtml.trim()) throw new Error("Message body is required");

  // External addresses are validated here too — the composer's hint is a preview,
  // not a gate, and sendBroadcast is callable directly.
  const external = parseExternalEmails((input.filter.externalEmails ?? []).join(" "));
  if (input.filter.externalOnly && external.length === 0) {
    throw new Error("External-only sends need at least one email address.");
  }

  // External-only sends go nowhere near the user table — the typed addresses
  // ARE the audience. Mixed sends keep the sync path too: their external list is
  // already capped and the ledger only knows registered user rows.
  const recipientRows = input.filter.externalOnly ? [] : await matchingRecipients(input.filter, input.filter.userId);

  // Large registered-only audience → durable queue. The drain handles every
  // delivery ledger write in idempotent slices, so nothing here can time out.
  if (!input.filter.externalOnly && !input.filter.userId && recipientRows.length > QUEUE_THRESHOLD) {
    const queued = await enqueueRegisteredBroadcast(input, admin, recipientRows);
    revalidatePath("/admin/broadcasts");
    return { sentCount: 0, failedCount: 0, queued: true, campaignId: queued.campaignId, recipientCount: queued.recipientCount };
  }

  const recipients: { id: string; name: string | null; email: string }[] = [
    ...recipientRows,
    // External recipients have no account: merge tags fall back to their defaults.
    ...external.map((email) => ({ id: "", name: null, email })),
  ];
  let sentCount = 0;
  let failedCount = 0;

  const baseUrl = siteUrl();
  const bulk = recipients.map((r) => ({
    to: r.email,
    subject: input.subject,
    html: emailLayout({
      heading: input.subject,
      body: applyShortcodes(input.bodyHtml, r, { baseUrl }),
    }),
  }));

  for (const batch of chunk(bulk, BULK_BATCH)) {
    const results = await sendBulkEmails(batch);
    for (const res of results) {
      if (res.error) failedCount++;
      else sentCount++;
    }
    if (recipients.length > BULK_BATCH) await sleep(150);
  }

  await db.insert(broadcastLog).values({
    subject: input.subject,
    filterJson: JSON.stringify(input.filter),
    sentCount,
    failedCount,
    sentBy: admin,
  });
  revalidatePath("/admin/broadcasts");
  return { sentCount, failedCount };
}

/**
 * Enqueue a large registered audience as a campaign in the delivery ledger.
 *
 * One `email_campaign` row (status 'sending') + one `email_campaign_delivery`
 * row per recipient, written in a single statement. The existing drain ticker
 * picks the campaign up by status and sends whatever its rate ceiling allows
 * per tick. Idempotent by construction: a campaign re-read mid-drain only ever
 * moves PENDING rows, so a crash cannot double-mail anyone.
 */
async function enqueueRegisteredBroadcast(
  input: { subject: string; bodyHtml: string; filter: AudienceFilter },
  admin: string,
  recipients: { id: string; name: string; email: string }[],
): Promise<{ campaignId: string; recipientCount: number }> {
  const [created] = await db
    .insert(emailCampaign)
    .values({
      name: input.subject,
      audienceKey: "all_users",
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      status: "sending",
      recipientCount: recipients.length,
      createdBy: admin,
    })
    .returning({ id: emailCampaign.id });
  const campaignId = created.id;

  await db.execute(sql`
    INSERT INTO email_campaign_delivery (campaign_id, user_id, email)
    SELECT ${campaignId}::text, u.id, u.email
    FROM "user" u
    LEFT JOIN profile p ON p.user_id = u.id
    LEFT JOIN company c ON c.owner_user_id = u.id
    WHERE u.id = ANY(${recipients.map((r) => r.id)}::text[])
  `);

  const { emailsPerHour } = await getMailThroughput();
  await db.insert(broadcastLog).values({
    subject: input.subject,
    filterJson: JSON.stringify({
      ...input.filter,
      campaignId,
      queued: true,
      queueRatePerHour: emailsPerHour,
    }),
    sentCount: 0,
    failedCount: 0,
    sentBy: admin,
  });

  return { campaignId, recipientCount: recipients.length };
}
