"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import {
  pmActivity, pmColumn, pmComment, pmProject, pmProjectMember, pmTask, pmTaskAssignee,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import type { PmTask, Priority } from "./types";

/** Throw unless the caller is a member of the task's / project's project. */
async function assertProjectAccess(projectId: string, uid: string): Promise<void> {
  const [member] = await db
    .select({ id: pmProjectMember.id })
    .from(pmProjectMember)
    .where(and(eq(pmProjectMember.projectId, projectId), eq(pmProjectMember.userId, uid)))
    .limit(1);
  if (member) return;
  const [owned] = await db
    .select({ id: pmProject.id })
    .from(pmProject)
    .where(and(eq(pmProject.id, projectId), eq(pmProject.ownerUserId, uid)))
    .limit(1);
  if (!owned) throw new Error("Forbidden");
}

async function projectIdForTask(taskId: string): Promise<string | null> {
  const [row] = await db.select({ projectId: pmTask.projectId }).from(pmTask).where(eq(pmTask.id, taskId)).limit(1);
  return row?.projectId ?? null;
}

async function logActivity(projectId: string, taskId: string | null, actor: string, type: string, meta?: string) {
  await db.insert(pmActivity).values({ projectId, taskId, actorUserId: actor, type, meta: meta ?? null }).catch(() => {});
}

export async function createTask(data: {
  projectId: string;
  columnId?: string;
  title: string;
  description?: string;
  priority?: Priority;
  assigneeIds?: string[];
  dueDate?: string;
  createdBy: string;
  sortOrder: string;
}): Promise<{ id: string }> {
  const uid = await requireUserId();
  await assertProjectAccess(data.projectId, uid);

  // Default to the project's first column when none is given.
  let columnId = data.columnId ?? null;
  if (!columnId) {
    const [col] = await db
      .select({ id: pmColumn.id })
      .from(pmColumn)
      .where(eq(pmColumn.projectId, data.projectId))
      .orderBy(pmColumn.sortOrder)
      .limit(1);
    columnId = col?.id ?? null;
  }

  const [task] = await db
    .insert(pmTask)
    .values({
      projectId: data.projectId,
      columnId,
      title: data.title.trim(),
      description: data.description ?? null,
      priority: data.priority ?? "medium",
      status: "todo",
      sortOrder: data.sortOrder,
      dueDate: data.dueDate ?? null,
      createdBy: uid,
    })
    .returning({ id: pmTask.id });

  const assignees = (data.assigneeIds ?? []).filter(Boolean);
  if (assignees.length) {
    await db.insert(pmTaskAssignee).values(assignees.map((userId) => ({ taskId: task.id, userId }))).catch(() => {});
  }

  await logActivity(data.projectId, task.id, uid, "task_created", data.title.slice(0, 120));
  revalidatePath(`/dashboard/project-management/${data.projectId}`);
  return { id: task.id };
}

export async function updateTask(
  taskId: string,
  patch: Partial<Pick<PmTask, "title" | "description" | "priority" | "status" | "dueDate" | "startDate" | "estimateHours" | "actualHours">>,
): Promise<void> {
  const uid = await requireUserId();
  const projectId = await projectIdForTask(taskId);
  if (!projectId) return;
  await assertProjectAccess(projectId, uid);

  await db
    .update(pmTask)
    .set({
      title: patch.title,
      description: patch.description ?? undefined,
      priority: patch.priority ?? undefined,
      status: patch.status ?? undefined,
      dueDate: patch.dueDate ?? undefined,
      startDate: patch.startDate ?? undefined,
      estimateHours: patch.estimateHours ?? undefined,
      actualHours: patch.actualHours ?? undefined,
      // Keep completedAt consistent when status flips to/from done.
      completedAt: patch.status === "done" ? new Date() : patch.status ? null : undefined,
      updatedAt: new Date(),
    })
    .where(eq(pmTask.id, taskId));

  await logActivity(projectId, taskId, uid, "task_updated");
  revalidatePath(`/dashboard/project-management/${projectId}`);
}

