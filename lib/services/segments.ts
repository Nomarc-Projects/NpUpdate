"use server";

import { headers } from "next/headers";
import { sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { SEGMENT_FIELDS, type SegmentRule, type SegmentMatchMode } from "@/lib/services/segment-rules";

async function requireAdmin(): Promise<string> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "super_admin") throw new Error("Forbidden");
  return uid;
}

/**
 * Per-rule SQL. Both field and operator are resolved through SEGMENT_FIELDS and
 * never interpolated from the request — only the *value* is parameter-bound.
 * That matters here more than usual: this form's whole purpose is letting an
 * admin assemble a query, so the whitelist is the security boundary.
 * Returns null for anything unrecognised, incomplete, or non-numeric where a
 * number is required.
 */
function ruleToSql(rule: SegmentRule): SQL | null {
  const def = SEGMENT_FIELDS.find((f) => f.key === rule.field);
  if (!def || !def.operators.includes(rule.operator)) return null;
  const raw = (rule.value ?? "").trim();
  if (!raw) return null;

  if (def.kind === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (rule.field === "product_count") {
      const sub = sql`(SELECT count(*) FROM product pr JOIN company pc ON pc.id = pr.company_id WHERE pc.owner_user_id = u.id)`;
      if (rule.operator === "gt") return sql`${sub} > ${n}`;
      if (rule.operator === "lt") return sql`${sub} < ${n}`;
      return sql`${sub} = ${n}`;
    }
    if (rule.field === "days_since_signup") {
      // "more than N days since signup" = account created before now() - N days.
      if (rule.operator === "gt") return sql`u."createdAt" < now() - (${n} * interval '1 day')`;
      if (rule.operator === "lt") return sql`u."createdAt" > now() - (${n} * interval '1 day')`;
      return null;
    }
    return null;
  }

  if (rule.field === "verified") {
    return sql`COALESCE(p.verified, c.verified, false) = ${raw === "true"}`;
  }

  const column: SQL | null =
    rule.field === "user_type" ? sql`COALESCE(u.role, 'client')`
    : rule.field === "plan" ? sql`COALESCE(u.plan, 'free')`
    : rule.field === "occupation" ? sql`COALESCE(p.discipline, p.headline, '')`
    : rule.field === "industry" ? sql`COALESCE(c.industry, '')`
    : rule.field === "location" ? sql`COALESCE(p.location, c.headquarters, '')`
    : null;
  if (!column) return null;

  if (rule.operator === "contains") return sql`lower(${column}) LIKE ${"%" + raw.toLowerCase() + "%"}`;
  if (rule.operator === "is_not") return sql`lower(${column}) <> ${raw.toLowerCase()}`;
  return sql`lower(${column}) = ${raw.toLowerCase()}`;
}

/**
 * Combined WHERE for a rule set. An empty or fully-invalid rule set matches
 * NOBODY rather than everybody — the failure mode of a mis-built segment should
 * be "sent to no one", never "emailed the entire platform".
 */
function rulesWhere(rules: SegmentRule[], matchMode: SegmentMatchMode): SQL {
  const parts = rules.map(ruleToSql).filter((p): p is SQL => p !== null);
  if (parts.length === 0) return sql`false`;
  return sql.join(parts, matchMode === "any" ? sql` OR ` : sql` AND `);
}

const FROM = sql`
  FROM "user" u
  LEFT JOIN profile p ON p.user_id = u.id
  LEFT JOIN company c ON c.owner_user_id = u.id
`;

/** Live "N users match these rules" for the builder — works on unsaved rules. */
export async function countMatchingUsers(rules: SegmentRule[], matchMode: SegmentMatchMode = "all"): Promise<number> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT count(DISTINCT u.id)::int AS n ${FROM}
    WHERE u.banned IS NOT TRUE AND (${rulesWhere(rules, matchMode)})
  `);
  return Number((res.rows as { n: number }[])[0]?.n ?? 0);
}

/** Recipients for a rule set — used by a campaign at send time. */
export async function segmentRecipients(rules: SegmentRule[], matchMode: SegmentMatchMode): Promise<{ id: string; name: string; email: string }[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT DISTINCT u.id, u.name, u.email ${FROM}
    WHERE u.banned IS NOT TRUE AND u.email IS NOT NULL AND (${rulesWhere(rules, matchMode)})
  `);
  return res.rows as { id: string; name: string; email: string }[];
}

