import "server-only";

import { generate } from "./provider";
import { citations, formatContext, search, type LocalRetrieved } from "./local-retrieval";
import type { HelmChatResult, HelmChatTurn, HelmCitation, HelmProposal } from "./client";

/**
 * Helm assistant, local backend — a TypeScript port of
 * `helm/src/helm/assistant.py`.
 *
 * Everything the VM version does is here: discipline-adaptive system prompts,
 * the grounded/ungrounded contract, the write-intent router, the confirm-gated
 * proposal builder, and citation assembly. The only difference is retrieval —
 * lexical over the in-repo corpora instead of pgvector (see local-retrieval.ts).
 *
 * Ported verbatim where behaviour matters (prompt wording, action names, the
 * `pm.<action>` dispatch keys, the YYYY-MM-DD due-date filter). The frontend
 * applies proposals in lib/services/helm-proposals.ts, so those keys are a
 * contract, not a detail.
 */

/** Discipline → framing clause. Values match lib/helm/disciplines.ts and
 *  DISCIPLINE_FRAMING in assistant.py. */
const DISCIPLINE_FRAMING: Record<string, string> = {
  architecture: "an architect — frame around design intent, spatial planning, approvals and buildability",
  structural: "a structural engineer — frame around loads, load paths, codes and structural safety",
  mep: "an MEP/services engineer — frame around mechanical, electrical and plumbing coordination",
  quantity_surveying: "a quantity surveyor — frame around measurement, cost, procurement and contracts",
  project_management:
    "a construction project manager — frame around programme, resourcing, risk and delivery",
  building: "a builder — frame around site execution, methods, workmanship and supervision",
  surveying: "a land surveyor — frame around setting out, levels, boundaries and site measurement",
};

const DEFAULT_FRAMING = "a construction professional — give practical, discipline-aware guidance";

const CONSULTANT_UNAVAILABLE =
  "Helm isn't reachable right now. Please try again shortly — if this persists, the consultant service may be undergoing maintenance.";

const GUIDE_UNAVAILABLE = "The assistant is offline for a moment — please try again shortly.";

function consultantSystem(discipline: string | null, grounded: boolean): string {
  const framing = DISCIPLINE_FRAMING[(discipline ?? "").toLowerCase()] ?? DEFAULT_FRAMING;
  const base =
    "You are Helm, an expert AI consultant for professionals in Nigeria's construction industry. " +
    `You are advising ${framing}. Be precise, practical and honest. Keep answers focused and actionable.`;
  if (grounded) {
    return (
      base +
      " Base your answer on the SOURCES below. Prefer them over your own knowledge, and if the sources " +
      "don't cover the question, say what you do and don't know rather than guessing. Do not invent " +
      "codes, clauses, rates or figures."
    );
  }
  return (
    base +
    " You have no retrieved sources for this question. Answer from general professional knowledge, but " +
    "be explicit that this is general guidance and flag anything the professional should verify against " +
    "the actual code, contract or rate for their project."
  );
}

const GUIDE_SYSTEM =
  "You are Helm, the friendly assistant on the Nomarc Data Gig platform — a marketplace connecting " +
  "Nigeria's construction professionals, material exhibitors and buyers. On this public surface you " +
  "help visitors understand the platform, find the right page, and decide how to get started. Be warm, " +
  "concise and helpful. Use the SOURCES below when they're relevant. If you don't know something " +
  "specific about Nomarc, say so and point them to sign up or contact the team rather than inventing " +
  "details. (Signed-in professionals get the full Helm consultant inside their dashboard.)";

/* ── write-intent router ────────────────────────────────────────────────────
 * Helm never executes a write. It recognises a request to change the project
 * board and emits a proposal the frontend renders as a diff card and applies on
 * confirm. Actions inside a project need `projectId`; without one the proposal
 * is emitted `ready: false` so the user knows to open Helm in a project.
 */

