"use client";
import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Plus, Pencil, ArrowUpDown, Trash2 } from "lucide-react";
import type { PmColumn, PmTask } from "@/lib/services/pm/types";
import { TaskCard, TaskCardOverlay } from "./task-card";
import { KebabMenu } from "@/components/dashboard/kit";
import { cn } from "@/lib/utils";

const COL_COLORS: Record<string, string> = {
  "#9a9a9a": "bg-[#9a9a9a]",
  "#6366f1": "bg-[#6366f1]",
  "#f59e0b": "bg-[#f59e0b]",
  "#22c55e": "bg-[#22c55e]",
  "#e5484d": "bg-[#e5484d]",
  "#ffd716": "bg-[#ffd716]",
};

function KanbanColumn({
  column,
  onTaskClick,
  onAddTask,
}: {
  column: PmColumn;
  onTaskClick: (task: PmTask) => void;
  onAddTask: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const dotColor = COL_COLORS[column.color] ?? "bg-[#9a9a9a]";

  return (
    <div className="flex-shrink-0 w-[272px] flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{column.name}</span>
          <span className="text-[11px] font-medium text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 px-1.5 py-0.5 rounded-full">{column.tasks.length}</span>
        </div>
          <div className="flex items-center gap-1">
          <button onClick={() => onAddTask(column.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f0f0f0] dark:hover:bg-white/5 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
            <Plus size={15} />
          </button>
          {/* Portal-based KebabMenu — the board's overflow-x-auto used to clip
              the inline absolute menu. The items are placeholders for now. */}
          <KebabMenu items={[
            { icon: Pencil, label: "Rename column", onClick: () => {} },
            { icon: ArrowUpDown, label: "Sort tasks", onClick: () => {} },
            { icon: Trash2, label: "Delete column", danger: true, onClick: () => {} },
          ]} />
        </div>
      </div>

      {/* Task list drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[200px] rounded-xl p-2 space-y-2 transition-colors",
          isOver ? "bg-[#ffd716]/8 dark:bg-[#ffd716]/5 ring-1 ring-[#ffd716]/30" : "bg-[#f7f8fa] dark:bg-white/[0.02]"
        )}
      >
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {/* Add task inline */}
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#ececec] dark:hover:bg-white/5 transition-colors"
        >
          <Plus size={13} /> Add task
        </button>
      </div>
    </div>
  );
}

interface Props {
  columns: PmColumn[];
  onTaskClick: (task: PmTask) => void;
  onAddTask?: (columnId?: string) => void;
  onColumnsChange?: (columns: PmColumn[]) => void;
  onTaskMove?: (taskId: string, columnId: string, sortOrder: string) => void;
}

export function KanbanBoard({ columns: initialColumns, onTaskClick, onAddTask, onColumnsChange, onTaskMove }: Props) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeTask, setActiveTask] = useState<PmTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findTask = useCallback((id: string) => {
    for (const col of columns) {
      const t = col.tasks.find((t) => t.id === id);
      if (t) return { task: t, column: col };
    }
    return null;
  }, [columns]);

  function onDragStart({ active }: DragStartEvent) {
    const found = findTask(String(active.id));
    if (found) setActiveTask(found.task);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeData = findTask(activeId);
    if (!activeData) return;

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, tasks: [...col.tasks] }));

      const srcColIdx = next.findIndex((c) => c.id === activeData.column.id);
      const taskIdx = next[srcColIdx].tasks.findIndex((t) => t.id === activeId);

      // Check if over is a column id
      const overColIdx = next.findIndex((c) => c.id === overId);
      if (overColIdx !== -1) {
        // Drop into empty column
        const [removed] = next[srcColIdx].tasks.splice(taskIdx, 1);
        removed.columnId = next[overColIdx].id;
        next[overColIdx].tasks.push(removed);
        return next;
      }

      // Over is a task id
      const dstColData = findTask(overId);
      if (!dstColData) return prev;
      const dstColIdx = next.findIndex((c) => c.id === dstColData.column.id);
      const overTaskIdx = next[dstColIdx].tasks.findIndex((t) => t.id === overId);

      const [removed] = next[srcColIdx].tasks.splice(taskIdx, 1);
      removed.columnId = next[dstColIdx].id;
      next[dstColIdx].tasks.splice(overTaskIdx, 0, removed);

      return next;
    });
  }

  function onDragEnd({ active }: DragEndEvent) {
    setActiveTask(null);
    setColumns((prev) => {
      onColumnsChange?.(prev);
      // persist the moved task's new column + position
      const id = String(active.id);
      for (const col of prev) {
        const idx = col.tasks.findIndex((t) => t.id === id);
        if (idx !== -1) { onTaskMove?.(id, col.id, `${Date.now()}${idx}`); break; }
      }
      return prev;
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-0">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            onTaskClick={onTaskClick}
            onAddTask={(colId) => onAddTask?.(colId)}
          />
        ))}

        {/* Add column button */}
        <div className="flex-shrink-0 w-[272px]">
          <button
            onClick={() => onAddTask?.()}
            className="w-full h-12 rounded-xl border-2 border-dashed border-[#e3e3e3] dark:border-white/10 flex items-center justify-center gap-2 text-[13px] text-[#9a9a9a] hover:border-[#ffd716] hover:text-[#caa400] transition-colors"
          >
            <Plus size={15} /> Add column
          </button>
        </div>
      </div>

      <DragOverlay>
        {activeTask && <TaskCardOverlay task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
