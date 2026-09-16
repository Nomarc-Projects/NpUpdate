"use client";
import { useState } from "react";
import { toast } from "sonner";
import type { PmProject, PmTask, PmColumn, Priority } from "@/lib/services/pm/types";
import { createTask, updateTask, deleteTask as deleteTaskSvc, moveTask } from "@/lib/services/pm/tasks";
import { ProjectHeader } from "./project-header";
import { KanbanBoard } from "./kanban-board";
import { ListView } from "./list-view";
import { CalendarView } from "./calendar-view";
import { TimelineView } from "./timeline-view";
import { TaskSlideOver } from "./task-slide-over";
import { AddTaskModal } from "./add-task-modal";
import { TeamModal } from "./team-modal";

type View = "board" | "list" | "calendar" | "timeline";

interface Props {
  project: PmProject;
  initialView?: View;
}

export function ProjectWorkspace({ project, initialView = "board" }: Props) {
  const [view, setView] = useState<View>(initialView);
  const [selectedTask, setSelectedTask] = useState<PmTask | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addColumnId, setAddColumnId] = useState<string | undefined>();
  const [addDefaultDate, setAddDefaultDate] = useState<string | undefined>();
  const [teamOpen, setTeamOpen] = useState(false);
  const [columns, setColumns] = useState<PmColumn[]>(project.columns);

  function handleAddTask(colId?: string, defaultDate?: string) {
    setAddColumnId(colId ?? columns[0]?.id);
    setAddDefaultDate(defaultDate);
    setAddOpen(true);
  }

  function onNewTask(data: { title: string; columnId: string; priority: Priority; dueDate?: string; description?: string }) {
    const tempId = `t-${Date.now()}`;
    const sortOrder = String(Date.now());
    const newTask: PmTask = {
      id: tempId,
      projectId: project.id,
      columnId: data.columnId,
      title: data.title,
      priority: data.priority,
      status: "todo",
      sortOrder,
      dueDate: data.dueDate ?? null,
      description: data.description ?? null,
      createdBy: "me",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignees: [],
      tags: [],
      subtasks: [],
      attachments: [],
      comments: [],
      _commentCount: 0,
      _attachmentCount: 0,
    };
    setColumns((prev) => prev.map((c) => c.id === data.columnId ? { ...c, tasks: [...c.tasks, newTask] } : c));
    // persist + reconcile the real id
    createTask({ projectId: project.id, columnId: data.columnId, title: data.title, priority: data.priority, dueDate: data.dueDate, createdBy: "me", sortOrder })
      .then(({ id }) => { if (data.description) updateTask(id, { description: data.description }).catch(() => {}); setColumns((prev) => prev.map((c) => ({ ...c, tasks: c.tasks.map((t) => t.id === tempId ? { ...t, id } : t) }))); })
      .catch((e) => { toast.error(e instanceof Error ? e.message : "Couldn't create task"); setColumns((prev) => prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== tempId) }))); });
  }

  /** Patch a task in both selectedTask AND the columns array, then persist. */
  function patchTask(taskId: string, patch: Partial<PmTask>) {
    const applyPatch = (t: PmTask) => t.id === taskId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t;
    setColumns((prev) => prev.map((col) => ({ ...col, tasks: col.tasks.map(applyPatch) })));
    setSelectedTask((prev) => (prev?.id === taskId ? applyPatch(prev) : prev));
    if (taskId.startsWith("t-")) return; // optimistic temp id not yet persisted
    updateTask(taskId, {
      title: patch.title, description: patch.description, priority: patch.priority, status: patch.status,
      dueDate: patch.dueDate, startDate: patch.startDate, estimateHours: patch.estimateHours,
      actualHours: patch.actualHours,
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't save changes"));
  }

  function deleteTask(taskId: string) {
    setColumns((prev) => prev.map((col) => ({ ...col, tasks: col.tasks.filter((t) => t.id !== taskId) })));
    setSelectedTask((prev) => (prev?.id === taskId ? null : prev));
    if (!taskId.startsWith("t-")) deleteTaskSvc(taskId).catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't delete task"));
  }

  function toggleDone(task: PmTask) {
    const done = !task.completedAt;
    patchTask(task.id, { completedAt: done ? new Date().toISOString() : undefined, status: done ? "done" : "todo" });
  }

  function onTaskMove(taskId: string, columnId: string, sortOrder: string) {
    if (taskId.startsWith("t-")) return;
    moveTask(taskId, columnId, sortOrder).catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't move task"));
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <ProjectHeader
          project={{ ...project, columns }}
          view={view}
          onViewChange={setView}
          onAddTask={() => handleAddTask()}
          onTeamClick={() => setTeamOpen(true)}
        />

        <div className={`flex-1 overflow-auto p-5 sm:p-6 ${view === "board" ? "overflow-x-auto" : ""}`}>
          {view === "board" && (
            <KanbanBoard
              columns={columns}
              onTaskClick={setSelectedTask}
              onAddTask={handleAddTask}
              onColumnsChange={setColumns}
              onTaskMove={onTaskMove}
            />
          )}
          {view === "list" && (
            <ListView
              columns={columns}
              onTaskClick={setSelectedTask}
              onAddTask={handleAddTask}
              onToggleDone={toggleDone}
            />
          )}
          {view === "calendar" && (
            <CalendarView
              columns={columns}
              onTaskClick={setSelectedTask}
              onAddTask={(date) => handleAddTask(undefined, date)}
            />
          )}
          {view === "timeline" && (
            <TimelineView
              columns={columns}
              milestones={project.milestones}
              projectStart={project.startDate}
              projectEnd={project.dueDate}
              onTaskClick={setSelectedTask}
            />
          )}
        </div>
      </div>

      <TaskSlideOver
        task={selectedTask}
        members={project.members}
        onClose={() => setSelectedTask(null)}
        onUpdate={(patch) => { if (selectedTask) patchTask(selectedTask.id, patch); }}
        onDelete={deleteTask}
      />

      <AddTaskModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddDefaultDate(undefined); }}
        columns={columns}
        defaultColumnId={addColumnId}
        defaultDueDate={addDefaultDate}
        onAdd={onNewTask}
      />

      <TeamModal
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        members={project.members}
        projectName={project.name}
      />
    </>
  );
}
