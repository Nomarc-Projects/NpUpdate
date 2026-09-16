"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Calendar, MessageSquare, Paperclip, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PmColumn, PmTask } from "@/lib/services/pm/types";
import { PriorityBadge } from "./priority-badge";
import { MemberAvatars } from "./member-avatars";
import { cn } from "@/lib/utils";

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

function isOverdue(due?: string | null, done?: string | null) {
  if (!due || done) return false;
  return new Date(due) < new Date();
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

type SortKey = "priority" | "dueDate" | "title" | "status";

function ColumnGroup({ column, onTaskClick, onAddTask, sort, onToggleDone }: { column: PmColumn; onTaskClick: (t: PmTask) => void; onAddTask: (colId: string) => void; sort: SortKey; onToggleDone?: (t: PmTask) => void }) {
  const [open, setOpen] = useState(true);

  const sorted = [...column.tasks].sort((a, b) => {
    if (sort === "priority") return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    if (sort === "dueDate") return (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1;
    if (sort === "title") return a.title.localeCompare(b.title);
    return 0;
  });

  const dotColor = { "#9a9a9a": "#9a9a9a", "#6366f1": "#6366f1", "#f59e0b": "#f59e0b", "#22c55e": "#22c55e", "#e5484d": "#e5484d" }[column.color] ?? "#9a9a9a";

  return (
    <div className="mb-2">
      {/* Column header row */}
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-[#fafafa] dark:hover:bg-white/[0.02] rounded-lg transition-colors group">
        {open ? <ChevronDown size={14} className="text-[#9a9a9a]" /> : <ChevronRight size={14} className="text-[#9a9a9a]" />}
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dotColor }} />
        <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{column.name}</span>
        <span className="text-[11px] text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 px-1.5 py-0.5 rounded-full">{column.tasks.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
            {sorted.map((task) => <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} onToggleDone={onToggleDone} />)}

            {/* Inline add row */}
            <button onClick={() => onAddTask(column.id)}
              className="w-full flex items-center gap-2 px-4 py-2 text-[12px] text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#fafafa] dark:hover:bg-white/[0.02] rounded-lg transition-colors">
              <Plus size={13} /> Add task
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskRow({ task, onClick, onToggleDone }: { task: PmTask; onClick: () => void; onToggleDone?: (task: PmTask) => void }) {
  const done = !!task.completedAt;
  const overdue = isOverdue(task.dueDate, task.completedAt);

  return (
    <div onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#fafafa] dark:hover:bg-white/[0.02] cursor-pointer group border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
      {/* Done toggle */}
      <button onClick={(e) => { e.stopPropagation(); onToggleDone?.(task); }} className={`flex-shrink-0 transition-colors ${done ? "text-[#22c55e]" : "text-[#d1d5db] hover:text-[#22c55e]"}`}>
        {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </button>

      {/* Title */}
      <span className={cn("flex-1 text-[13px] truncate", done ? "line-through text-[#9a9a9a]" : "text-[#1e1e1e] dark:text-white")}>{task.title}</span>

      {/* Tags */}
      <div className="hidden sm:flex items-center gap-1">
        {task.tags.slice(0, 2).map((t) => (
          <span key={t.id} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f0f0f0] dark:bg-white/10 text-[#6b6b6b] dark:text-white/50">{t.name}</span>
        ))}
      </div>

      {/* Priority */}
      <PriorityBadge priority={task.priority} showLabel />

      {/* Due date */}
      <span className={cn("hidden sm:flex items-center gap-1 text-[12px] w-20 flex-shrink-0", overdue ? "text-[#e5484d]" : "text-[#9a9a9a]")}>
        {task.dueDate ? <><Calendar size={11} /> {fmtDate(task.dueDate)}</> : null}
      </span>

      {/* Assignees */}
      <div className="flex-shrink-0 w-16 flex justify-end">
        {task.assignees.length > 0 && <MemberAvatars members={task.assignees} max={2} size={5} />}
      </div>

      {/* Meta */}
      <div className="hidden md:flex items-center gap-2 text-[11px] text-[#9a9a9a] flex-shrink-0">
        {(task._commentCount ?? 0) > 0 && <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {task._commentCount}</span>}
        {(task._attachmentCount ?? 0) > 0 && <span className="flex items-center gap-0.5"><Paperclip size={10} /> {task._attachmentCount}</span>}
      </div>
    </div>
  );
}

interface Props {
  columns: PmColumn[];
  onTaskClick: (task: PmTask) => void;
  onAddTask?: (columnId?: string) => void;
  onToggleDone?: (task: PmTask) => void;
}

export function ListView({ columns, onTaskClick, onAddTask, onToggleDone }: Props) {
  const [sort, setSort] = useState<SortKey>("priority");

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "priority", label: "Priority" },
    { key: "dueDate", label: "Due date" },
    { key: "title", label: "Name" },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className="text-[12px] text-[#9a9a9a]">Sort by:</span>
        {SORTS.map((s) => (
          <button key={s.key} onClick={() => setSort(s.key)}
            className={cn("px-3 py-1 rounded-full text-[12px] font-medium transition-colors",
              sort === s.key ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f0f0f0] dark:bg-white/5 text-[#6b6b6b] dark:text-white/50 hover:bg-[#e8e8e8]"
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a] border-b border-[#ececec] dark:border-white/10 mb-2">
        <div className="w-4 flex-shrink-0" />
        <span className="flex-1">Task</span>
        <span className="hidden sm:block w-32 flex-shrink-0">Labels</span>
        <span className="w-20 flex-shrink-0">Priority</span>
        <span className="hidden sm:block w-20 flex-shrink-0">Due</span>
        <span className="w-16 flex-shrink-0 text-right">Assigned</span>
        <span className="hidden md:block w-16 flex-shrink-0 text-right">Threads</span>
      </div>

      {columns.map((col) => (
        <ColumnGroup key={col.id} column={col} onTaskClick={onTaskClick} onAddTask={(id) => onAddTask?.(id)} sort={sort} onToggleDone={onToggleDone} />
      ))}
    </div>
  );
}
