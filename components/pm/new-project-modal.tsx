"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { createProject } from "@/lib/services/pm/projects";

const COLORS = [
  "#ffd716", "#6366f1", "#22c55e", "#e5484d", "#f59e0b",
  "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
];

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!name.trim()) { toast.error("Project name is required"); return; }
    start(async () => {
      try {
        const { id } = await createProject({ name: name.trim(), description: desc, color, startDate, dueDate, ownerUserId: "me" });
        toast.success("Project created");
        onClose();
        setName(""); setDesc("");
        router.push(`/dashboard/project-management/${id}`);
        router.refresh();
      } catch {
        toast.error("Could not create project");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New project" subtitle="Set up a workspace for your construction project."
      maxWidth="max-w-[520px]"
      footer={<><GhostButton onClick={onClose}>Cancel</GhostButton><PrimaryButton onClick={submit} disabled={pending}>{pending ? "Creating…" : "Create project"}</PrimaryButton></>}>
      <div className="space-y-4">
        <Field label="Project name">
          <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ibeju-Lekki Estate Phase 1" />
        </Field>
        <Field label="Description" hint="Optional">
          <textarea rows={2} className={inputClass + " resize-none"} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief overview of the project…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date" hint="Optional">
            <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
          </Field>
          <Field label="Due date" hint="Optional">
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="Due date" />
          </Field>
        </div>
        <div>
          <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white mb-2">Project colour</p>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                style={{ background: c }}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1e1e1e] ring-[#1e1e1e] dark:ring-white scale-110" : "hover:scale-105"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
