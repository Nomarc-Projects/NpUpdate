"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, List as ListIcon, Users, Building2, Pencil, Copy, Trash2 } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { DataTable, KebabMenu, ConfirmDialog, type DataTableColumn } from "@/components/dashboard/kit";
import { createList, deleteList, renameList, duplicateList, type ListWithCount } from "@/lib/services/lists";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function ListsTable({ initial }: { initial: ListWithCount[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ListWithCount | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function openNew() { setEditing(null); setName(""); setDesc(""); setCreateOpen(true); }
  function openEdit(l: ListWithCount) { setEditing(l); setName(l.name); setDesc(l.description ?? ""); setCreateOpen(true); }

  function save() {
    if (!name.trim()) { toast.error("Give your list a name."); return; }
    start(async () => {
      try {
        if (editing) { await renameList(editing.id, name, desc); toast.success("List updated"); }
        else { await createList(name, desc); toast.success("List created"); }
        setCreateOpen(false);
        router.refresh();
      } catch { toast.error(editing ? "Could not update list" : "Could not create list"); }
    });
  }
  function duplicate(l: ListWithCount) {
    start(async () => {
      try { await duplicateList(l.id); toast.success("List duplicated"); router.refresh(); }
      catch { toast.error("Could not duplicate list"); }
    });
  }
  function confirmDelete() {
    if (!delId) return;
    const id = delId; setDelId(null);
    start(async () => {
      try { await deleteList(id); toast.success("List deleted"); router.refresh(); }
      catch { toast.error("Could not delete list"); }
    });
  }

  const countLabel = (l: ListWithCount) => {
    const parts: string[] = [];
    if (l.peopleCount) parts.push(`${l.peopleCount} professional${l.peopleCount === 1 ? "" : "s"}`);
    if (l.companyCount) parts.push(`${l.companyCount} compan${l.companyCount === 1 ? "y" : "ies"}`);
    return parts.length ? parts.join(", ") : "Empty";
  };

  const columns: DataTableColumn<ListWithCount>[] = [
    {
      key: "name", label: "Name",
      render: (l) => (
        <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
          {l.peopleCount > 0 && l.companyCount === 0 ? <Users size={14} className="text-[#9a9a9a]" /> : l.companyCount > 0 && l.peopleCount === 0 ? <Building2 size={14} className="text-[#9a9a9a]" /> : <ListIcon size={14} className="text-[#9a9a9a]" />}
          {l.name}
        </span>
      ),
    },
    { key: "count", label: "Count", render: (l) => <span className="text-[13px] text-[#6b6b6b] dark:text-white/60">{countLabel(l)}</span> },
    { key: "created", label: "Date Created", render: (l) => <span className="text-[13px] text-[#9a9a9a]">{fmtDate(l.createdAt)}</span> },
    { key: "updated", label: "Last Modified", render: (l) => <span className="text-[13px] text-[#9a9a9a]">{fmtDate(l.updatedAt)}</span> },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1" />
        <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-4 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"><Plus size={15} /> Create new list</button>
      </div>

      <DataTable
        columns={columns}
        rows={initial}
        rowKey={(l) => l.id}
        onRowClick={(l) => router.push(`/dashboard/lists/${l.id}`)}
        rowHoverActions={(l) => (
          <KebabMenu
            items={[
              { icon: Pencil, label: "Rename list", onClick: () => openEdit(l) },
              { icon: Copy, label: "Duplicate list", onClick: () => duplicate(l) },
              { icon: Trash2, label: "Delete list", danger: true, onClick: () => setDelId(l.id) },
            ]}
          />
        )}
      />

      {initial.length === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e3e3e3] py-16 text-center dark:border-white/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10"><ListIcon size={22} /></div>
          <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No lists yet</h3>
          <p className="mt-1.5 max-w-sm text-[13px] text-[#9a9a9a]">Create a shortlist to organize professionals and companies for a project.</p>
          <button onClick={openNew} className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-5 py-2.5 text-sm font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"><Plus size={16} /> New list</button>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={editing ? "Edit list" : "Create new list"}>
        <div className="space-y-4">
          <Field label="Name"><input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Phase 1: Structural Engineers" /></Field>
          <Field label="Description (optional)"><input className={inputClass} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this list for?" /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => setCreateOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={save} disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Create"}</PrimaryButton>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={confirmDelete}
        title="Delete list"
        description="Are you sure you want to delete this list? You cannot undo this action."
        loading={pending}
      />
    </div>
  );
}
