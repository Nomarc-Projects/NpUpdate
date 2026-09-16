"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, List as ListIcon } from "lucide-react";
import { Modal, GhostButton, PrimaryButton, Field, inputClass } from "@/components/ui/modal";
import { getMyLists, createList, addToList, type ListItemType } from "@/lib/services/lists";

/**
 * "Add to list" dialog (images 54/62) — search/pick an existing list or create
 * a new one, then add every selected item to it. Generic over item type
 * (professional/company) so People and Companies both reuse it.
 */
export function AddToListDialog({
  open,
  onClose,
  itemType,
  itemIds,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  itemType: ListItemType;
  itemIds: string[];
  onDone?: () => void;
}) {
  const [lists, setLists] = useState<{ id: string; name: string; count: number }[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) getMyLists().then((l) => setLists(l.map((x) => ({ id: x.id, name: x.name, count: x.count })))).catch(() => setLists([]));
    else { setCreating(false); setNewName(""); }
  }, [open]);

  async function saveTo(listId: string) {
    setSaving(true);
    try {
      await Promise.all(itemIds.map((id) => addToList(listId, itemType, id)));
      toast.success(`Added to list${itemIds.length > 1 ? ` (${itemIds.length})` : ""}`);
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function createAndSave() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const id = await createList(newName.trim());
      await saveTo(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create list");
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add to list${itemIds.length > 1 ? ` (${itemIds.length})` : ""}`} maxWidth="max-w-md">
      {creating ? (
        <div>
          <Field label="List name">
            <input className={inputClass} autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Phase 1: Structural Engineers" />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <GhostButton onClick={() => setCreating(false)}>Back</GhostButton>
            <PrimaryButton onClick={createAndSave} disabled={saving || !newName.trim()}>{saving ? "Saving…" : "Save to list"}</PrimaryButton>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-[#e3e3e3] px-3.5 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
          >
            <Plus size={15} /> Create new list
          </button>
          {lists.length > 0 && (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {lists.map((l) => (
                <li key={l.id}>
                  <button onClick={() => saveTo(l.id)} disabled={saving} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#f5f5f5] dark:hover:bg-white/5 disabled:opacity-60">
                    <ListIcon size={15} className="text-[#9a9a9a]" />
                    <span className="flex-1 truncate text-[13px] font-medium text-[#1e1e1e] dark:text-white">{l.name}</span>
                    <span className="text-[11.5px] text-[#9a9a9a]">{l.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