export type SegmentRow = {
  id: string;
  name: string;
  rules: SegmentRule[];
  matchMode: SegmentMatchMode;
  totalUsers: number;
  createdAt: string;
};

function parseRules(json: string): SegmentRule[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as SegmentRule[]) : [];
  } catch {
    return [];
  }
}

const fmtDate = (raw: string) =>
  raw ? new Date(raw).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "";

function toRow(r: Record<string, unknown>, totalUsers: number): SegmentRow {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    rules: parseRules(String(r.rules_json ?? "[]")),
    matchMode: (String(r.match_mode ?? "all") === "any" ? "any" : "all") as SegmentMatchMode,
    totalUsers,
    createdAt: fmtDate(r.created_at ? String(r.created_at) : ""),
  };
}

/**
 * All saved segments with a freshly counted membership. Counts are computed per
 * read rather than stored on the row, so a segment can't silently drift stale as
 * users sign up, upgrade, or get verified.
 */
export async function listSegments(): Promise<SegmentRow[]> {
  await requireAdmin();
  const res = await db.execute(sql`
    SELECT id, name, rules_json, match_mode, created_at
    FROM audience_segment ORDER BY created_at DESC LIMIT 200
  `);
  const rows = res.rows as Record<string, unknown>[];
  return Promise.all(
    rows.map(async (r) => {
      const parsed = parseRules(String(r.rules_json ?? "[]"));
      const mode = (String(r.match_mode ?? "all") === "any" ? "any" : "all") as SegmentMatchMode;
      const n = await countMatchingUsers(parsed, mode).catch(() => 0);
      return toRow(r, n);
    }),
  );
}

/** Drop rules the whitelist rejects so nothing unusable is ever persisted. */
function sanitizeRules(rules: SegmentRule[]): SegmentRule[] {
  return rules.filter((r) => ruleToSql(r) !== null);
}

export async function createSegment(input: { name: string; rules: SegmentRule[]; matchMode?: SegmentMatchMode }): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const admin = await requireAdmin();
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the segment a name." };
    const rules = sanitizeRules(input.rules);
    if (rules.length === 0) return { ok: false, error: "Add at least one complete rule." };
    const res = await db.execute(sql`
      INSERT INTO audience_segment (name, rules_json, match_mode, created_by)
      VALUES (${name}, ${JSON.stringify(rules)}, ${input.matchMode ?? "all"}, ${admin})
      RETURNING id
    `);
    revalidatePath("/admin/audience-segments");
    return { ok: true, id: String((res.rows[0] as Record<string, unknown>)?.id ?? "") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't create the segment." };
  }
}

export async function updateSegment(id: string, input: { name: string; rules: SegmentRule[]; matchMode?: SegmentMatchMode }): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the segment a name." };
    const rules = sanitizeRules(input.rules);
    if (rules.length === 0) return { ok: false, error: "Add at least one complete rule." };
    await db.execute(sql`
      UPDATE audience_segment
      SET name = ${name}, rules_json = ${JSON.stringify(rules)}, match_mode = ${input.matchMode ?? "all"}, updated_at = now()
      WHERE id = ${id}
    `);
    revalidatePath("/admin/audience-segments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't update the segment." };
  }
}

export async function duplicateSegment(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    await db.execute(sql`
      INSERT INTO audience_segment (name, rules_json, match_mode, created_by)
      SELECT name || ' (copy)', rules_json, match_mode, ${admin} FROM audience_segment WHERE id = ${id}
    `);
    revalidatePath("/admin/audience-segments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't duplicate the segment." };
  }
}

export async function deleteSegment(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    // Campaigns keep their own recipient/sent counters, so detaching costs no
    // history — it just stops them pointing at a row that no longer exists.
    await db.execute(sql`UPDATE email_campaign SET segment_id = NULL WHERE segment_id = ${id}`);
    await db.execute(sql`DELETE FROM audience_segment WHERE id = ${id}`);
    revalidatePath("/admin/audience-segments");
    revalidatePath("/admin/email-campaigns");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't delete the segment." };
  }
}
