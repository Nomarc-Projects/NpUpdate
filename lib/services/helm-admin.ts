"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUserId } from "@/lib/server-user";
import { requireAdmin } from "@/lib/authz";
import { helmConfigured, helmHealth, reindexKnowledge } from "@/lib/helm/client";
import { DISCIPLINE_LABEL } from "@/lib/helm/disciplines";
import type { HelmCitation } from "@/lib/helm/client";

/**
 * Helm admin console — read models + writes for `app/admin/helm/*`.
 *
 * Admin-only by construction: every export re-checks the session role with the
 * same guard the rest of the admin console uses (`isAdminRole`, accepting both
 * `admin` and `super_admin`), so a server action can never be replayed by a
 * non-admin even though the pages are already behind the admin layout redirect.
 *
 * All reads are wrapped so the console degrades to an empty state before
 * migration 0016 is applied, matching the repo's resilient-read convention.
 */


const currentPeriod = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const num = (v: unknown) => Number(v ?? 0) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));
const rows = async (q: ReturnType<typeof sql>) =>
  (await db.execute(q)).rows as Record<string, unknown>[];

/* ── overview / usage analytics ─────────────────────────────────────────── */

export type HelmDailyPoint = { date: string; label: string; total: number; assistant: number };
export type HelmDisciplineStat = { discipline: string; label: string; conversations: number; messages: number };
export type HelmToolStat = { tool: string; count: number };
export type HelmTopUser = { userId: string; name: string; email: string; plan: string; messages: number; latencyMs: number };

export type HelmOverview = {
  /** True when the helm_* tables aren't there yet (migration 0016 unapplied). */
  unavailable: boolean;
  period: string;
  conversations: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  groundedMessages: number;
  /** % of assistant answers backed by retrieved sources. */
  groundedRate: number;
  upvotes: number;
  downvotes: number;
  reviewQueue: number;
  /** Metered totals (all-time) from helm_usage. */
  meteredMessages: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  /** Distinct users metered this month, and anyone active in the last 30 days. */
  activeUsersPeriod: number;
  activeUsers30d: number;
  messagesThisPeriod: number;
  daily: HelmDailyPoint[];
  topDisciplines: HelmDisciplineStat[];
  topTools: HelmToolStat[];
  topUsers: HelmTopUser[];
  proposalsPending: number;
  proposalsApplied: number;
};

function emptyOverview(unavailable: boolean): HelmOverview {
  return {
    unavailable,
    period: currentPeriod(),
    conversations: 0,
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
    groundedMessages: 0,
    groundedRate: 0,
    upvotes: 0,
    downvotes: 0,
    reviewQueue: 0,
    meteredMessages: 0,
    inputTokens: 0,
    outputTokens: 0,
    avgLatencyMs: 0,
    cacheHitRate: 0,
    activeUsersPeriod: 0,
    activeUsers30d: 0,
    messagesThisPeriod: 0,
    daily: lastNDays(14).map((d) => ({ ...d, total: 0, assistant: 0 })),
    topDisciplines: [],
    topTools: [],
    topUsers: [],
    proposalsPending: 0,
    proposalsApplied: 0,
  };
}

/** The trailing `n` day buckets, oldest first — the x-axis of the volume chart. */
function lastNDays(n: number): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }
  return out;
}

