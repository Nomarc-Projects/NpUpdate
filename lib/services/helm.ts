"use server";

import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { helmConversation, helmDocument, helmMessage, helmQuota, helmUsage } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { PLAN_RANK, type Plan } from "@/lib/entitlements";
import type { HelmCitation } from "@/lib/helm/client";

/**
 * Helm persistence + fair-use metering.
 *
 * Every read and write is ownership-checked against the calling user — a
 * conversation id alone is never enough to reach a thread. New-table queries are
 * wrapped so the UI degrades to an empty state before migration 0016 is applied,
 * per the repo's resilient-read convention.
 */

export type HelmConversationRow = {
  id: string;
  title: string;
  discipline: string | null;
  projectId: string | null;
  updatedAt: string;
};

export type HelmMessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: HelmCitation[];
  tool: string | null;
  toolResult: Record<string, unknown> | null;
  grounded: boolean;
  rating: number | null;
  createdAt: string;
};

/* ── conversations ──────────────────────────────────────────────────────── */

/** Threads for the history rail, newest first. `query` filters by title. */
export async function listConversations(query?: string): Promise<HelmConversationRow[]> {
  try {
    const userId = await requireUserId();
    const where = query?.trim()
      ? and(eq(helmConversation.userId, userId), eq(helmConversation.archived, false),
          ilike(helmConversation.title, `%${query.trim()}%`))
      : and(eq(helmConversation.userId, userId), eq(helmConversation.archived, false));

    const rows = await db
      .select({
        id: helmConversation.id,
        title: helmConversation.title,
        discipline: helmConversation.discipline,
        projectId: helmConversation.projectId,
        updatedAt: helmConversation.updatedAt,
      })
      .from(helmConversation)
      .where(where)
      .orderBy(desc(helmConversation.updatedAt))
      .limit(100);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      discipline: r.discipline,
      projectId: r.projectId,
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Full thread, or null when it doesn't exist or isn't the caller's. */
export async function getConversation(
  conversationId: string,
): Promise<{ conversation: HelmConversationRow; messages: HelmMessageRow[] } | null> {
  try {
    const userId = await requireUserId();
    const [conv] = await db
      .select()
      .from(helmConversation)
      .where(and(eq(helmConversation.id, conversationId), eq(helmConversation.userId, userId)))
      .limit(1);
    if (!conv) return null;

    const msgs = await db
      .select()
      .from(helmMessage)
      .where(eq(helmMessage.conversationId, conversationId))
      .orderBy(helmMessage.createdAt);

    return {
      conversation: {
        id: conv.id,
        title: conv.title,
        discipline: conv.discipline,
        projectId: conv.projectId,
        updatedAt: conv.updatedAt.toISOString(),
      },
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        citations: (m.citations as HelmCitation[] | null) ?? [],
        tool: m.tool,
        toolResult: (m.toolResult as Record<string, unknown> | null) ?? null,
        grounded: !!m.grounded,
        rating: m.rating,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  } catch {
    return null;
  }
}

/** Start a thread. Title is derived from the first message by the caller. */
export async function createConversation(input: {
  title?: string;
  discipline?: string | null;
  projectId?: string | null;
}): Promise<{ id: string } | null> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .insert(helmConversation)
      .values({
        userId,
        title: (input.title ?? "New conversation").slice(0, 120),
        discipline: input.discipline ?? null,
        projectId: input.projectId ?? null,
      })
      .returning({ id: helmConversation.id });
    return row ? { id: row.id } : null;
  } catch {
    return null;
  }
}

/** Append a turn and bump the thread's updatedAt so it sorts to the top. */
export async function appendMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations?: HelmCitation[];
  tool?: string | null;
  toolResult?: Record<string, unknown> | null;
  grounded?: boolean;
}): Promise<{ id: string } | null> {
  try {
    const userId = await requireUserId();
    // Ownership gate: refuse to write into someone else's thread.
    const [conv] = await db
      .select({ id: helmConversation.id })
      .from(helmConversation)
      .where(and(eq(helmConversation.id, input.conversationId), eq(helmConversation.userId, userId)))
      .limit(1);
    if (!conv) return null;

    const [row] = await db
      .insert(helmMessage)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        citations: input.citations ?? [],
        tool: input.tool ?? null,
        toolResult: input.toolResult ?? null,
        grounded: input.grounded ?? false,
      })
      .returning({ id: helmMessage.id });

    await db
      .update(helmConversation)
      .set({ updatedAt: new Date() })
      .where(eq(helmConversation.id, input.conversationId));

    return row ? { id: row.id } : null;
  } catch {
    return null;
  }
}