const PROJECT_SCOPED_ACTIONS = new Set(["create_task", "create_column", "import_template"]);
const ALL_ACTIONS = new Set([...PROJECT_SCOPED_ACTIONS, "create_project"]);
const PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

const ROUTE_PROMPT = `You classify a construction professional's latest message to Helm as either a \
request to CHANGE their project board, or not. Respond with ONLY a JSON object and nothing else.

Message: "{message}"

If the message asks to create/add/set-up something on the board, set "is_write" true and choose "action":
- "create_task"     — add a task / to-do / activity
- "create_project"  — start a whole new project
- "create_column"   — add a board column / stage
- "import_template" — add a named template or document as a task
Otherwise (a question, advice, analysis, greeting, "how do I…") set "is_write" false and "action" "none".

Also extract, else null:
- "title": the task/column/template name, or the new project's name (concise, < 80 chars)
- "priority": one of low|medium|high|urgent, only if clearly stated
- "due_date": an ISO date YYYY-MM-DD, only if a concrete deadline is stated

JSON shape exactly:
{"is_write": true|false, "action": "create_task|create_project|create_column|import_template|none", \
"title": null, "priority": null, "due_date": null}`;

/** Tolerant brace-slice parse, mirroring _extract_json: models wrap JSON in
 *  prose or fences often enough that strict parsing loses real intents. */
