"use server";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { broadcastLog } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email/mailer";
import { applyShortcodes } from "@/lib/email/shortcodes";

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
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EXTERNAL = 500;

/** Normalize a comma/newline/space-separated list of external email addresses. */
export function parseExternalEmails(raw: string): string[] {
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

/**
 * Resolve the recipients for a send. When a single user is targeted (`userId`)
 * only that user matches; otherwise the audience filter is applied.
 */
async function matchingRecipients(filter: AudienceFilter, userId?: string): Promise<{ id: string; name: string; email: string }[]> {
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email
    FROM "user" u
    LEFT JOIN profile p ON p.user_id = u.id
    LEFT JOIN company c ON c.owner_user_id = u.id
    WHERE ${userId ? sql`u.id = ${userId}` : audienceConditions(filter)}
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
};

export async function listBroadcasts(): Promise<BroadcastLogEntry[]> {
  await requireAdmin();
  const rows = await db.select().from(broadcastLog).orderBy(broadcastLog.createdAt);
  return rows
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
}

const CHUNK_SIZE = 20;
const chunk = <T,>(arr: T[], size: number): T[][] => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simple V1: composes one email, resolves the matching audience, and sends
 * in small chunks through the existing Resend mailer — no queue/worker. If
 * Resend isn't configured, sendEmail() itself no-ops per recipient (consistent
 * with how every other transactional email in this app already behaves);
 * the caller should check isEmailConfigured to warn the admin beforehand.
 */
export async function sendBroadcast(input: { subject: string; bodyHtml: string; filter: AudienceFilter }): Promise<{ sentCount: number; failedCount: number }> {
  const admin = await requireSuperAdmin();
  if (!input.subject.trim()) throw new Error("Subject is required");
  if (!input.bodyHtml.trim()) throw new Error("Message body is required");

  // External addresses are validated here too — the composer's hint is a preview,
  // not a gate, and sendBroadcast is callable directly.
  const external = parseExternalEmails((input.filter.externalEmails ?? []).join(" "));

  const recipientRows = await matchingRecipients(input.filter, input.filter.userId);
  const recipients: { id: string; name: string | null; email: string }[] = [
    ...recipientRows,
    // External recipients have no account: merge tags fall back to their defaults.
    ...external.map((email) => ({ id: "", name: null, email })),
  ];
  let sentCount = 0;
  let failedCount = 0;

  const baseUrl = siteUrl();

  for (const batch of chunk(recipients, CHUNK_SIZE)) {
    const results = await Promise.allSettled(
      batch.map((r) =>
        sendEmail({
          to: r.email,
          subject: input.subject,
          // Merge tags are resolved per recipient. Without this the composer's
          // toolbar tokens ship as literal "{{first_name}}" text.
          html: emailLayout({
            heading: input.subject,
            body: applyShortcodes(input.bodyHtml, r, { baseUrl }),
          }),
        }),
      ),
    );
    for (const res of results) {
      if (res.status === "fulfilled") sentCount++;
      else failedCount++;
    }
    if (recipients.length > CHUNK_SIZE) await sleep(300);
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
