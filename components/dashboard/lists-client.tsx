"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { List as ListIcon, Plus, Users, Trash2, Pencil } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { createList, deleteList, renameList, type ListWithCount } from "@/lib/services/lists";

export function ListsClient({ initial }: { initial: ListWithCount[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pending, start] = useTransition();

  function openNew() { setEditId(null); setName(""); setDesc(""); setOpen(true); }
  function openEdit(l: ListWithCount) { setEditId(l.id); setName(l.name); setDesc(l.description ?? ""); setOpen(true); }

  function create() {
    if (!name.trim()) { toast.error("Give your list a name."); return; }
    start(async () => {
      try {
        if (editId) { await renameList(editId, name, desc); toast.success("List updated"); }
        else { await createList(name, desc); toast.success("List created"); }
        setName(""); setDesc(""); setEditId(null); setOpen(false);
        router.refresh();
      } catch { toast.error(editId ? "Could not update list" : "Could not create list"); }
    });
  }

  function remove(id: string) {
    start(async () => {
      try { await deleteList(id); toast("List deleted"); router.refresh(); }
      catch { toast.error("Could not delete list"); }
    });
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[940px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ffd716]/15 dark:bg-[#ffd716]/[0.08] flex items-center justify-center text-[#caa400]"><ListIcon size={18} /></div>
            <div>
              <h1 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Lists</h1>
              <p className="text-[12px] text-[#9a9a9a] mt-0.5">Organize professionals and companies into private shortlists.</p>
            </div>
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors"><Plus size={15} /> New list</button>
        </div>
        <div className="p-6">
          {initial.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><ListIcon size={22} /></div>
              <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No lists yet</h3>
              <p className="mt-1.5 max-w-sm text-[13px] text-[#9a9a9a]">Create a shortlist to organize professionals and companies for a project.</p>
              <button onClick={openNew} className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors"><Plus size={16} /> New list</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {initial.map((l) => (
                <div key={l.id} className="group rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><ListIcon size={18} /></div>
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1 text-[12px] text-[#9a9a9a]"><Users size={13} /> {l.count}</span>
                  <button onClick={() => openEdit(l)} aria-label="Rename list" className="text-[#b3b3b3] hover:text-[#1e1e1e] dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14} /></button>
                  <button onClick={() => remove(l.id)} disabled={pending} aria-label="Delete list" className="text-[#b3b3b3] hover:text-[#e5484d] opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={15} /></button>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">{l.name}</h3>
              {l.description && <p className="text-[12px] text-[#9a9a9a] mt-0.5">{l.description}</p>}
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditId(null); }} title={editId ? "Edit list" : "Create a new list"}>
        <div className="space-y-4">
          <Field label="List name"><input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shortlist — Lekki Tower" /></Field>
          <Field label="Description (optional)"><input className={inputClass} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this list for?" /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => { setOpen(false); setEditId(null); }}>Cancel</GhostButton>
            <PrimaryButton onClick={create} disabled={pending}>{pending ? "Saving…" : editId ? "Save changes" : "Create list"}</PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function ListsSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[940px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <S cls="w-9 h-9 rounded-lg flex-shrink-0" />
            <div className="space-y-1.5"><S cls="h-4 w-12" /><S cls="h-3 w-56 max-w-full" /></div>
          </div>
          <S cls="h-9 w-24 rounded-lg" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <S cls="w-10 h-10 rounded-lg" />
                  <S cls="h-3 w-8" />
                </div>
                <S cls="mt-3 h-4 w-3/4" />
                <S cls="mt-1 h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