function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    return obj && typeof obj === "object" && !Array.isArray(obj) ? (obj as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

type RoutedIntent = {
  action: string;
  title: string;
  priority: string | null;
  due_date: string | null;
};

/** Any provider/parse failure falls through to null so the turn is answered as
 *  normal advice rather than erroring. */
async function routeWrite(message: string): Promise<RoutedIntent | null> {
  let text: string;
  try {
    const resp = await generate(ROUTE_PROMPT.replace("{message}", message), { temperature: 0 });
    text = resp.text;
  } catch (err) {
    console.error("[helm:local] write router failed:", err instanceof Error ? err.message : err);
    return null;
  }
  const data = extractJson(text);
  if (!data || data.is_write !== true) return null;
  const action = typeof data.action === "string" ? data.action : "";
  if (!ALL_ACTIONS.has(action)) return null;
  return {
    action,
    title: typeof data.title === "string" ? data.title : "",
    priority: typeof data.priority === "string" ? data.priority : null,
    due_date: typeof data.due_date === "string" ? data.due_date : null,
  };
}

/** Turn a routed intent into a confirm-gated proposal for the frontend. */
function buildProposal(routed: RoutedIntent, projectId: string | null): HelmProposal {
  const title = routed.title.trim();
  const params: Record<string, unknown> = {};
  const needsProject = PROJECT_SCOPED_ACTIONS.has(routed.action);
  if (needsProject && projectId) params.projectId = projectId;

  let label: string;
  if (routed.action === "create_project") {
    params.name = title;
    label = title ? `Create a new project “${title}”` : "Create a new project";
  } else if (routed.action === "create_task") {
    params.title = title;
    if (routed.priority && PRIORITIES.has(routed.priority)) params.priority = routed.priority;
    // Only an absolute ISO date: the DB column is a `date`, and a relative
    // phrase like "next Friday" (which models sometimes return) fails on apply.
    if (routed.due_date && /^\d{4}-\d{2}-\d{2}$/.test(routed.due_date)) {
      params.dueDate = routed.due_date;
    }
    label = title ? `Add task “${title}” to this project` : "Add a task";
  } else if (routed.action === "create_column") {
    params.name = title;
    label = title ? `Add a “${title}” column to this board` : "Add a column";
  } else {
    params.name = title;
    label = title ? `Import “${title}” into this project` : "Import a template";
  }

  const hasTitle = Boolean(title);
  const missingProject = needsProject && !projectId;
  const ready = hasTitle && !missingProject;

  const summary = missingProject
    ? `${label} — open Helm inside a project first, then confirm.`
    : !hasTitle
      ? `${label} — tell me a name and I'll draft it.`
      : label;

  return { tool: "pm", action: routed.action, params, summary, ready };
}

/** Single flattened prompt, same as _generate: system, optional SOURCES block,
 *  the last 8 turns, then the question. */
function buildPrompt(system: string, message: string, history: HelmChatTurn[], context: string): string {
  const lines = [system, ""];
  if (context) lines.push("SOURCES:", context, "");
  for (const turn of history.slice(-8)) {
    lines.push(`${turn.role === "user" ? "User" : "Helm"}: ${turn.content}`);
  }
  lines.push(`User: ${message}`, "Helm:");
  return lines.join("\n");
}

async function generateAnswer(
  system: string,
  message: string,
  history: HelmChatTurn[],
  context: string,
): Promise<string> {
  const resp = await generate(buildPrompt(system, message, history, context), {
    temperature: context ? 0.3 : 0.4,
  });
  return resp.text.trim();
}

export type ConsultantArgs = {
  message: string;
  history?: HelmChatTurn[];
  discipline?: string | null;
  projectId?: string | null;
};

export type GuideArgs = {
  message: string;
  history?: HelmChatTurn[];
};

/**
 * Grounded consultant reply. Routes write requests to a confirm-gated proposal
 * first; everything else is answered as grounded advice.
 */
export async function answerConsultant(args: ConsultantArgs): Promise<HelmChatResult> {
  const history = args.history ?? [];
  const projectId = args.projectId ?? null;

  const unavailable: HelmChatResult = {
    answer: CONSULTANT_UNAVAILABLE,
    citations: [],
    tool: "none",
    routed_by: "unavailable",
    can_answer: false,
    grounded: false,
    tool_result: null,
    proposal: null,
  };

  let routed: RoutedIntent | null;
  try {
    routed = await routeWrite(args.message);
  } catch {
    routed = null;
  }
  if (routed) {
    const proposal = buildProposal(routed, projectId);
    return {
      answer: proposal.ready
        ? "I've drafted this change — review it below and apply when you're happy."
        : "I can set that up — see the note below on what I need to apply it.",
      citations: [],
      tool: `pm.${routed.action}`,
      routed_by: "router",
      can_answer: true,
      grounded: false,
      tool_result: null,
      proposal,
    };
  }

  // Corpus only: the caller's own and project namespaces need the VM's store.
  const results: LocalRetrieved[] = search(args.message, { limit: 6, source: "corpus" });
  const grounded = results.length > 0;
  const context = grounded ? formatContext(results) : "";

  let answer: string;
  try {
    answer = await generateAnswer(consultantSystem(args.discipline ?? null, grounded), args.message, history, context);
  } catch (err) {
    console.error("[helm:local] consultant generation failed:", err instanceof Error ? err.message : err);
    return unavailable;
  }

  return {
    answer,
    citations: citations(results),
    tool: grounded ? "search_knowledge" : "chat",
    routed_by: "retrieval",
    can_answer: Boolean(answer),
    grounded,
    tool_result: null,
    proposal: null,
  };
}

export type GuideResult = {
  answer: string;
  citations: HelmCitation[];
  navigate: null;
};

/** Guide reply over the public platform corpus. */
export async function answerGuide(args: GuideArgs): Promise<GuideResult> {
  try {
    // Both public corpora: HELM_CORPUS is the platform/industry knowledge the VM
    // indexes, GUIDE_KNOWLEDGE is the app's own pricing-and-onboarding copy.
    const results = search(args.message, { limit: 5, source: "all" });
    const context = results.length ? formatContext(results) : "";
    const answer = await generateAnswer(GUIDE_SYSTEM, args.message, args.history ?? [], context);
    return { answer, citations: citations(results), navigate: null };
  } catch (err) {
    console.error("[helm:local] guide generation failed:", err instanceof Error ? err.message : err);
    return { answer: GUIDE_UNAVAILABLE, citations: [], navigate: null };
  }
}
