"use client";
import { useState } from "react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { DatePicker } from "@/components/ui/date-picker";
import type { PmColumn, Priority } from "@/lib/services/pm/types";

const PRIORITY_NAMES = ["Low", "Medium", "High", "Urgent"];
const PRIORITY_VALUES: Record<string, Priority> = { Low: "low", Medium: "medium", High: "high", Urgent: "urgent" };

interface Props {
  open: boolean;
  onClose: () => void;
  columns: PmColumn[];
  defaultColumnId?: string;
  defaultDueDate?: string;
  onAdd: (task: { title: string; columnId: string; priority: Priority; dueDate?: string; description?: string }) => void;
}

export function AddTaskModal({ open, onClose, columns, defaultColumnId, defaultDueDate, onAdd }: Props) {
  const defaultCol = columns.find((c) => c.id === defaultColumnId) ?? columns[0];
  const [title, setTitle] = useState("");
  const [colName, setColName] = useState(defaultCol?.name ?? "");
  const [priorityName, setPriorityName] = useState("Medium");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [description, setDescription] = useState("");

  const colByName = Object.fromEntries(columns.map((c) => [c.name, c.id]));

  function submit() {
    if (!title.trim()) return;
    const columnId = colByName[colName] ?? columns[0]?.id ?? "";
    const priority = PRIORITY_VALUES[priorityName] ?? "medium";
    onAdd({ title: title.trim(), columnId, priority, dueDate: dueDate || undefined, description: description || undefined });
    setTitle(""); setDueDate(""); setDescription("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add task" subtitle="Create a new task in this project."
      maxWidth="max-w-[480px]"
      footer={<><GhostButton onClick={onClose}>Cancel</GhostButton><PrimaryButton onClick={submit} disabled={!title.trim()}>Add task</PrimaryButton></>}>
      <div className="space-y-4">
        <Field label="Task title">
          <input autoFocus className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Review structural drawings — Block A" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Column">
            <SelectMenu value={colName} onChange={setColName} options={columns.map((c) => c.name)} placeholder="Select column" />
          </Field>
          <Field label="Priority">
            <SelectMenu value={priorityName} onChange={setPriorityName} options={PRIORITY_NAMES} placeholder="Priority" />
          </Field>
        </div>
        <Field label="Due date" hint="Optional">
          <DatePicker value={dueDate} onChange={setDueDate} placeholder="Pick a due date" />
        </Field>
        <Field label="Description" hint="Optional">
          <textarea rows={2} className={inputClass + " resize-none"} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief task description…" />
        </Field>
      </div>
    </Modal>
  );
}