export async function renameConversation(conversationId: string, title: string): Promise<boolean> {
  try {
    const userId = await requireUserId();
    await db
      .update(helmConversation)
      .set({ title: title.slice(0, 120), updatedAt: new Date() })
      .where(and(eq(helmConversation.id, conversationId), eq(helmConversation.userId, userId)));
    return true;
  } catch {
    return false;
  }
}

/** Soft delete — archived threads drop out of the rail but stay auditable. */
export async function archiveConversation(conversationId: string): Promise<boolean> {
  try {
    const userId = await requireUserId();
    await db
      .update(helmConversation)
      .set({ archived: true, updatedAt: new Date() })
      .where(and(eq(helmConversation.id, conversationId), eq(helmConversation.userId, userId)));
    return true;
  } catch {
    return false;
  }
}

/** Thumbs up/down on an assistant turn — feeds the admin answer-review queue. */
export async function rateMessage(messageId: string, rating: 1 | -1 | null): Promise<boolean> {
  try {
    const userId = await requireUserId();
    // Only rate a message inside one of the caller's own threads.
    const [own] = await db
      .select({ id: helmMessage.id })
      .from(helmMessage)
      .innerJoin(helmConversation, eq(helmMessage.conversationId, helmConversation.id))
      .where(and(eq(helmMessage.id, messageId), eq(helmConversation.userId, userId)))
      .limit(1);
    if (!own) return false;
    await db.update(helmMessage).set({ rating }).where(eq(helmMessage.id, messageId));
    return true;
  } catch {
    return false;
  }
}

/* ── private documents ──────────────────────────────────────────────────── */

export type HelmDocumentRow = {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  indexStatus: string;
  chunkCount: number;
  createdAt: string;
};

/** Register an uploaded document (bytes already in the private R2 bucket). */
export async function registerDocument(input: {
  name: string;
  storageKey: string;
  mimeType?: string;
  sizeBytes?: number;
  projectId?: string | null;
}): Promise<{ id: string; namespace: string } | null> {
  try {
    const userId = await requireUserId();
    const namespace = input.projectId ? `project:${input.projectId}` : `user:${userId}`;
    const [row] = await db
      .insert(helmDocument)
      .values({
        userId,
        name: input.name.slice(0, 200),
        storageKey: input.storageKey,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        namespace,
        indexStatus: "pending",
      })
      .returning({ id: helmDocument.id });
    return row ? { id: row.id, namespace } : null;
  } catch {
    return null;
  }
}

export async function listDocuments(): Promise<HelmDocumentRow[]> {
  try {
    const userId = await requireUserId();
    const rows = await db
      .select()
      .from(helmDocument)
      .where(eq(helmDocument.userId, userId))
      .orderBy(desc(helmDocument.createdAt))
      .limit(100);
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      indexStatus: d.indexStatus,
      chunkCount: d.chunkCount ?? 0,
      createdAt: d.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Update a document's index status after the VM reports back. */
export async function setDocumentStatus(
  documentId: string,
  status: "pending" | "indexed" | "failed",
  meta?: { chunkCount?: number; error?: string },
): Promise<boolean> {
  try {
    const userId = await requireUserId();
    await db
      .update(helmDocument)
      .set({ indexStatus: status, chunkCount: meta?.chunkCount ?? undefined, error: meta?.error ?? null, updatedAt: new Date() })
      .where(and(eq(helmDocument.id, documentId), eq(helmDocument.userId, userId)));
    return true;
  } catch {
    return false;
  }
}

/** Fetch a document the caller owns (for storage-key resolution / deletes). */
export async function getOwnedDocument(
  documentId: string,
): Promise<{ id: string; storageKey: string; namespace: string } | null> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .select({ id: helmDocument.id, storageKey: helmDocument.storageKey, namespace: helmDocument.namespace })
      .from(helmDocument)
      .where(and(eq(helmDocument.id, documentId), eq(helmDocument.userId, userId)))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    const userId = await requireUserId();
    await db.delete(helmDocument).where(and(eq(helmDocument.id, documentId), eq(helmDocument.userId, userId)));
    return true;
  } catch {
    return false;
  }
}

