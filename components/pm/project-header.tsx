"use client";
import Link from "next/link";
import { useState } from "react";
import {
  KanbanSquare, List, Calendar, GanttChartSquare,
  Users, ChevronRight, Plus, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PmProject } from "@/lib/services/pm/types";
import { MemberAvatars } from "./member-avatars";

type View = "board" | "list" | "calendar" | "timeline";

const VIEWS: { id: View; label: string; icon: typeof KanbanSquare }[] = [
  { id: "board",    label: "Board",    icon: KanbanSquare },
  { id: "list",     label: "List",     icon: List },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
];

const STATUS_MAP = {
  active:    { label: "Active",    className: "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/20 dark:text-[#4ade80]" },
  completed: { label: "Completed", className: "bg-[#e0edff] text-[#1d4ed8] dark:bg-[#6366f1]/20 dark:text-[#818cf8]" },
  archived:  { label: "Archived",  className: "bg-[#f1f1f1] dark:bg-white/10 text-[#9a9a9a]" },
};

interface Props {
  project: PmProject;
  view: View;
  onAddTask?: () => void;
  onViewChange?: (view: View) => void;
  onTeamClick?: () => void;
}

export function ProjectHeader({ project, view, onAddTask, onViewChange, onTeamClick }: Props) {
  const status = STATUS_MAP[project.status] ?? STATUS_MAP.active;

  const completedMilestones = project.milestones.filter((m) => m.completed).length;

  return (
    <div className="border-b border-[#f0f0f0] dark:border-white/10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-6 pt-5 pb-3 text-[12px] text-[#9a9a9a]">
        <Link href="/dashboard/project-management" className="hover:text-[#ffd716] transition-colors">Projects</Link>
        <ChevronRight size={12} />
        <span className="text-[#1e1e1e] dark:text-white font-medium truncate">{project.name}</span>
      </div>

      {/* Project title row */}
      <div className="px-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: project.color + "22" }}>
            <div className="w-3.5 h-3.5 rounded-sm" style={{ background: project.color }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white leading-tight">{project.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.className}`}>{status.label}</span>
            </div>
            {project.description && (
              <p className="text-[12px] text-[#9a9a9a] mt-0.5 truncate max-w-lg">{project.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <MemberAvatars members={project.members} max={4} size={7} />
          <button onClick={onTeamClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/10 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
            <Users size={14} /> Team
          </button>
          <button onClick={onAddTask} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">
            <Plus size={14} /> Add task
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-6 pb-3 flex items-center gap-6 text-[12px] text-[#9a9a9a] flex-wrap">
        <span><span className="font-semibold text-[#1e1e1e] dark:text-white">{project._taskDone}</span>/{project._taskTotal} tasks done</span>
        {(project._taskOverdue ?? 0) > 0 && (
          <span className="text-[#e5484d]"><span className="font-semibold">{project._taskOverdue}</span> overdue</span>
        )}
        <span>
          <CheckCircle2 size={12} className="inline mr-1 text-[#22c55e]" />
          <span className="font-semibold text-[#1e1e1e] dark:text-white">{completedMilestones}</span>/{project.milestones.length} milestones
        </span>
        {project.dueDate && (
          <span>Due <span className="font-semibold text-[#1e1e1e] dark:text-white">{new Date(project.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span></span>
        )}
      </div>

      {/* View tabs */}
      <div className="px-6 flex items-center gap-1 border-t border-[#f0f0f0] dark:border-white/10 pt-1">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange?.(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors",
              view === id
                ? "border-[#ffd716] text-[#1e1e1e] dark:text-white"
                : "border-transparent text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