export async function moveTask(taskId: string, columnId: string, sortOrder: string): Promise<void> {
  const uid = await requireUserId();
  const projectId = await projectIdForTask(taskId);
  if (!projectId) return;
  await assertProjectAccess(projectId, uid);
  await db.update(pmTask).set({ columnId, sortOrder, updatedAt: new Date() }).where(eq(pmTask.id, taskId));
  await logActivity(projectId, taskId, uid, "task_moved");
  revalidatePath(`/dashboard/project-management/${projectId}`);
}

export async function completeTask(taskId: string, done: boolean): Promise<void> {
  const uid = await requireUserId();
  const projectId = await projectIdForTask(taskId);
  if (!projectId) return;
  await assertProjectAccess(projectId, uid);
  await db
    .update(pmTask)
    .set({ status: done ? "done" : "todo", completedAt: done ? new Date() : null, updatedAt: new Date() })
    .where(eq(pmTask.id, taskId));
  await logActivity(projectId, taskId, uid, done ? "task_completed" : "task_reopened");
  revalidatePath(`/dashboard/project-management/${projectId}`);
}

export async function deleteTask(taskId: string): Promise<void> {
  const uid = await requireUserId();
  const projectId = await projectIdForTask(taskId);
  if (!projectId) return;
  await assertProjectAccess(projectId, uid);
  await db.delete(pmTask).where(eq(pmTask.id, taskId)); // cascades comments, attachments, subtasks, assignees
  await logActivity(projectId, null, uid, "task_deleted");
  revalidatePath(`/dashboard/project-management/${projectId}`);
}

export async function addComment(data: {
  taskId: string;
  body: string;
  authorUserId: string;
}): Promise<{ id: string }> {
  const uid = await requireUserId();
  const projectId = await projectIdForTask(data.taskId);
  if (!projectId) throw new Error("Task not found");
  await assertProjectAccess(projectId, uid);
  const [row] = await db
    .insert(pmComment)
    .values({ taskId: data.taskId, authorUserId: uid, body: data.body.trim() })
    .returning({ id: pmComment.id });
  await logActivity(projectId, data.taskId, uid, "comment_added");
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { id: row.id };
}

export async function addSubtask(data: {
  parentTaskId: string;
  projectId: string;
  title: string;
  sortOrder: string;
  createdBy: string;
}): Promise<{ id: string }> {
  const uid = await requireUserId();
  await assertProjectAccess(data.projectId, uid);
  const [row] = await db
    .insert(pmTask)
    .values({
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
      title: data.title.trim(),
      priority: "medium",
      status: "todo",
      sortOrder: data.sortOrder,
      createdBy: uid,
    })
    .returning({ id: pmTask.id });
  revalidatePath(`/dashboard/project-management/${data.projectId}`);
  return { id: row.id };
}

export async function createColumn(data: {
  projectId: string;
  name: string;
  color?: string;
  sortOrder: string;
}): Promise<{ id: string }> {
  const uid = await requireUserId();
  await assertProjectAccess(data.projectId, uid);
  const [row] = await db
    .insert(pmColumn)
    .values({ projectId: data.projectId, name: data.name.trim(), color: data.color ?? "#9a9a9a", sortOrder: data.sortOrder })
    .returning({ id: pmColumn.id });
  revalidatePath(`/dashboard/project-management/${data.projectId}`);
  return { id: row.id };
}

export async function renameColumn(columnId: string, name: string): Promise<void> {
  const uid = await requireUserId();
  const [col] = await db.select({ projectId: pmColumn.projectId }).from(pmColumn).where(eq(pmColumn.id, columnId)).limit(1);
  if (!col) return;
  await assertProjectAccess(col.projectId, uid);
  await db.update(pmColumn).set({ name: name.trim() }).where(eq(pmColumn.id, columnId));
  revalidatePath(`/dashboard/project-management/${col.projectId}`);
}

export async function deleteColumn(columnId: string): Promise<void> {
  const uid = await requireUserId();
  const [col] = await db.select({ projectId: pmColumn.projectId }).from(pmColumn).where(eq(pmColumn.id, columnId)).limit(1);
  if (!col) return;
  await assertProjectAccess(col.projectId, uid);
  await db.delete(pmColumn).where(eq(pmColumn.id, columnId)); // tasks' column_id set null via FK
  revalidatePath(`/dashboard/project-management/${col.projectId}`);
}