export async function getHelmOverview(): Promise<HelmOverview> {
  await requireAdmin();
  const period = currentPeriod();
  try {
    const [msgAgg, usageAll, usagePeriod, convAgg, active30, dailyRows, discRows, toolRows, userRows, proposalRows] =
      await Promise.all([
        rows(sql`
          SELECT count(*) AS total,
                 COALESCE(SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END), 0) AS user_msgs,
                 COALESCE(SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END), 0) AS assistant_msgs,
                 COALESCE(SUM(CASE WHEN role = 'assistant' AND grounded = true THEN 1 ELSE 0 END), 0) AS grounded_msgs,
                 COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
                 COALESCE(SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
                 COALESCE(SUM(CASE WHEN role = 'assistant' AND (rating = -1 OR grounded = false) THEN 1 ELSE 0 END), 0) AS review_queue
          FROM helm_message
        `),
        rows(sql`
          SELECT COALESCE(SUM(message_count), 0) AS msgs,
                 COALESCE(SUM(input_tokens), 0) AS input_tokens,
                 COALESCE(SUM(output_tokens), 0) AS output_tokens,
                 COALESCE(SUM(total_latency_ms), 0) AS latency,
                 COALESCE(SUM(cache_hits), 0) AS cache_hits
          FROM helm_usage
        `),
        rows(sql`
          SELECT COALESCE(SUM(message_count), 0) AS msgs, count(DISTINCT user_id) AS users
          FROM helm_usage WHERE period = ${period}
        `),
        rows(sql`SELECT count(*) AS n FROM helm_conversation`),
        rows(sql`
          SELECT count(DISTINCT c.user_id) AS n
          FROM helm_conversation c
          JOIN helm_message m ON m.conversation_id = c.id
          WHERE m.created_at >= now() - INTERVAL '30 days'
        `),
        rows(sql`
          SELECT to_char(created_at, 'YYYY-MM-DD') AS d,
                 count(*) AS total,
                 COALESCE(SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END), 0) AS assistant
          FROM helm_message
          WHERE created_at >= now() - INTERVAL '14 days'
          GROUP BY 1 ORDER BY 1
        `),
        rows(sql`
          SELECT COALESCE(c.discipline, 'unset') AS discipline,
                 count(DISTINCT c.id) AS conversations,
                 count(m.id) AS messages
          FROM helm_conversation c
          LEFT JOIN helm_message m ON m.conversation_id = c.id
          GROUP BY 1 ORDER BY messages DESC, conversations DESC LIMIT 8
        `),
        rows(sql`
          SELECT tool, count(*) AS n FROM helm_message
          WHERE tool IS NOT NULL AND tool <> '' GROUP BY 1 ORDER BY n DESC LIMIT 6
        `),
        rows(sql`
          SELECT us.user_id, us.message_count, us.total_latency_ms,
                 u.name, u.email, COALESCE(u.plan, 'free') AS plan
          FROM helm_usage us
          LEFT JOIN "user" u ON u.id = us.user_id
          WHERE us.period = ${period}
          ORDER BY us.message_count DESC LIMIT 8
        `),
        rows(sql`
          SELECT COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
                 COALESCE(SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END), 0) AS applied
          FROM helm_proposal
        `),
      ]);

    const m = msgAgg[0] ?? {};
    const u = usageAll[0] ?? {};
    const up = usagePeriod[0] ?? {};
    const p = proposalRows[0] ?? {};

    const assistantMessages = num(m.assistant_msgs);
    const groundedMessages = num(m.grounded_msgs);
    const meteredMessages = num(u.msgs);
    const latency = num(u.latency);
    const cacheHits = num(u.cache_hits);

    const byDate = new Map(
      dailyRows.map((r) => [str(r.d), { total: num(r.total), assistant: num(r.assistant) }]),
    );

    return {
      unavailable: false,
      period,
      conversations: num(convAgg[0]?.n),
      totalMessages: num(m.total),
      userMessages: num(m.user_msgs),
      assistantMessages,
      groundedMessages,
      groundedRate: assistantMessages > 0 ? Math.round((groundedMessages / assistantMessages) * 100) : 0,
      upvotes: num(m.upvotes),
      downvotes: num(m.downvotes),
      reviewQueue: num(m.review_queue),
      meteredMessages,
      inputTokens: num(u.input_tokens),
      outputTokens: num(u.output_tokens),
      avgLatencyMs: meteredMessages > 0 ? Math.round(latency / meteredMessages) : 0,
      cacheHitRate: meteredMessages > 0 ? Math.round((cacheHits / meteredMessages) * 100) : 0,
      activeUsersPeriod: num(up.users),
      activeUsers30d: num(active30[0]?.n),
      messagesThisPeriod: num(up.msgs),
      daily: lastNDays(14).map((d) => ({
        ...d,
        total: byDate.get(d.date)?.total ?? 0,
        assistant: byDate.get(d.date)?.assistant ?? 0,
      })),
      topDisciplines: discRows.map((r) => {
        const discipline = str(r.discipline);
        return {
          discipline,
          label: discipline === "unset" ? "Not set" : (DISCIPLINE_LABEL[discipline] ?? discipline),
          conversations: num(r.conversations),
          messages: num(r.messages),
        };
      }),
      topTools: toolRows.map((r) => ({ tool: str(r.tool), count: num(r.n) })),
      topUsers: userRows.map((r) => ({
        userId: str(r.user_id),
        name: str(r.name) || "Unknown user",
        email: str(r.email),
        plan: str(r.plan) || "free",
        messages: num(r.message_count),
        latencyMs: num(r.message_count) > 0 ? Math.round(num(r.total_latency_ms) / num(r.message_count)) : 0,
      })),
      proposalsPending: num(p.pending),
      proposalsApplied: num(p.applied),
    };
  } catch {
    return emptyOverview(true);
  }
}

