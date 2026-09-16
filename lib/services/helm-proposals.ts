"use server";

import { db } from "@/lib/db/client";
import { helmProposal } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { createProject, importTemplateToProject } from "@/lib/services/pm/projects";
import { createColumn, createTask, moveTask, updateTask } from "@/lib/services/pm/tasks";

/**
 * The confirm-gated write layer. A Helm proposal is a *description* of an
 * action; nothing here runs until the user confirms in the UI. Each apply is
 * recorded in `helm_proposal` (pending → applied|failed) as an audit trail.
 *
 * Every handler re-derives the caller from the session and relies on the PM
 * services' own membership checks — a proposal's params are never trusted to
 * carry authority. Adding a new actionable tool = add a case in `DISPATCH`.
 */

export type HelmProposalInput = {
  tool: string;
  action: string;
  params: Record<string, unknown>;
  summary?: string;
  ready?: boolean;
};

type ApplyOutcome = { ok: true; data: unknown } | { ok: false; error: string };

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/**
 * Tool → executor. Each returns the created/updated entity. Keep these thin:
 * they only translate a validated proposal into an existing, access-checked
 * server action — no business logic lives here.
 */
const DISPATCH: Record<string, (uid: string, p: Record<string, unknown>) => Promise<unknown>> = {
  "pm.create_project": async (uid, p) => {
    const name = str(p.name);
    if (!name) throw new Error("A project needs a name.");
    return createProject({
      name,
      description: str(p.description),
      startDate: str(p.startDate),
      dueDate: str(p.dueDate),
      ownerUserId: uid,
    });
  },
  "pm.create_task": async (uid, p) => {
    const projectId = str(p.projectId);
    const title = str(p.title);
    if (!projectId || !title) throw new Error("A task needs a project and a title.");
    const priority = str(p.priority);
    return createTask({
      projectId,
      title,
      description: str(p.description),
      priority: priority === "low" || priority === "high" || priority === "urgent" ? priority : "medium",
      dueDate: str(p.dueDate),
      assigneeIds: strArr(p.assigneeIds),
      createdBy: uid,
      sortOrder: String(Date.now()),
    });
  },
  "pm.update_task": async (_uid, p) => {
    const taskId = str(p.taskId);
    if (!taskId) throw new Error("Which task should change?");
    await updateTask(taskId, {
      title: str(p.title),
      description: str(p.description),
      dueDate: str(p.dueDate),
    });
    return { id: taskId };
  },
  "pm.move_task": async (_uid, p) => {
    const taskId = str(p.taskId);
    const columnId = str(p.columnId);
    if (!taskId || !columnId) throw new Error("Moving a task needs the task and target column.");
    await moveTask(taskId, columnId, String(Date.now()));
    return { id: taskId };
  },
  "pm.create_column": async (_uid, p) => {
    const projectId = str(p.projectId);
    const name = str(p.name);
    if (!projectId || !name) throw new Error("A column needs a project and a name.");
    return createColumn({ projectId, name, color: str(p.color), sortOrder: String(Date.now()) });
  },
  "pm.import_template": async (_uid, p) => {
    const projectId = str(p.projectId);
    const name = str(p.name);
    if (!projectId || !name) throw new Error("Importing a template needs a project and a name.");
    return importTemplateToProject({ projectId, name, category: str(p.category), fileUrl: str(p.fileUrl) });
  },
};

export async function applyProposal(input: {
  proposal: HelmProposalInput;
  conversationId?: string | null;
  messageId?: string | null;
}): Promise<ApplyOutcome> {
  const uid = await requireUserId();
  const { proposal } = input;
  const key = `${proposal.tool}.${proposal.action}`.replace(/\.\./g, ".");
  const handler = DISPATCH[key] ?? DISPATCH[proposal.tool];

  // Record the intent first, so even a failed/blocked apply is auditable.
  let proposalId: string | null = null;
  try {
    const [row] = await db
      .insert(helmProposal)
      .values({
        userId: uid,
        conversationId: input.conversationId ?? null,
        messageId: input.messageId ?? null,
        tool: proposal.tool,
        action: proposal.action,
        params: proposal.params ?? {},
        summary: proposal.summary ?? key,
        status: "pending",
      })
      .returning({ id: helmProposal.id });
    proposalId = row?.id ?? null;
  } catch {
    // audit table not migrated yet — proceed but we can't record it
  }

  if (!handler) {
    await markProposal(proposalId, "rejected", `Unknown action: ${key}`);
    return { ok: false, error: `Helm can't perform "${key}" yet.` };
  }

  try {
    const data = await handler(uid, proposal.params ?? {});
    await markProposal(proposalId, "applied");
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed";
    await markProposal(proposalId, "failed", message);
    return { ok: false, error: message };
  }
}

async function markProposal(id: string | null, status: string, error?: string): Promise<void> {
  if (!id) return;
  try {
    const { eq } = await import("drizzle-orm");
    await db
      .update(helmProposal)
      .set({ status, error: error ?? null, appliedAt: status === "applied" ? new Date() : null })
      .where(eq(helmProposal.id, id));
  } catch {
    // best-effort audit
  }
}
