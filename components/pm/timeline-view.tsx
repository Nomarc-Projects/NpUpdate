"use client";
import { useState, useMemo } from "react";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { PmColumn, PmMilestone, PmTask } from "@/lib/services/pm/types";
import { cn } from "@/lib/utils";

interface Props {
  columns: PmColumn[];
  milestones: PmMilestone[];
  projectStart?: string | null;
  projectEnd?: string | null;
  onTaskClick: (task: PmTask) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#e5484d",
  high: "#f97316",
  medium: "#6366f1",
  low: "#9a9a9a",
};

function allTasks(columns: PmColumn[]): PmTask[] {
  return columns.flatMap((c) => c.tasks);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function startOfWeek(d: Date): Date {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r;
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDay(d: Date) {
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}
function fmtWeekLabel(d: Date) {
  const end = addDays(d, 6);
  return `${d.toLocaleDateString("en-NG", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`;
}

type ZoomLevel = "day" | "week" | "month";

const ZOOM_DAYS: Record<ZoomLevel, number> = { day: 14, week: 8, month: 3 };
const CELL_PX: Record<ZoomLevel, number> = { day: 72, week: 120, month: 200 };

function buildHeaders(rangeStart: Date, count: number, zoom: ZoomLevel): { label: string; start: Date; days: number }[] {
  if (zoom === "day") {
    return Array.from({ length: count }, (_, i) => {
      const d = addDays(rangeStart, i);
      return { label: fmtDay(d), start: d, days: 1 };
    });
  }
  if (zoom === "week") {
    return Array.from({ length: count }, (_, i) => {
      const d = addDays(rangeStart, i * 7);
      return { label: fmtWeekLabel(d), start: d, days: 7 };
    });
  }
  // month
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1);
    return { label: d.toLocaleDateString("en-NG", { month: "long", year: "numeric" }), start: d, days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() };
  });
}

function dayOffset(rangeStart: Date, d: Date): number {
  return Math.round((d.getTime() - rangeStart.getTime()) / 86_400_000);
}

interface TaskBar {
  task: PmTask;
  startDayOffset: number;
  durationDays: number;
}

