"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkCheck, Plus, Check, X, Loader2, ListPlus } from "lucide-react";
import { getListsWithMembership, addToList, removeFromList, createList, type ListItemType } from "@/lib/services/lists";
import { cn } from "@/lib/utils";

type Row = { id: string; name: string; description: string | null; count: number; hasItem: boolean };

/** Bookmark button that opens a picker to add/remove the item across the user's lists. */
export function SaveToList({ itemType, itemId, variant = "icon" }: { itemType: ListItemType; itemId: string; variant?: "icon" | "button" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [savedAny, setSavedAny] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const ls = await getListsWithMembership(itemType, itemId) as Row[];
      setRows(ls);
      setSavedAny(ls.some((l) => l.hasItem));
    } catch { toast.error("Couldn't load your lists"); }
    finally { setLoading(false); }
  }

  function openPicker() { setMounted(true); setOpen(true); load(); }

  async function toggle(row: Row) {
    const next = !row.hasItem;
    setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, hasItem: next, count: x.count + (next ? 1 : -1) } : x)));
    setSavedAny((prev) => prev || next);
    try {
      if (next) await addToList(row.id, itemType, itemId);
      else await removeFromList(row.id, itemType, itemId);
      setRows((prev) => { const r = prev.map((x) => (x.id === row.id ? { ...x, hasItem: next } : x)); setSavedAny(r.some((l) => l.hasItem)); return r; });
    } catch {
      toast.error("Couldn't update list");
      setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, hasItem: !next, count: x.count + (next ? -1 : 1) } : x)));
    }
  }

  async function create() {
    const name = newName.trim();
    if (!name) return;
    try { await createList(name); setNewName(""); setCreating(false); await load(); toast.success(`Created “${name}”`); }
    catch { toast.error("Couldn't create list"); }
  }

  return (
    <>
      {variant === "button" ? (
        <button onClick={openPicker} className={cn("inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors", savedAny ? "border-[#ffd716] text-[#1e1e1e] dark:text-white bg-[#fff7cc] dark:bg-[#ffd716]/10" : "border-[#e3e3e3] dark:border-white/15 text-[#1e1e1e] dark:text-white hover:border-[#ffd716]")}>
          {savedAny ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} Save
        </button>
      ) : (
        <button onClick={openPicker} aria-label="Save to list" className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0", savedAny ? "text-[#ffd716] bg-[#fff7cc] dark:bg-[#ffd716]/10" : "text-[#b3b3b3] hover:text-[#ffd716] hover:bg-[#fafafa] dark:hover:bg-white/5")}>
          {savedAny ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 14 }} transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="relative w-full max-w-[380px] rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#ececec] dark:border-white/10">
                  <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white flex items-center gap-2"><ListPlus size={16} className="text-[#caa400]" /> Save to list</h3>
                  <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><X size={16} /></button>
                </div>

                <div className="p-3 max-h-[300px] overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-8 text-[#9a9a9a]"><Loader2 size={20} className="animate-spin" /></div>
                  ) : rows.length === 0 ? (
                    <p className="text-center text-[13px] text-[#9a9a9a] py-6">No lists yet — create one below.</p>
                  ) : rows.map((row) => (
                    <button key={row.id} onClick={() => toggle(row)} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors text-left">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate">{row.name}</p>
                        <p className="text-[11px] text-[#9a9a9a]">{row.count} {row.count === 1 ? "item" : "items"}</p>
                      </div>
                      <span className={cn("w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors", row.hasItem ? "bg-[#ffd716] border-[#ffd716] text-[#1e1e1e]" : "border-[#d1d5db] dark:border-white/20")}>
                        {row.hasItem && <Check size={13} strokeWidth={3} />}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="p-3 border-t border-[#ececec] dark:border-white/10">
                  {creating ? (
                    <form onSubmit={(e) => { e.preventDefault(); create(); }} className="flex items-center gap-2">
                      <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New list name" className="flex-1 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#262626] px-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
                      <button type="submit" className="px-3 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] transition-colors">Add</button>
                    </form>
                  ) : (
                    <button onClick={() => setCreating(true)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
                      <Plus size={14} /> Create new list
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