/* ── knowledge base ─────────────────────────────────────────────────────── */

export type HelmDocumentRow = {
  id: string;
  name: string;
  namespace: string;
  indexStatus: string;
  chunkCount: number;
  sizeBytes: number;
  mimeType: string;
  error: string | null;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
};

export type HelmKnowledgeStatus = {
  /** False when the VM env (HELM_API_URL / Access token pair) isn't set. */
  configured: boolean;
  /** Non-null only when the VM answered /health. */
  health: { ok: boolean; embeddingModel: string | null; chatProviders: string[] } | null;
  /** Set when configured but the VM couldn't be reached. */
  error: string | null;
};

/** Live VM state — never throws; an unreachable VM is reported, not raised. */
export async function getHelmKnowledgeStatus(): Promise<HelmKnowledgeStatus> {
  await requireAdmin();
  if (!helmConfigured) return { configured: false, health: null, error: null };
  try {
    const h = await helmHealth();
    return {
      configured: true,
      health: { ok: !!h.ok, embeddingModel: h.embedding_model ?? null, chatProviders: h.chat_providers ?? [] },
      error: null,
    };
  } catch (e) {
    return { configured: true, health: null, error: e instanceof Error ? e.message : "Nomabot did not respond" };
  }
}

export type HelmDocumentStats = {
  total: number;
  indexed: number;
  pending: number;
  failed: number;
  chunks: number;
  namespaces: number;
};

export async function listHelmDocuments(): Promise<{ documents: HelmDocumentRow[]; stats: HelmDocumentStats }> {
  await requireAdmin();
  const empty: HelmDocumentStats = { total: 0, indexed: 0, pending: 0, failed: 0, chunks: 0, namespaces: 0 };
  try {
    const [docRows, statRows] = await Promise.all([
      rows(sql`
        SELECT d.id, d.name, d.namespace, d.index_status, d.chunk_count, d.size_bytes,
               d.mime_type, d.error, d.created_at, u.name AS owner_name, u.email AS owner_email
        FROM helm_document d
        LEFT JOIN "user" u ON u.id = d.user_id
        ORDER BY d.created_at DESC LIMIT 300
      `),
      rows(sql`
        SELECT count(*) AS total,
               COALESCE(SUM(CASE WHEN index_status = 'indexed' THEN 1 ELSE 0 END), 0) AS indexed,
               COALESCE(SUM(CASE WHEN index_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
               COALESCE(SUM(CASE WHEN index_status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
               COALESCE(SUM(chunk_count), 0) AS chunks,
               count(DISTINCT namespace) AS namespaces
        FROM helm_document
      `),
    ]);
    const s = statRows[0] ?? {};
    return {
      documents: docRows.map((r) => ({
        id: str(r.id),
        name: str(r.name),
        namespace: str(r.namespace),
        indexStatus: str(r.index_status) || "pending",
        chunkCount: num(r.chunk_count),
        sizeBytes: num(r.size_bytes),
        mimeType: str(r.mime_type),
        error: r.error ? str(r.error) : null,
        createdAt: r.created_at ? new Date(str(r.created_at)).toISOString() : "",
        ownerName: str(r.owner_name) || "Unknown user",
        ownerEmail: str(r.owner_email),
      })),
      stats: {
        total: num(s.total),
        indexed: num(s.indexed),
        pending: num(s.pending),
        failed: num(s.failed),
        chunks: num(s.chunks),
        namespaces: num(s.namespaces),
      },
    };
  } catch {
    return { documents: [], stats: empty };
  }
}

/** Rebuild the RAG index. `namespace` empty/omitted = everything. */
export async function reindexHelmKnowledge(
  namespace?: string,
): Promise<{ ok: boolean; chunks: number; error?: string }> {
  await requireAdmin();
  if (!helmConfigured) return { ok: false, chunks: 0, error: "Nomabot is not connected yet — set HELM_API_URL and the Access token pair." };
  try {
    const res = await reindexKnowledge(namespace?.trim() || undefined);
    revalidatePath("/admin/helm/knowledge");
    return { ok: !!res.ok, chunks: Number(res.chunks_indexed ?? 0) };
  } catch (e) {
    return { ok: false, chunks: 0, error: e instanceof Error ? e.message : "Reindex failed" };
  }
}