export function TimelineView({ columns, milestones, projectStart, projectEnd, onTaskClick }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const [pageOffset, setPageOffset] = useState(0);

  const tasks = allTasks(columns).filter((t) => t.startDate || t.dueDate);

  const { rangeStart, totalUnits } = useMemo(() => {
    const count = ZOOM_DAYS[zoom];
    let anchor: Date;
    if (zoom === "day") {
      anchor = addDays(new Date(), pageOffset * count);
      anchor.setHours(0, 0, 0, 0);
    } else if (zoom === "week") {
      anchor = startOfWeek(addDays(new Date(), pageOffset * count * 7));
    } else {
      const now = new Date();
      anchor = new Date(now.getFullYear(), now.getMonth() + pageOffset * count, 1);
    }
    return { rangeStart: anchor, totalUnits: count };
  }, [zoom, pageOffset]);

  const totalDays = useMemo(() => {
    if (zoom === "day") return totalUnits;
    if (zoom === "week") return totalUnits * 7;
    // month — approximate
    return Array.from({ length: totalUnits }, (_, i) => {
      const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i + 1, 0);
      return d.getDate();
    }).reduce((a, b) => a + b, 0);
  }, [zoom, totalUnits, rangeStart]);

  const rangeEnd = useMemo(() => addDays(rangeStart, totalDays), [rangeStart, totalDays]);
  const cellPx = CELL_PX[zoom];
  const totalWidth = totalUnits * cellPx;
  const dayPx = totalWidth / totalDays;

  const headers = useMemo(() => buildHeaders(rangeStart, totalUnits, zoom), [rangeStart, totalUnits, zoom]);

  const bars: TaskBar[] = useMemo(() => {
    return tasks.map((t) => {
      const startStr = t.startDate ?? t.dueDate!;
      const endStr = t.dueDate ?? t.startDate!;
      const start = new Date(startStr + "T00:00:00");
      const end = new Date(endStr + "T00:00:00");
      const startOff = dayOffset(rangeStart, start);
      const dur = Math.max(1, dayOffset(start, end) + 1);
      return { task: t, startDayOffset: startOff, durationDays: dur };
    }).filter((b) => b.startDayOffset < totalDays && b.startDayOffset + b.durationDays > 0);
  }, [tasks, rangeStart, totalDays]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOffset = dayOffset(rangeStart, today);
  const todayPx = todayOffset >= 0 && todayOffset < totalDays ? todayOffset * dayPx : null;

  const ZOOMS: ZoomLevel[] = ["day", "week", "month"];
  const LABEL_NAME_ROW_W = 180;

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] mb-4">
          <AlertCircle size={22} />
        </div>
        <h3 className="text-base font-bold text-[#1e1e1e] dark:text-white">No tasks with dates</h3>
        <p className="mt-2 text-[13px] text-[#9a9a9a] max-w-sm">Add start dates or due dates to your tasks to see them on the timeline.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Milestones strip */}
      {milestones.length > 0 && (
        <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
          {milestones.map((m) => (
            <div key={m.id} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border ${m.completed ? "border-[#22c55e]/30 bg-[#dcfce7] dark:bg-[#22c55e]/10" : "border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03]"}`}>
              <div className={`w-2 h-2 rounded-full ${m.completed ? "bg-[#22c55e]" : "bg-[#f59e0b]"}`} />
              <span className="text-[12px] font-medium text-[#1e1e1e] dark:text-white">{m.name}</span>
              {m.dueDate && <span className="text-[11px] text-[#9a9a9a]">{new Date(m.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setPageOffset((p) => p - 1)} className="w-8 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/10 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setPageOffset(0)} className="px-3 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/10 text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">Today</button>
          <button onClick={() => setPageOffset((p) => p + 1)} className="w-8 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/10 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex gap-1">
          {ZOOMS.map((z) => (
            <button key={z} onClick={() => { setZoom(z); setPageOffset(0); }}
              className={cn("px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-colors",
                zoom === z ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f0f0f0] dark:bg-white/5 text-[#6b6b6b] dark:text-white/50")}>
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt grid */}
      <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden bg-white dark:bg-[#1a1a1a]">
        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_NAME_ROW_W + totalWidth }}>
            {/* Header row */}
            <div className="flex border-b border-[#ececec] dark:border-white/10 sticky top-0 bg-white dark:bg-[#1a1a1a] z-10">
              {/* Name column header */}
              <div style={{ width: LABEL_NAME_ROW_W, minWidth: LABEL_NAME_ROW_W }} className="flex-shrink-0 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a] border-r border-[#ececec] dark:border-white/10">
                Task
              </div>
              {/* Date headers */}
              <div className="relative flex" style={{ width: totalWidth }}>
                {headers.map((h, i) => (
                  <div key={i} style={{ width: cellPx }} className="flex-shrink-0 px-2 py-2.5 text-[10px] font-medium text-[#9a9a9a] border-r border-[#ececec] dark:border-white/10 truncate last:border-r-0">
                    {h.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Task rows */}
            {bars.map((b) => {
              const done = !!b.task.completedAt;
              const barLeft = Math.max(0, b.startDayOffset) * dayPx;
              const barWidth = Math.max(dayPx * 0.5, Math.min(b.durationDays, totalDays - Math.max(0, b.startDayOffset)) * dayPx - 2);
              const color = done ? "#22c55e" : PRIORITY_COLOR[b.task.priority] ?? "#6366f1";

              return (
                <div key={b.task.id} className="flex border-b border-[#f5f5f5] dark:border-white/5 last:border-0 group hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors">
                  {/* Name */}
                  <div style={{ width: LABEL_NAME_ROW_W, minWidth: LABEL_NAME_ROW_W }} className="flex-shrink-0 px-4 py-3 flex items-center gap-2 border-r border-[#ececec] dark:border-white/10">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className={cn("text-[12px] truncate", done ? "line-through text-[#9a9a9a]" : "text-[#1e1e1e] dark:text-white")}>
                      {b.task.title}
                    </span>
                  </div>

                  {/* Bar track */}
                  <div className="flex-1 relative py-2" style={{ width: totalWidth }}>
                    {/* Grid lines */}
                    {headers.map((_, i) => (
                      <div key={i} className="absolute inset-y-0 border-r border-[#f0f0f0] dark:border-white/5" style={{ left: (i + 1) * cellPx }} />
                    ))}
                    {/* Today indicator */}
                    {todayPx !== null && (
                      <div className="absolute inset-y-0 w-px bg-[#ffd716]/60 z-10" style={{ left: todayPx }} />
                    )}
                    {/* Bar */}
                    <button
                      onClick={() => onTaskClick(b.task)}
                      style={{ left: barLeft, width: barWidth, background: color }}
                      className="absolute top-1.5 bottom-1.5 rounded-md flex items-center px-2 gap-1 text-white text-[10px] font-semibold opacity-90 hover:opacity-100 transition-opacity overflow-hidden cursor-pointer"
                      title={b.task.title}
                    >
                      <span className="truncate">{b.task.title}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-[#9a9a9a] flex-wrap">
        {[["urgent", "Urgent"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]].map(([p, l]) => (
          <span key={p} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PRIORITY_COLOR[p] }} />
            {l}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" /> Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-[#ffd716]/60 rounded-full" /> Today
        </span>
      </div>
    </div>
  );
}
