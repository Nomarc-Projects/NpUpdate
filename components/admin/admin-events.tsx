"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dashboard/kit/confirm-dialog";
import { createEvent, updateEvent, deleteEvent, type EventItem, type EventCategory, type EventFormat } from "@/lib/services/events";

const CATEGORIES: EventCategory[] = ["industry", "conference", "workshop", "webinar", "training", "site_visit", "networking"];
const FORMATS: EventFormat[] = ["in_person", "online", "hybrid"];

type FormState = {
  title: string; organizer: string; category: EventCategory; format: EventFormat;
  startsAt: string; endsAt: string; location: string; description: string;
  externalUrl: string; imageUrl: string; published: boolean;
};

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const emptyForm: FormState = {
  title: "", organizer: "", category: "industry", format: "in_person",
  startsAt: "", endsAt: "", location: "", description: "", externalUrl: "", imageUrl: "", published: true,
};

function label(c: string) {
  return c.replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function AdminEvents({ initial }: { initial: EventItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function openNew() { setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(e: EventItem) {
    setEditId(e.id);
    setForm({
      title: e.title, organizer: e.organizer ?? "", category: e.category, format: e.format,
      startsAt: toLocal(e.startsAt), endsAt: toLocal(e.endsAt), location: e.location ?? "",
      description: e.description ?? "", externalUrl: e.externalUrl ?? "", imageUrl: e.imageUrl ?? "",
      published: e.published,
    });
    setOpen(true);
  }

  function save() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.startsAt) { toast.error("Pick a start date and time"); return; }
    start(async () => {
      try {
        const payload = { ...form, endsAt: form.endsAt || undefined };
        if (editId) await updateEvent(editId, payload); else await createEvent(payload);
        toast.success(editId ? "Event updated" : "Event created");
        setOpen(false); setEditId(null);
        router.refresh();
      } catch { toast.error("Could not save the event"); }
    });
  }

  function remove() {
    if (!confirmId) return;
    start(async () => {
      try { await deleteEvent(confirmId); toast.success("Event deleted"); router.refresh(); }
      catch { toast.error("Could not delete the event"); }
      finally { setConfirmId(null); }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1e1e1e] dark:text-white">Industry Events</h1>
          <p className="text-[13px] text-[#9a9a9a]">Curate the events shown on the member Events page.</p>
        </div>
        <PrimaryButton onClick={openNew}><Plus size={15} /> New event</PrimaryButton>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e5e5e5] dark:border-white/15 p-10 text-center text-[13px] text-[#9a9a9a]">
          No events yet — create the first one.
        </div>
      ) : (
        <div className="space-y-2">
          {initial.map((e) => (
            <div key={e.id} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#181818] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#fffdf2] dark:bg-[#ffd716]/10 text-[#caa400] dark:text-[#ffd716] flex items-center justify-center flex-shrink-0">
                <CalendarDays size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white truncate">{e.title}</p>
                  {!e.published && <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#b91c1c]">Draft</span>}
                </div>
                <p className="text-[11.5px] text-[#9a9a9a] truncate">
                  {new Date(e.startsAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  {" · "}{label(e.category)} · {label(e.format)}{e.location ? ` · ${e.location}` : ""} · {e.goingCount} going
                </p>
              </div>
              <GhostButton onClick={() => openEdit(e)} aria-label={`Edit ${e.title}`}><Pencil size={14} /></GhostButton>
              <GhostButton onClick={() => setConfirmId(e.id)} aria-label={`Delete ${e.title}`}><Trash2 size={14} /></GhostButton>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)}
        title={editId ? "Edit event" : "New event"}
        subtitle="Members see published events on /dashboard/events"
        maxWidth="max-w-[560px]"
        footer={
          <>
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={save} disabled={pending}>{pending ? "Saving…" : "Save event"}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Title">
              <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Nigeria Construction Summit 2026" />
            </Field>
          </div>
          <Field label="Organizer">
            <input className={inputClass} value={form.organizer} onChange={(e) => set("organizer", e.target.value)} placeholder="Nomarc Projects" />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value as EventCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </Field>
          <Field label="Starts">
            <input type="datetime-local" className={inputClass} value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </Field>
          <Field label="Ends (optional)">
            <input type="datetime-local" className={inputClass} value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </Field>
          <Field label="Format">
            <select className={inputClass} value={form.format} onChange={(e) => set("format", e.target.value as EventFormat)}>
              {FORMATS.map((f) => <option key={f} value={f}>{label(f)}</option>)}
            </select>
          </Field>
          <Field label="Location (venue or link)">
            <input className={inputClass} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Landmark Centre, Lagos" />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
          <Field label="External URL">
            <input className={inputClass} value={form.externalUrl} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Image URL">
            <input className={inputClass} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-[13px] font-semibold text-[#1e1e1e] dark:text-white cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="accent-[#ffd716] w-4 h-4" />
            Published (visible to members)
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={remove}
        title="Delete this event?" loading={pending}
        description="Members' RSVPs are removed with it. This cannot be undone."
      />
    </div>
  );
}