/* ── quotas & tiers ─────────────────────────────────────────────────────── */

const PLANS = ["free", "plus", "pro", "premium"] as const;

export type HelmQuotaRow = {
  id: string;
  /** Plan default when set; null on a per-user override. */
  plan: string | null;
  userId: string | null;
  userName: string;
  userEmail: string;
  userPlan: string;
  /** null = unlimited. */
  monthlyMessages: number | null;
  priority: number;
  note: string;
  /** Messages the override's user has burned this period (0 for plan rows). */
  usedThisPeriod: number;
  updatedAt: string;
};

export async function listHelmQuotas(): Promise<{ plans: HelmQuotaRow[]; overrides: HelmQuotaRow[]; period: string }> {
  await requireAdmin();
  const period = currentPeriod();
  try {
    const qRows = await rows(sql`
      SELECT q.id, q.plan, q.user_id, q.monthly_messages, q.priority, q.note, q.updated_at,
             u.name AS user_name, u.email AS user_email, COALESCE(u.plan, 'free') AS user_plan,
             COALESCE(us.message_count, 0) AS used
      FROM helm_quota q
      LEFT JOIN "user" u ON u.id = q.user_id
      LEFT JOIN helm_usage us ON us.user_id = q.user_id AND us.period = ${period}
      ORDER BY q.priority ASC, q.created_at ASC
    `);
    const mapped: HelmQuotaRow[] = qRows.map((r) => ({
      id: str(r.id),
      plan: r.plan ? str(r.plan) : null,
      userId: r.user_id ? str(r.user_id) : null,
      userName: str(r.user_name) || "Unknown user",
      userEmail: str(r.user_email),
      userPlan: str(r.user_plan) || "free",
      monthlyMessages: r.monthly_messages == null ? null : num(r.monthly_messages),
      priority: num(r.priority),
      note: str(r.note),
      usedThisPeriod: num(r.used),
      updatedAt: r.updated_at ? new Date(str(r.updated_at)).toISOString() : "",
    }));
    return {
      plans: mapped.filter((r) => r.userId == null),
      overrides: mapped.filter((r) => r.userId != null),
      period,
    };
  } catch {
    return { plans: [], overrides: [], period };
  }
}

/**
 * Create or update an allowance row. A row is either a plan default
 * (`plan` set) or a per-user override (`userId` set) — never both.
 * `monthlyMessages: null` = unlimited.
 */
export async function saveHelmQuota(input: {
  id?: string;
  plan?: string | null;
  userId?: string | null;
  monthlyMessages: number | null;
  priority: number;
  note?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const plan = input.plan?.trim() || null;
  const userId = input.userId?.trim() || null;
  if (!input.id) {
    if (!plan && !userId) return { ok: false, error: "Pick a plan or a user." };
    if (plan && userId) return { ok: false, error: "A row is either a plan default or a user override, not both." };
    if (plan && !PLANS.includes(plan as (typeof PLANS)[number])) return { ok: false, error: `Unknown plan “${plan}”.` };
  }

  const monthly =
    input.monthlyMessages == null || Number.isNaN(input.monthlyMessages)
      ? null
      : Math.max(0, Math.floor(input.monthlyMessages));
  const priority = Number.isFinite(input.priority) ? Math.max(0, Math.floor(input.priority)) : 0;
  const note = input.note?.slice(0, 200) ?? null;

  try {
    if (input.id) {
      await db.execute(sql`
        UPDATE helm_quota
        SET monthly_messages = ${monthly}, priority = ${priority}, note = ${note}, updated_at = now()
        WHERE id = ${input.id}
      `);
    } else {
      if (userId) {
        const existing = await rows(sql`SELECT id FROM helm_quota WHERE user_id = ${userId} LIMIT 1`);
        if (existing.length > 0) return { ok: false, error: "That user already has an override — edit it instead." };
      } else if (plan) {
        const existing = await rows(sql`SELECT id FROM helm_quota WHERE plan = ${plan} AND user_id IS NULL LIMIT 1`);
        if (existing.length > 0) return { ok: false, error: `The ${plan} plan default already exists.` };
      }
      await db.execute(sql`
        INSERT INTO helm_quota (plan, user_id, monthly_messages, priority, note)
        VALUES (${plan}, ${userId}, ${monthly}, ${priority}, ${note})
      `);
    }
    revalidatePath("/admin/helm/quotas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the allowance." };
  }
}

/** Remove a per-user override. Plan defaults are protected — edit those instead. */
export async function deleteHelmQuota(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    const found = await rows(sql`SELECT user_id FROM helm_quota WHERE id = ${id} LIMIT 1`);
    if (found.length === 0) return { ok: false, error: "That allowance no longer exists." };
    if (found[0].user_id == null) return { ok: false, error: "Plan defaults can't be deleted — edit the allowance instead." };
    await db.execute(sql`DELETE FROM helm_quota WHERE id = ${id}`);
    revalidatePath("/admin/helm/quotas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the override." };
  }
}

