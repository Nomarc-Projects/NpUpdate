"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, Paperclip, CheckSquare } from "lucide-react";
import type { PmTask } from "@/lib/services/pm/types";
import { PriorityBadge } from "./priority-badge";
import { MemberAvatars } from "./member-avatars";
import { cn } from "@/lib/utils";

const TAG_COLORS: Record<string, string> = {
  "#ffd716": "bg-[#fff7cc] dark:bg-[#ffd716]/15 text-[#caa400] dark:text-[#ffd716]",
  "#6366f1": "bg-[#e0e7ff] dark:bg-[#6366f1]/20 text-[#4338ca] dark:text-[#818cf8]",
  "#22c55e": "bg-[#dcfce7] dark:bg-[#22c55e]/15 text-[#16803c] dark:text-[#4ade80]",
  "#f59e0b": "bg-[#fff3cd] dark:bg-[#f59e0b]/15 text-[#b45309] dark:text-[#fbbf24]",
  "#e5484d": "bg-[#fce8e8] dark:bg-[#e5484d]/15 text-[#b91c1c] dark:text-[#f87171]",
};

function tagCls(color: string) {
  return TAG_COLORS[color] ?? "bg-[#f0f0f0] dark:bg-white/10 text-[#6b6b6b] dark:text-white/60";
}

function isOverdue(due?: string | null, done?: string | null) {
  if (!due || done) return false;
  return new Date(due) < new Date();
}

interface Props {
  task: PmTask;
  isDragging?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, isDragging, onClick }: Props) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging: isSortDragging } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const done = !!task.completedAt;
  const overdue = isOverdue(task.dueDate, task.completedAt);
  const completedSubs = task.subtasks.filter((s) => s.status === "done").length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-white dark:bg-[#252525] p-3.5 cursor-pointer select-none transition-all",
        isSortDragging || isDragging
          ? "opacity-50 shadow-xl border-[#ffd716]/40 rotate-1"
          : "border-[#ececec] dark:border-white/10 hover:border-[#ffd716]/40 hover:shadow-sm"
      )}
    >
      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag.id} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tagCls(tag.color)}`}>{tag.name}</span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className={cn("text-[13px] font-medium leading-snug mb-2", done ? "line-through text-[#9a9a9a]" : "text-[#1e1e1e] dark:text-white")}>
        {task.title}
      </p>

      {/* Subtask progress */}
      {task.subtasks.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-[#9a9a9a] mb-1">
            <span className="flex items-center gap-0.5"><CheckSquare size={10} /> {completedSubs}/{task.subtasks.length}</span>
            <span>{Math.round((completedSubs / task.subtasks.length) * 100)}%</span>
          </div>
          <div className="h-1 rounded-full bg-[#f0f0f0] dark:bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-[#22c55e] transition-all" style={{ width: `${(completedSubs / task.subtasks.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {task.dueDate && (
            <span className={cn("flex items-center gap-0.5 text-[11px]", overdue ? "text-[#e5484d]" : "text-[#9a9a9a]")}>
              <Calendar size={10} />
              {new Date(task.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(task._commentCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-[#9a9a9a]">
              <MessageSquare size={10} /> {task._commentCount}
            </span>
          )}
          {(task._attachmentCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-[#9a9a9a]">
              <Paperclip size={10} /> {task._attachmentCount}
            </span>
          )}
          {task.assignees.length > 0 && <MemberAvatars members={task.assignees} max={2} size={5} />}
        </div>
      </div>
    </div>
  );
}

export function TaskCardOverlay({ task }: { task: PmTask }) {
  return (
    <div className="rounded-xl border border-[#ffd716]/40 bg-white dark:bg-[#252525] p-3.5 shadow-xl rotate-2 opacity-95 w-[260px]">
      <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">{task.title}</p>
    </div>
  );
}
