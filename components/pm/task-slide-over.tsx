"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Calendar, User, Flag, Tag, Paperclip, MessageSquare,
  CheckSquare, Plus, ChevronDown, CheckCircle2, Circle,
  Clock, Trash2, Edit2, Link2, Check, AlertTriangle,
} from "lucide-react";
import type { PmTask, PmMember, Priority, TaskStatus, PmSubtask } from "@/lib/services/pm/types";
import { PriorityBadge } from "./priority-badge";
import { MemberAvatars } from "./member-avatars";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

/* ─── constants ─────────────────────────────────────────────────────── */

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "urgent", label: "Urgent", color: "#e5484d" },
  { value: "high",   label: "High",   color: "#f97316" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "low",    label: "Low",    color: "#9a9a9a" },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; dot: string }[] = [
  { value: "todo",        label: "To Do",       dot: "#9a9a9a" },
  { value: "in_progress", label: "In Progress", dot: "#6366f1" },
  { value: "blocked",     label: "Blocked",     dot: "#e5484d" },
  { value: "review",      label: "In Review",   dot: "#f59e0b" },
  { value: "done",        label: "Done",        dot: "#22c55e" },
];

/* ─── small helpers ─────────────────────────────────────────────────── */

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[#f0f0f0] dark:border-white/10 pt-4">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors w-full mb-3">
        <ChevronDown size={13} className={cn("transition-transform", open ? "" : "-rotate-90")} />
        {title}
      </button>
      {open && children}
    </div>
  );
}

