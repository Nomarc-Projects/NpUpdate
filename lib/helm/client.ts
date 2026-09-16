import "server-only";

/**
 * Helm — server-only client for the self-hosted AI brain on the Nomarc OCI VM.
 *
 * The VM service is never publicly exposed: it binds to loopback and the
 * Cloudflare Tunnel is its sole ingress. This client authenticates to the origin
 * with a shared-secret bearer token (`HELM_INTERNAL_TOKEN`) that only the server
 * holds; a Cloudflare Access service token can be layered on for defense in
 * depth (sent when configured). Only server code (route handlers / server
 * actions) may import this — never a client component.
 *
 * Graceful degrade: when the Helm env is unset, {@link helmConfigured} is false
 * and callers must fall back to the gate/coming-soon UI instead of calling in.
 * Every call still hard-throws if invoked while unconfigured, so a missed guard
 * fails loudly in dev rather than silently hanging.
 */

const API_URL = process.env.HELM_API_URL;
const INTERNAL_TOKEN = process.env.HELM_INTERNAL_TOKEN;
// Optional Cloudflare Access layer (defense in depth) — sent only when both set.
const ACCESS_CLIENT_ID = process.env.HELM_ACCESS_CLIENT_ID;
const ACCESS_CLIENT_SECRET = process.env.HELM_ACCESS_CLIENT_SECRET;

/** True only when the VM brain is reachable. Guard every call site with this. */
export const helmConfigured = !!(API_URL && INTERNAL_TOKEN);

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set — cannot reach Helm`);
  return value;
}

async function helm<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) ?? {}),
    Authorization: `Bearer ${requireEnv("HELM_INTERNAL_TOKEN", INTERNAL_TOKEN)}`,
  };
  if (ACCESS_CLIENT_ID && ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = ACCESS_CLIENT_SECRET;
  }
  const res = await fetch(new URL(path, requireEnv("HELM_API_URL", API_URL)), {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Helm ${path} → ${res.status} ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as T;
}

/* ── Shared contract (mirrors the backend helm.ai.assistant ChatResult) ── */

/** A retrieved source backing an answer, surfaced as a citation chip. */
export type HelmCitation = {
  ref: string;
  title: string;
  namespace: "corpus" | "user" | "project";
  snippet?: string;
};

/** A confirm-gated WRITE the backend proposes but never executes itself. */
export type HelmProposal = {
  tool: string;
  action: string;
  params: Record<string, unknown>;
  summary: string;
  ready: boolean;
};

/** Top-level assistant reply. Reads return data; writes return a proposal only. */
export type HelmChatResult = {
  answer: string;
  citations: HelmCitation[];
  tool: string;
  routed_by: string;
  can_answer: boolean;
  grounded: boolean;
  tool_result: Record<string, unknown> | null;
  proposal: HelmProposal | null;
};

export type HelmChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Consultant chat. `discipline` selects the persona/retrieval filter (defaults
 * to the professional's profile discipline server-side). `projectId` scopes
 * retrieval + tools to a live project when the copilot is opened in context.
 */
export function helmChat(input: {
  message: string;
  history?: HelmChatTurn[];
  userId: string;
  discipline?: string | null;
  projectId?: string | null;
  documentIds?: string[];
}): Promise<HelmChatResult> {
  return helm("/consultant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      history: input.history ?? [],
      user_id: input.userId,
      discipline: input.discipline ?? null,
      project_id: input.projectId ?? null,
      document_ids: input.documentIds ?? [],
    }),
  });
}

/** Lightweight reply for Helm on the public site (ungated, no memory). */
export type GuideChatResult = {
  answer: string;
  citations: HelmCitation[];
  /** Optional deep-link the assistant suggests (e.g. the directory or a plan). */
  navigate: { href: string; label: string } | null;
};

/**
 * Helm (public) — the site assistant. Grounded on a small curated platform
 * knowledge base; general chat + soft CTAs. No per-user memory (conversation
 * history is passed in per request and never persisted).
 */
export function guideChat(input: {
  message: string;
  history?: HelmChatTurn[];
}): Promise<GuideChatResult> {
  return helm("/guide/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: input.message, history: input.history ?? [] }),
  });
}

/** Reindex the RAG store after a knowledge-base change (admin only). */
export function reindexKnowledge(namespace?: string): Promise<{ ok: boolean; chunks_indexed: number }> {
  const qs = namespace ? `?namespace=${encodeURIComponent(namespace)}` : "";
  return helm(`/knowledge/reindex${qs}`, { method: "POST" });
}

/**
 * Queue a private document for indexing into its owner's namespace. The VM
 * extracts text, chunks, embeds and upserts under `user:{id}` (or `project:{id}`)
 * — so it can never surface for another user. Images return `needs_vision` and
 * are analysed at question time instead of indexed.
 */
export function ingestDocument(input: {
  documentId: string;
  userId: string;
  filename: string;
  mime: string;
  contentB64: string;
  projectId?: string | null;
  disciplines?: string[];
}): Promise<{ ok: boolean; queued: boolean; reason?: string }> {
  return helm("/documents/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: input.documentId,
      user_id: input.userId,
      filename: input.filename,
      mime: input.mime,
      content_b64: input.contentB64,
      project_id: input.projectId ?? null,
      disciplines: input.disciplines ?? [],
    }),
  });
}

/** Remove a document's chunks from the RAG store (the erasure half of privacy). */
export function forgetDocument(input: {
  documentId: string;
  userId: string;
  projectId?: string | null;
}): Promise<{ ok: boolean; deleted: number }> {
  return helm("/documents/forget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: input.documentId,
      user_id: input.userId,
      project_id: input.projectId ?? null,
    }),
  });
}

/** Liveness + which providers/models the VM currently has configured. */
export function helmHealth(): Promise<{
  ok: boolean;
  embedding_model: string | null;
  chat_providers: string[];
}> {
  return helm("/health");
}