/* ── fair use: usage meter + quota resolution ───────────────────────────── */

export type HelmQuotaState = {
  /** null = unlimited. */
  monthlyMessages: number | null;
  used: number;
  remaining: number | null;
  priority: number;
  period: string;
};

const currentPeriod = () => new Date().toISOString().slice(0, 7); // YYYY-MM

/**
 * Resolve the caller's allowance: a per-user override wins over the plan
 * default. Falls back to a conservative Plus-level allowance if the quota rows
 * haven't been seeded yet, so the feature stays usable pre-migration.
 */
export async function getQuotaState(plan: Plan): Promise<HelmQuotaState> {
  const period = currentPeriod();
  const fallback: HelmQuotaState = {
    monthlyMessages: PLAN_RANK[plan] >= PLAN_RANK.premium ? null : 150,
    used: 0,
    remaining: PLAN_RANK[plan] >= PLAN_RANK.premium ? null : 150,
    priority: PLAN_RANK[plan],
    period,
  };
  try {
    const userId = await requireUserId();

    const [override] = await db
      .select()
      .from(helmQuota)
      .where(eq(helmQuota.userId, userId))
      .limit(1);
    const [planDefault] = override
      ? [undefined]
      : await db
          .select()
          .from(helmQuota)
          .where(and(eq(helmQuota.plan, plan), sql`${helmQuota.userId} IS NULL`))
          .limit(1);

    const row = override ?? planDefault;
    const monthlyMessages = row ? row.monthlyMessages : fallback.monthlyMessages;
    const priority = row?.priority ?? PLAN_RANK[plan];

    const [usage] = await db
      .select({ used: helmUsage.messageCount })
      .from(helmUsage)
      .where(and(eq(helmUsage.userId, userId), eq(helmUsage.period, period)))
      .limit(1);

    const used = usage?.used ?? 0;
    return {
      monthlyMessages,
      used,
      remaining: monthlyMessages === null ? null : Math.max(0, monthlyMessages - used),
      priority,
      period,
    };
  } catch {
    return fallback;
  }
}

/** True when the caller still has allowance left this period. */
export async function hasAllowance(plan: Plan): Promise<boolean> {
  const state = await getQuotaState(plan);
  return state.remaining === null || state.remaining > 0;
}

/**
 * Record one Helm exchange against this month's meter. Upserts the period row.
 * Never throws — metering must not be able to break a reply.
 */
export async function recordUsage(input: {
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  cacheHit?: boolean;
}): Promise<void> {
  try {
    const userId = await requireUserId();
    const period = currentPeriod();
    await db
      .insert(helmUsage)
      .values({
        userId,
        period,
        messageCount: 1,
        inputTokens: input.inputTokens ?? 0,
        outputTokens: input.outputTokens ?? 0,
        totalLatencyMs: input.latencyMs ?? 0,
        cacheHits: input.cacheHit ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [helmUsage.userId, helmUsage.period],
        set: {
          messageCount: sql`${helmUsage.messageCount} + 1`,
          inputTokens: sql`${helmUsage.inputTokens} + ${input.inputTokens ?? 0}`,
          outputTokens: sql`${helmUsage.outputTokens} + ${input.outputTokens ?? 0}`,
          totalLatencyMs: sql`${helmUsage.totalLatencyMs} + ${input.latencyMs ?? 0}`,
          cacheHits: sql`${helmUsage.cacheHits} + ${input.cacheHit ? 1 : 0}`,
          updatedAt: new Date(),
        },
      });
  } catch {
    // metering is best-effort
  }
}