/** Click-outside-closing popover wrapper */
function Popover({ open, onClose, anchor, children }: { open: boolean; onClose: () => void; anchor: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative">
      {anchor}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute z-[200] top-full left-0 mt-1 min-w-[160px] rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-[0_12px_40px_rgba(0,0,0,0.18)] py-1">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubtaskItem({ sub, onToggle, onDelete }: { sub: PmSubtask; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const done = sub.status === "done";
  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <button onClick={() => onToggle(sub.id)} className={`flex-shrink-0 ${done ? "text-[#22c55e]" : "text-[#d1d5db] hover:text-[#22c55e]"} transition-colors`}>
        {done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
      </button>
      <span className={cn("text-[13px] flex-1", done ? "line-through text-[#9a9a9a]" : "text-[#1e1e1e] dark:text-white")}>{sub.title}</span>
      <button onClick={() => onDelete(sub.id)} className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-[#e5484d] transition-all">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

interface LocalComment { id: string; authorName: string; body: string; createdAt: string }

function CommentBubble({ comment }: { comment: LocalComment }) {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-[10px] flex-shrink-0">
        {(comment.authorName ?? "?").slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white">{comment.authorName}</span>
          <span className="text-[11px] text-[#9a9a9a]">{new Date(comment.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="rounded-xl bg-[#f7f8fa] dark:bg-white/[0.04] px-3 py-2.5 text-[13px] text-[#1e1e1e] dark:text-white/80 leading-relaxed">
          {comment.body}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ type, actor, meta }: { type: string; actor: string; meta?: string }) {
  const MAP: Record<string, string> = {
    task_created: "created this task", task_moved: "moved to", task_assigned: "assigned to",
    status_changed: "changed status to", comment_added: "commented", due_date_set: "set due date to",
    priority_changed: "changed priority to",
  };
  return (
    <div className="flex gap-2.5 text-[12px] text-[#9a9a9a]">
      <div className="w-5 h-5 rounded-full bg-[#ffd716]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#caa400]" />
      </div>
      <span><span className="font-medium text-[#1e1e1e] dark:text-white">{actor}</span> {MAP[type] ?? type}{meta && <span className="font-medium text-[#1e1e1e] dark:text-white"> {meta}</span>}</span>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────── */

interface Props {
  task: PmTask | null;
  members: PmMember[];
  onClose: () => void;
  onUpdate?: (patch: Partial<PmTask>) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskSlideOver({ task, members, onClose, onUpdate, onDelete }: Props) {
  const [subtasks, setSubtasks] = useState<PmSubtask[]>(task?.subtasks ?? []);
  const [localComments, setLocalComments] = useState<LocalComment[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [comment, setComment] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");

  // Editing states
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [estHours, setEstHours] = useState("");
  const [actHours, setActHours] = useState("");

  // Popover states
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setSubtasks(task?.subtasks ?? []);
    setLocalComments([]);
    setEditingDesc(false);
    setConfirmDelete(false);
    setEstHours(String(task?.estimateHours ?? ""));
    setActHours(String(task?.actualHours ?? ""));
  }, [task?.id]);

  if (!task) return null;

  const done = !!task.completedAt;
  const doneCount = subtasks.filter((s) => s.status === "done").length;
  const statusMeta = STATUS_OPTIONS.find((s) => s.value === task.status) ?? STATUS_OPTIONS[0];
  const allComments: LocalComment[] = [
    ...task.comments.map((c) => ({ id: c.id, authorName: c.authorName ?? "Member", body: c.body, createdAt: c.createdAt })),
    ...localComments,
  ];

  function toggleSubtask(id: string) {
    setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, status: s.status === "done" ? "todo" : "done" } : s));
  }
  function deleteSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }
  function addSubtask() {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { id: `sub-${Date.now()}`, title: newSubtask.trim(), status: "todo", sortOrder: String(Date.now()) }]);
    setNewSubtask(""); setAddingSub(false);
  }

  function submitComment() {
    if (!comment.trim()) return;
    setLocalComments((prev) => [...prev, { id: `lc-${Date.now()}`, authorName: "You", body: comment.trim(), createdAt: new Date().toISOString() }]);
    setComment("");
  }

  function saveDesc() {
    onUpdate?.({ description: descDraft.trim() || null });
    setEditingDesc(false);
  }

  function saveEstimate() {
    onUpdate?.({ estimateHours: estHours ? Number(estHours) : null, actualHours: actHours ? Number(actHours) : null });
    setEditingEstimate(false);
  }

  function handleDelete() {
    onDelete?.(task!.id);
    onClose();
  }

  const assigneeIds = new Set(task.assignees.map((a) => a.userId));

  function toggleAssignee(m: PmMember) {
    const next = assigneeIds.has(m.userId)
      ? task!.assignees.filter((a) => a.userId !== m.userId)
      : [...task!.assignees, m];
    onUpdate?.({ assignees: next });
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 backdrop-blur-[2px]" onClick={onClose} />

          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[560px] bg-white dark:bg-[#1a1a1a] shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <button onClick={() => onUpdate?.({ completedAt: done ? undefined : new Date().toISOString(), status: done ? "todo" : "done" })}
                  className={`mt-0.5 flex-shrink-0 ${done ? "text-[#22c55e]" : "text-[#d1d5db] hover:text-[#22c55e]"} transition-colors`}>
                  {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>
                <h2 className={cn("text-[15px] font-bold leading-snug", done ? "line-through text-[#9a9a9a]" : "text-[#1e1e1e] dark:text-white")}>
                  {task.title}
                </h2>
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 flex-shrink-0 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">

                {/* Properties grid */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Status */}
                  <Popover open={statusOpen} onClose={() => setStatusOpen(false)}
                    anchor={
                      <button onClick={() => setStatusOpen((o) => !o)}
                        className="w-full rounded-xl border border-[#ececec] dark:border-white/10 p-3 text-left hover:border-[#ffd716] transition-colors">
                        <p className="text-[11px] text-[#9a9a9a] mb-1.5">Status</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusMeta.dot }} />
                          <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{statusMeta.label}</span>
                        </div>
                      </button>
                    }>
                    {STATUS_OPTIONS.map((s) => (
                      <button key={s.value} onClick={() => { onUpdate?.({ status: s.value }); setStatusOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                        {s.label}
                        {task.status === s.value && <Check size={13} className="ml-auto text-[#caa400]" />}
                      </button>
                    ))}
                  </Popover>

                  {/* Priority */}
                  <Popover open={priorityOpen} onClose={() => setPriorityOpen(false)}
                    anchor={
                      <button onClick={() => setPriorityOpen((o) => !o)}
                        className="w-full rounded-xl border border-[#ececec] dark:border-white/10 p-3 text-left hover:border-[#ffd716] transition-colors">
                        <p className="text-[11px] text-[#9a9a9a] mb-1.5">Priority</p>
                        <PriorityBadge priority={task.priority} showLabel />
                      </button>
                    }>
                    {PRIORITY_OPTIONS.map((p) => (
                      <button key={p.value} onClick={() => { onUpdate?.({ priority: p.value }); setPriorityOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        {p.label}
                        {task.priority === p.value && <Check size={13} className="ml-auto text-[#caa400]" />}
                      </button>
                    ))}
                  </Popover>

                  {/* Due date */}
                  <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-3 hover:border-[#ffd716] transition-colors cursor-pointer" onClick={() => setDateOpen((o) => !o)}>
                    <p className="text-[11px] text-[#9a9a9a] mb-1.5 flex items-center gap-1"><Calendar size={11} /> Due date</p>
                    {dateOpen ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <DatePicker
                          value={task.dueDate ?? ""}
                          onChange={(iso) => { onUpdate?.({ dueDate: iso || null }); setDateOpen(false); }}
                          placeholder="Pick a date"
                        />
                      </div>
                    ) : (
                      <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })
                          : <span className="text-[#9a9a9a]">Not set</span>}
                      </span>
                    )}
                  </div>

                  {/* Estimate */}
                  <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-3 hover:border-[#ffd716] transition-colors cursor-pointer" onClick={() => !editingEstimate && setEditingEstimate(true)}>
                    <p className="text-[11px] text-[#9a9a9a] mb-1.5 flex items-center gap-1"><Clock size={11} /> Estimate</p>
                    {editingEstimate ? (
                      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min={0} value={estHours} onChange={(e) => setEstHours(e.target.value)} placeholder="Est h"
                            className="w-16 text-[12px] border border-[#e3e3e3] dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/[0.03] text-[#1e1e1e] dark:text-white outline-none focus:border-[#ffd716]" />
                          <input type="number" min={0} value={actHours} onChange={(e) => setActHours(e.target.value)} placeholder="Act h"
                            className="w-16 text-[12px] border border-[#e3e3e3] dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/[0.03] text-[#1e1e1e] dark:text-white outline-none focus:border-[#ffd716]" />
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={saveEstimate} className="px-2 py-0.5 rounded-md bg-[#ffd716] text-[#1e1e1e] text-[11px] font-semibold">Save</button>
                          <button onClick={() => setEditingEstimate(false)} className="px-2 py-0.5 rounded-md text-[#9a9a9a] text-[11px]">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">
                        {task.estimateHours ? `${task.estimateHours}h est. / ${task.actualHours ?? 0}h logged` : <span className="text-[#9a9a9a]">Not set</span>}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignees */}
                <Section title="Assignees">
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.assignees.length > 0 ? (
                      <>
                        <MemberAvatars members={task.assignees} max={6} size={7} />
                        <span className="text-[12px] text-[#9a9a9a]">{task.assignees.map((a) => a.name).join(", ")}</span>
                      </>
                    ) : (
                      <span className="text-[13px] text-[#9a9a9a]">No assignees</span>
                    )}
                    <Popover open={assigneeOpen} onClose={() => setAssigneeOpen(false)}
                      anchor={
                        <button onClick={() => setAssigneeOpen((o) => !o)} className="ml-auto flex items-center gap-1 text-[12px] text-[#9a9a9a] hover:text-[#ffd716] transition-colors">
                          <Plus size={13} /> Assign
                        </button>
                      }>
                      {members.map((m) => (
                        <button key={m.id} onClick={() => toggleAssignee(m)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
                          <div className="w-6 h-6 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-[9px] flex-shrink-0">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="flex-1">{m.name}</span>
                          {assigneeIds.has(m.userId) && <Check size={13} className="text-[#caa400]" />}
                        </button>
                      ))}
                    </Popover>
                  </div>
                </Section>

                {/* Labels */}
                {task.tags.length > 0 && (
                  <Section title="Labels">
                    <div className="flex gap-1.5 flex-wrap">
                      {task.tags.map((t) => (
                        <span key={t.id} className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: t.color + "22", color: t.color }}>
                          {t.name}
                        </span>
                      ))}
                      <button className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] text-[#9a9a9a] border border-dashed border-[#e3e3e3] dark:border-white/10 hover:border-[#ffd716] hover:text-[#caa400] transition-colors">
                        <Plus size={11} /> Add label
                      </button>
                    </div>
                  </Section>
                )}

                {/* Description */}
                <Section title="Description">
                  {editingDesc ? (
                    <div className="space-y-2">
                      <textarea autoFocus rows={5} value={descDraft}
                        onChange={(e) => setDescDraft(e.target.value)}
                        className="w-full text-[13px] border border-[#ffd716] rounded-xl px-3 py-2.5 bg-white dark:bg-white/[0.03] text-[#1e1e1e] dark:text-white placeholder-[#9a9a9a] outline-none resize-none"
                        placeholder="Add a description…" />
                      <div className="flex gap-2">
                        <button onClick={saveDesc} className="px-3 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12px] font-semibold">Save</button>
                        <button onClick={() => setEditingDesc(false)} className="px-3 py-1.5 rounded-lg text-[#9a9a9a] text-[12px]">Cancel</button>
                      </div>
                    </div>
                  ) : task.description ? (
                    <div className="group relative">
                      <div className="text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3 min-h-[80px]">
                        {task.description}
                      </div>
                      <button onClick={() => { setDescDraft(task.description ?? ""); setEditingDesc(true); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-[#2a2a2a] border border-[#e3e3e3] dark:border-white/10 text-[#9a9a9a] hover:text-[#ffd716] transition-all">
                        <Edit2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setDescDraft(""); setEditingDesc(true); }}
                      className="w-full text-left rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-dashed border-[#e3e3e3] dark:border-white/10 p-3 text-[13px] text-[#9a9a9a] hover:border-[#ffd716] transition-colors min-h-[80px] flex items-center justify-center gap-1.5">
                      <Edit2 size={13} /> Add a description…
                    </button>
                  )}
                </Section>

                {/* Subtasks */}
                <Section title={`Subtasks (${doneCount}/${subtasks.length})`}>
                  {subtasks.length > 0 && (
                    <>
                      <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/5 mb-3 overflow-hidden">
                        <div className="h-full rounded-full bg-[#22c55e] transition-all" style={{ width: `${subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : 0}%` }} />
                      </div>
                      <div className="space-y-0.5">
                        {subtasks.map((s) => <SubtaskItem key={s.id} sub={s} onToggle={toggleSubtask} onDelete={deleteSubtask} />)}
                      </div>
                    </>
                  )}
                  {addingSub ? (
                    <div className="flex gap-2 mt-2">
                      <input autoFocus value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") setAddingSub(false); }}
                        placeholder="Subtask title…"
                        className="flex-1 text-[13px] border border-[#e3e3e3] dark:border-white/10 rounded-lg px-3 py-1.5 bg-white dark:bg-white/[0.03] text-[#1e1e1e] dark:text-white placeholder-[#9a9a9a] outline-none focus:border-[#ffd716]" />
                      <button onClick={addSubtask} className="px-3 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12px] font-semibold">Add</button>
                      <button onClick={() => setAddingSub(false)} className="px-3 py-1.5 rounded-lg text-[#9a9a9a] text-[12px]">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingSub(true)} className="mt-2 flex items-center gap-1.5 text-[12px] text-[#9a9a9a] hover:text-[#ffd716] transition-colors">
                      <Plus size={13} /> Add subtask
                    </button>
                  )}
                </Section>

                {/* Attachments */}
                <Section title={`Attachments (${task._attachmentCount ?? 0})`} defaultOpen={false}>
                  {task.attachments.length === 0 ? (
                    <label className="w-full flex items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-[#e3e3e3] dark:border-white/10 text-[13px] text-[#9a9a9a] hover:border-[#ffd716] hover:text-[#caa400] transition-colors cursor-pointer">
                      <input type="file" className="sr-only" onChange={() => {}} />
                      <Paperclip size={15} /> Attach files
                    </label>
                  ) : (
                    <div className="space-y-2">
                      {task.attachments.map((a) => (
                        <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-[#ececec] dark:border-white/10 p-3">
                          <Paperclip size={14} className="text-[#9a9a9a] flex-shrink-0" />
                          <span className="flex-1 text-[13px] text-[#1e1e1e] dark:text-white truncate">{a.name}</span>
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[#9a9a9a] hover:text-[#ffd716] transition-colors"><Link2 size={13} /></a>
                        </div>
                      ))}
                      <label className="flex items-center gap-1.5 text-[12px] text-[#9a9a9a] hover:text-[#ffd716] transition-colors cursor-pointer">
                        <input type="file" className="sr-only" onChange={() => {}} />
                        <Plus size={13} /> Add attachment
                      </label>
                    </div>
                  )}
                </Section>

                {/* Comments & Activity */}
                <Section title="Comments & Activity">
                  <div className="flex gap-1 mb-4">
                    {(["comments", "activity"] as const).map((t) => (
                      <button key={t} onClick={() => setActiveTab(t)}
                        className={cn("px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-colors",
                          activeTab === t ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f0f0f0] dark:bg-white/5 text-[#6b6b6b] dark:text-white/50")}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {activeTab === "comments" && (
                    <div className="space-y-4">
                      {allComments.length === 0 && (
                        <p className="text-[13px] text-[#9a9a9a] text-center py-4">No comments yet. Be the first to share an update.</p>
                      )}
                      {allComments.map((c) => <CommentBubble key={c.id} comment={c} />)}
                      <div className="flex gap-2.5 pt-2 border-t border-[#f0f0f0] dark:border-white/10">
                        <div className="w-7 h-7 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-[10px] flex-shrink-0">YO</div>
                        <div className="flex-1">
                          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment(); }}
                            placeholder="Leave a comment… (⌘↵ to send)"
                            className="w-full text-[13px] border border-[#e3e3e3] dark:border-white/10 rounded-xl px-3 py-2.5 bg-white dark:bg-white/[0.03] text-[#1e1e1e] dark:text-white placeholder-[#9a9a9a] outline-none focus:border-[#ffd716] resize-none" />
                          <div className="flex justify-end mt-1.5">
                            <button disabled={!comment.trim()} onClick={submitComment}
                              className="px-3 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e6c114] transition-colors">
                              <MessageSquare size={12} className="inline mr-1" /> Comment
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "activity" && (
                    <div className="space-y-3">
                      <ActivityItem type="task_created" actor="Sandra James" />
                      <ActivityItem type="task_assigned" actor="Sandra James" meta="Tunde Bakare" />
                      <ActivityItem type="priority_changed" actor="Tunde Bakare" meta="High" />
                      <ActivityItem type="status_changed" actor="Sandra James" meta="In Progress" />
                    </div>
                  )}
                </Section>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#f0f0f0] dark:border-white/10 px-5 py-3 flex items-center justify-between text-[11px] text-[#9a9a9a] flex-shrink-0">
              <span>Created {new Date(task.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-[#e5484d]" />
                  <span className="text-[#e5484d] font-medium">Delete this task?</span>
                  <button onClick={handleDelete} className="px-2.5 py-1 rounded-lg bg-[#e5484d] text-white text-[11px] font-semibold">Yes, delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 rounded-lg border border-[#e3e3e3] dark:border-white/10 text-[11px]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-[#e5484d] hover:text-[#b91c1c] transition-colors">
                  <Trash2 size={13} /> Delete task
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
