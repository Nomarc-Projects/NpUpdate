import "server-only";

import { helmChat as vmHelmChat, guideChat as vmGuideChat, helmConfigured } from "./client";
import { answerConsultant, answerGuide } from "./assistant-local";
import { localConfigured } from "./provider";
import type { HelmChatResult, HelmChatTurn, GuideChatResult } from "./client";

/**
 * Backend selection for Helm.
 *
 * The assistant has two interchangeable implementations behind one contract:
 *
 *   vm    — the self-hosted Python service on the OCI VM. Full RAG (pgvector
 *           over the user's own and project's uploaded documents), the semantic
 *           router, the proposal contract. Reached over a Cloudflare Tunnel.
 *   local — a direct call to a hosted OpenAI-compatible provider from this app,
 *           retrieving lexically over the corpora in lib/data. No private
 *           document index, no embeddings.
 *
 * HELM_BACKEND picks explicitly: `vm` or `local`. Unset (the default) is `auto`,
 * which prefers the VM when it is configured and falls back to local. So the
 * assistant works before the VM exists, and the VM takes over the moment it is
 * wired up — without a code change either way.
 *
 * Document ingest/forget/reindex are NOT in here: they have no local
 * equivalent, so they stay on the VM client and callers must keep checking
 * `helmConfigured` before using them.
 */

export type HelmBackend = "vm" | "local" | "auto";

/** Re-exported so callers get the whole assistant surface from one import. */
export type { HelmChatResult, HelmChatTurn, GuideChatResult } from "./client";

function configuredBackend(): Exclude<HelmBackend, "auto"> {
  const raw = (process.env.HELM_BACKEND ?? "auto").trim().toLowerCase();
  if (raw === "vm") return "vm";
  if (raw === "local") return "local";
  return helmConfigured ? "vm" : "local";
}

/** Which backend a call would use right now. For logs and /health-style
 *  reporting — the choice is per-call, so nothing is cached. */
export function activeBackend(): Exclude<HelmBackend, "auto"> {
  return configuredBackend();
}

/**
 * True when the assistant can answer at all, on either backend. Callers gate on
 * this instead of `helmConfigured`, which only knows about the VM.
 */
export function helmAvailable(): boolean {
  const backend = configuredBackend();
  return backend === "vm" ? helmConfigured : localConfigured();
}

/**
 * Consultant chat. Returns the same shape from either backend, so the UI cannot
 * tell which one answered.
 */
export async function helmChat(input: {
  message: string;
  history?: HelmChatTurn[];
  userId: string;
  discipline?: string | null;
  projectId?: string | null;
  documentIds?: string[];
}): Promise<HelmChatResult> {
  if (configuredBackend() === "vm") {
    return vmHelmChat(input);
  }
  // `userId` and `documentIds` have no local meaning: without the store there is
  // no per-user namespace, so a turn is grounded on the public corpus at best.
  return answerConsultant({
    message: input.message,
    history: input.history,
    discipline: input.discipline ?? null,
    projectId: input.projectId ?? null,
  });
}

/** Public site assistant. Un gated, no memory, same shape from either backend. */
export async function guideChat(input: {
  message: string;
  history?: HelmChatTurn[];
}): Promise<GuideChatResult> {
  if (configuredBackend() === "vm") {
    return vmGuideChat(input);
  }
  return answerGuide({ message: input.message, history: input.history });
}