export type HelmUserHit = { id: string; name: string; email: string; plan: string };

/** User lookup for the "add override" picker. */
export async function searchHelmUsers(query: string): Promise<HelmUserHit[]> {
  await requireAdmin();
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  try {
    const like = `%${q}%`;
    const hits = await rows(sql`
      SELECT id, name, email, COALESCE(plan, 'free') AS plan FROM "user"
      WHERE lower(name) LIKE ${like} OR lower(email) LIKE ${like}
      ORDER BY name LIMIT 8
    `);
    return hits.map((r) => ({ id: str(r.id), name: str(r.name), email: str(r.email), plan: str(r.plan) || "free" }));
  } catch {
    return [];
  }
}

/* ── answer review ──────────────────────────────────────────────────────── */

export type HelmReviewItem = {
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  discipline: string | null;
  disciplineLabel: string;
  userName: string;
  userEmail: string;
  /** The user turn immediately before the answer. */
  question: string;
  answer: string;
  citations: HelmCitation[];
  grounded: boolean;
  rating: number | null;
  tool: string | null;
  createdAt: string;
};

/**
 * Answers an admin should look at: a thumbs-down, or an answer produced
 * without any retrieved source. Both are corpus-gap signals.
 */
export async function listHelmReviewQueue(): Promise<HelmReviewItem[]> {
  await requireAdmin();
  try {
    const items = await rows(sql`
      SELECT m.id, m.content, m.citations, m.grounded, m.rating, m.tool, m.created_at,
             c.id AS conversation_id, c.title, c.discipline,
             u.name AS user_name, u.email AS user_email,
             (SELECT q.content FROM helm_message q
               WHERE q.conversation_id = c.id AND q.role = 'user' AND q.created_at <= m.created_at
               ORDER BY q.created_at DESC LIMIT 1) AS question
      FROM helm_message m
      JOIN helm_conversation c ON c.id = m.conversation_id
      LEFT JOIN "user" u ON u.id = c.user_id
      WHERE m.role = 'assistant' AND (m.rating = -1 OR grounded = false)
      ORDER BY m.created_at DESC LIMIT 200
    `);
    return items.map((r) => {
      const discipline = r.discipline ? str(r.discipline) : null;
      return {
        messageId: str(r.id),
        conversationId: str(r.conversation_id),
        conversationTitle: str(r.title) || "Untitled conversation",
        discipline,
        disciplineLabel: discipline ? (DISCIPLINE_LABEL[discipline] ?? discipline) : "Not set",
        userName: str(r.user_name) || "Unknown user",
        userEmail: str(r.user_email),
        question: str(r.question),
        answer: str(r.content),
        citations: Array.isArray(r.citations) ? (r.citations as HelmCitation[]) : [],
        grounded: r.grounded === true,
        rating: r.rating == null ? null : num(r.rating),
        tool: r.tool ? str(r.tool) : null,
        createdAt: r.created_at ? new Date(str(r.created_at)).toISOString() : "",
      };
    });
  } catch {
    return [];
  }
}

/** Just the queue size — cheap enough for the section layout's tab badge. */
export async function getHelmReviewCount(): Promise<number> {
  await requireAdmin();
  try {
    const r = await rows(sql`
      SELECT count(*) AS n FROM helm_message
      WHERE role = 'assistant' AND (rating = -1 OR grounded = false)
    `);
    return num(r[0]?.n);
  } catch {
    return 0;
  }
}

/**
 * Clear a thumbs-down after triage. Ungrounded answers keep their flag — that's
 * a property of the answer, not a report, and stays visible as a corpus gap.
 */
export async function clearHelmMessageRating(messageId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await db.execute(sql`UPDATE helm_message SET rating = NULL WHERE id = ${messageId}`);
    revalidatePath("/admin/helm/review");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not clear the rating." };
  }
}
