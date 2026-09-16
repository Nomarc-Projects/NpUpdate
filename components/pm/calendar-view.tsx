"use client";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState, useCallback } from "react";
import { Calendar as BigCalendar, momentLocalizer, type Event } from "react-big-calendar";
import moment from "moment";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { PmColumn, PmTask } from "@/lib/services/pm/types";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const localizer = momentLocalizer(moment);

const PRIORITY_BG: Record<string, string> = {
  urgent: "#e5484d",
  high: "#f97316",
  medium: "#6366f1",
  low: "#9a9a9a",
};

interface CalEvent extends Event {
  task: PmTask;
}

function allTasks(columns: PmColumn[]): PmTask[] {
  return columns.flatMap((c) => c.tasks);
}

interface Props {
  columns: PmColumn[];
  onTaskClick: (task: PmTask) => void;
  onAddTask?: (dueDate?: string) => void;
}

export function CalendarView({ columns, onTaskClick, onAddTask }: Props) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "agenda">("month");

  const events: CalEvent[] = allTasks(columns)
    .filter((t) => t.dueDate)
    .map((t) => ({
      title: t.title,
      start: new Date(t.dueDate!),
      end: new Date(t.dueDate!),
      allDay: true,
      task: t,
    }));

  const eventStyleGetter = useCallback((event: CalEvent) => {
    const bg = PRIORITY_BG[event.task.priority] ?? "#6366f1";
    const done = !!event.task.completedAt;
    return {
      style: {
        backgroundColor: done ? "#22c55e" : bg,
        borderRadius: "6px",
        border: "none",
        color: "#fff",
        fontSize: "11px",
        fontWeight: 600,
        padding: "2px 6px",
        opacity: done ? 0.7 : 1,
        textDecoration: done ? "line-through" : "none",
      },
    };
  }, []);

  const navigate = (dir: 1 | -1) => {
    const d = new Date(date);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + 7 * dir);
    setDate(d);
  };

  const VIEWS: { id: "month" | "week" | "agenda"; label: string }[] = [
    { id: "month", label: "Month" },
    { id: "week", label: "Week" },
    { id: "agenda", label: "Agenda" },
  ];

  return (
    <div>
      {/* Custom toolbar */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/10 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white min-w-[160px] text-center">
            {date.toLocaleDateString("en-NG", { month: "long", year: "numeric" })}
          </h3>
          <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/10 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setDate(new Date())} className="px-3 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/10 text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">Today</button>
        </div>
        <div className="flex gap-1">
          {VIEWS.map(({ id, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${view === id ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f0f0f0] dark:bg-white/5 text-[#6b6b6b] dark:text-white/50"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="pm-calendar rounded-xl overflow-hidden border border-[#ececec] dark:border-white/10" style={{ height: 600 }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          date={date}
          view={view}
          onNavigate={setDate}
          onView={(v: string) => setView(v as "month" | "week" | "agenda")}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(e: object) => onTaskClick((e as CalEvent).task)}
          selectable
          onSelectSlot={({ start }: { start: Date | string }) => onAddTask?.(toISO(new Date(start)))}
          toolbar={false}
          popup
          style={{ height: "100%" }}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-[#9a9a9a] flex-wrap">
        {[["urgent", "Urgent"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]].map(([p, l]) => (
          <span key={p} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PRIORITY_BG[p] }} />
            {l} priority
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" />
          Completed
        </span>
      </div>
    </div>
  );
}
