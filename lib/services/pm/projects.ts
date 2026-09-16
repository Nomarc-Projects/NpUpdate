"use server";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import {
  pmProject, pmProjectMember, pmColumn, pmTask, pmTag, pmTaskTag, pmMilestone, pmComment, pmAttachment,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import type { PmProject, PmProjectSummary, PmMember, PmColumn, PmTask, PmTag, PmMilestone, Priority, TaskStatus, ProjectStatus, MemberRole } from "./types";

const iso = (x: Date | string | null | undefined) => (x ? new Date(x).toISOString() : null);
const dstr = (x: Date | string | null | undefined) => (x ? String(x).slice(0, 10) : null);
const today = () => new Date().toISOString().slice(0, 10);

/** Members (with auth user name/avatar/email) for a set of projects. */
async function loadMembers(projectIds: string[]): Promise<Map<string, PmMember[]>> {
  const map = new Map<string, PmMember[]>();
  if (!projectIds.length) return map;
  const res = await db.execute(sql`
    SELECT m.id, m.project_id AS "projectId", m.user_id AS "userId", m.role,
           COALESCE(u.name, 'Member') AS name, COALESCE(p.avatar_url, u.image) AS avatar, u.email
    FROM pm_project_member m
    JOIN "user" u ON u.id = m.user_id
    LEFT JOIN profile p ON p.user_id = m.user_id
    WHERE m.project_id IN (${sql.join(projectIds.map((i) => sql`${i}`), sql`, `)})
  `);
  for (const r of res.rows as Record<string, unknown>[]) {
    const pid = String(r.projectId);
    const arr = map.get(pid) ?? [];
    arr.push({ id: String(r.id), userId: String(r.userId), role: String(r.role) as MemberRole, name: String(r.name), avatarUrl: (r.avatar as string) ?? null, email: (r.email as string) ?? undefined });
    map.set(pid, arr);
  }
  return map;
}

async function myProjectIds(uid: string): Promise<string[]> {
  const [owned, member] = await Promise.all([
    db.select({ id: pmProject.id }).from(pmProject).where(eq(pmProject.ownerUserId, uid)),
    db.select({ id: pmProjectMember.projectId }).from(pmProjectMember).where(eq(pmProjectMember.userId, uid)),
  ]);
  return [...new Set([...owned.map((r) => r.id), ...member.map((r) => r.id)])];
}

export async function listProjects(_userId: string): Promise<PmProjectSummary[]> {
  try {
    const uid = await requireUserId();
    const ids = await myProjectIds(uid);
    if (!ids.length) return [];
    const projects = await db.select().from(pmProject).where(inArray(pmProject.id, ids)).orderBy(desc(pmProject.updatedAt));
    const tasks = await db.select({ projectId: pmTask.projectId, status: pmTask.status, dueDate: pmTask.dueDate, parentTaskId: pmTask.parentTaskId }).from(pmTask).where(inArray(pmTask.projectId, ids));
    const members = await loadMembers(ids);
    const t = today();
    return projects.map((p) => {
      const pt = tasks.filter((x) => x.projectId === p.id && !x.parentTaskId);
      const done = pt.filter((x) => x.status === "done").length;
      const overdue = pt.filter((x) => x.status !== "done" && x.dueDate && String(x.dueDate).slice(0, 10) < t).length;
      const mem = members.get(p.id) ?? [];
      return {
        id: p.id, name: p.name, description: p.description, status: (p.status as ProjectStatus) ?? "active",
        color: p.color ?? "#ffd716", icon: p.icon, dueDate: dstr(p.dueDate), startDate: dstr(p.startDate),
        memberCount: mem.length, taskTotal: pt.length, taskDone: done, taskOverdue: overdue,
        members: mem, updatedAt: iso(p.updatedAt) ?? new Date().toISOString(),
      };
    });
  } catch { return []; }
}

/** Scoped to project members. `fetchProject` took a bare id with no auth, so
 *  any project's tasks, milestones and member list (names, avatars) were
 *  readable by anyone who could guess or enumerate an id. */
export async function fetchProject(projectId: string): Promise<PmProject | null> {
  try {
    const uid = await requireUserId();
    const [p] = await db.select().from(pmProject).where(eq(pmProject.id, projectId)).limit(1);
    if (!p) return null;
    if (p.ownerUserId !== uid) {
      const [member] = await db.select({ id: pmProjectMember.id }).from(pmProjectMember)
        .where(and(eq(pmProjectMember.projectId, projectId), eq(pmProjectMember.userId, uid)))
        .limit(1);
      if (!member) return null;
    }
    const [cols, tasks, milestones, members] = await Promise.all([
      db.select().from(pmColumn).where(eq(pmColumn.projectId, projectId)).orderBy(asc(pmColumn.sortOrder)),
      db.select().from(pmTask).where(eq(pmTask.projectId, projectId)).orderBy(asc(pmTask.sortOrder)),
      db.select().from(pmMilestone).where(eq(pmMilestone.projectId, projectId)).orderBy(asc(pmMilestone.dueDate)),
      loadMembers([projectId]),
    ]);
    const taskIds = tasks.map((t) => t.id);
    const [assignees, taskTags, commentCounts, attachCounts] = await Promise.all([
      taskIds.length ? db.execute(sql`SELECT a.task_id AS "taskId", a.user_id AS "userId", COALESCE(u.name,'Member') AS name, COALESCE(p.avatar_url,u.image) AS avatar FROM pm_task_assignee a JOIN "user" u ON u.id=a.user_id LEFT JOIN profile p ON p.user_id=a.user_id WHERE a.task_id IN (${sql.join(taskIds.map((i) => sql`${i}`), sql`, `)})`) : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
      taskIds.length ? db.select({ taskId: pmTaskTag.taskId, id: pmTag.id, projectId: pmTag.projectId, name: pmTag.name, color: pmTag.color }).from(pmTaskTag).innerJoin(pmTag, eq(pmTaskTag.tagId, pmTag.id)).where(inArray(pmTaskTag.taskId, taskIds)) : Promise.resolve([] as { taskId: string; id: string; projectId: string; name: string; color: string | null }[]),
      taskIds.length ? db.select({ taskId: pmComment.taskId, n: sql<number>`count(*)` }).from(pmComment).where(inArray(pmComment.taskId, taskIds)).groupBy(pmComment.taskId) : Promise.resolve([] as { taskId: string; n: number }[]),
      taskIds.length ? db.select({ taskId: pmAttachment.taskId, n: sql<number>`count(*)` }).from(pmAttachment).where(inArray(pmAttachment.taskId, taskIds)).groupBy(pmAttachment.taskId) : Promise.resolve([] as { taskId: string; n: number }[]),
    ]);

    const assigneesByTask = new Map<string, PmMember[]>();
    for (const a of assignees.rows as Record<string, unknown>[]) {
      const tid = String(a.taskId); const arr = assigneesByTask.get(tid) ?? [];
      arr.push({ id: String(a.userId), userId: String(a.userId), role: "member", name: String(a.name), avatarUrl: (a.avatar as string) ?? null });
      assigneesByTask.set(tid, arr);
    }
    const tagsByTask = new Map<string, PmTag[]>();
    for (const t of taskTags) { const arr = tagsByTask.get(t.taskId) ?? []; arr.push({ id: t.id, projectId: t.projectId, name: t.name, color: t.color ?? "#9a9a9a" }); tagsByTask.set(t.taskId, arr); }
    const cc = new Map((commentCounts as { taskId: string; n: number }[]).map((r) => [r.taskId, Number(r.n)]));
    const ac = new Map((attachCounts as { taskId: string; n: number }[]).map((r) => [r.taskId, Number(r.n)]));

    const toTask = (t: typeof tasks[number]): PmTask => ({
      id: t.id, projectId: t.projectId, columnId: t.columnId, parentTaskId: t.parentTaskId, title: t.title,
      description: t.description, priority: (t.priority as Priority) ?? "medium", status: (t.status as TaskStatus) ?? "todo",
      sortOrder: t.sortOrder, dueDate: dstr(t.dueDate), startDate: dstr(t.startDate), completedAt: iso(t.completedAt),
      estimateHours: t.estimateHours, actualHours: t.actualHours, createdBy: t.createdBy, createdAt: iso(t.createdAt) ?? "", updatedAt: iso(t.updatedAt) ?? "",
      assignees: assigneesByTask.get(t.id) ?? [], tags: tagsByTask.get(t.id) ?? [],
      subtasks: tasks.filter((s) => s.parentTaskId === t.id).map((s) => ({ id: s.id, title: s.title, status: (s.status as TaskStatus) ?? "todo", dueDate: dstr(s.dueDate), assigneeId: null, assigneeName: null, sortOrder: s.sortOrder })),
      attachments: [], comments: [], _commentCount: cc.get(t.id) ?? 0, _attachmentCount: ac.get(t.id) ?? 0,
    });

    const topTasks = tasks.filter((t) => !t.parentTaskId);
    const columns: PmColumn[] = cols.map((c) => ({
      id: c.id, projectId: c.projectId, name: c.name, color: c.color ?? "#9a9a9a", sortOrder: c.sortOrder,
      tasks: topTasks.filter((t) => t.columnId === c.id).map(toTask),
    }));
    const mem = members.get(projectId) ?? [];
    const t0 = today();
    return {
      id: p.id, ownerUserId: p.ownerUserId, name: p.name, description: p.description, status: (p.status as ProjectStatus) ?? "active",
      color: p.color ?? "#ffd716", icon: p.icon, startDate: dstr(p.startDate), dueDate: dstr(p.dueDate), isTemplate: p.isTemplate ?? false,
      createdAt: iso(p.createdAt) ?? "", updatedAt: iso(p.updatedAt) ?? "",
      members: mem,
      milestones: milestones.map((m): PmMilestone => ({ id: m.id, projectId: m.projectId, name: m.name, description: m.description, dueDate: dstr(m.dueDate), completed: m.completed ?? false, completedAt: iso(m.completedAt), createdAt: iso(m.createdAt) ?? "" })),
      columns,
      _taskTotal: topTasks.length,
      _taskDone: topTasks.filter((t) => t.status === "done").length,
      _taskOverdue: topTasks.filter((t) => t.status !== "done" && t.dueDate && String(t.dueDate).slice(0, 10) < t0).length,
    };
  } catch { return null; }
}

export async function createProject(data: { name: string; description?: string; color?: string; startDate?: string; dueDate?: string; ownerUserId: string }): Promise<{ id: string }> {
  const uid = await requireUserId();
  const [proj] = await db.insert(pmProject).values({
    ownerUserId: uid, name: data.name.trim(), description: data.description || null, color: data.color || "#ffd716",
    startDate: data.startDate || null, dueDate: data.dueDate || null,
  }).returning({ id: pmProject.id });
  await db.insert(pmProjectMember).values({ projectId: proj.id, userId: uid, role: "owner" });
  await db.insert(pmColumn).values([
    { projectId: proj.id, name: "To do", color: "#9a9a9a", sortOrder: "a0" },
    { projectId: proj.id, name: "In progress", color: "#3b82f6", sortOrder: "a1" },
    { projectId: proj.id, name: "Review", color: "#f59e0b", sortOrder: "a2" },
    { projectId: proj.id, name: "Done", color: "#22c55e", sortOrder: "a3" },
  ]);
  revalidatePath("/dashboard/project-management");
  return { id: proj.id };
}

export async function updateProject(projectId: string, patch: Partial<PmProject>): Promise<void> {
  await requireUserId();
  await db.update(pmProject).set({
    name: patch.name, description: patch.description ?? undefined, color: patch.color ?? undefined,
    status: patch.status ?? undefined, startDate: patch.startDate ?? undefined, dueDate: patch.dueDate ?? undefined,
    updatedAt: new Date(),
  }).where(eq(pmProject.id, projectId));
  revalidatePath(`/dashboard/project-management/${projectId}`);
}

export async function archiveProject(projectId: string): Promise<void> {
  await requireUserId();
  await db.update(pmProject).set({ status: "archived", updatedAt: new Date() }).where(eq(pmProject.id, projectId));
  revalidatePath("/dashboard/project-management");
}

/** Import a Business Template into a project as a task (in its first column),
 *  optionally attaching the template file. Used from the Templates library. */
export async function importTemplateToProject(input: { projectId: string; name: string; category?: string; fileUrl?: string }): Promise<{ id: string }> {
  const uid = await requireUserId();
  const [col] = await db.select({ id: pmColumn.id }).from(pmColumn).where(eq(pmColumn.projectId, input.projectId)).orderBy(asc(pmColumn.sortOrder)).limit(1);
  const [row] = await db.insert(pmTask).values({
    projectId: input.projectId, columnId: col?.id ?? null, title: input.name.trim(),
    description: input.category ? `Imported from Business Templates · ${input.category}` : "Imported from Business Templates",
    priority: "medium", status: "todo", sortOrder: String(Date.now()), createdBy: uid,
  }).returning({ id: pmTask.id });
  if (input.fileUrl) {
    await db.insert(pmAttachment).values({ taskId: row.id, uploadedBy: uid, name: input.name, url: input.fileUrl, size: 0, mimeType: "application/octet-stream" }).catch(() => {});
  }
  revalidatePath(`/dashboard/project-management/${input.projectId}`);
  return { id: row.id };
}
