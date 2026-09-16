"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Bookmark, Clock, Plus, X } from "lucide-react";
import { getSavedSearches, deleteSavedSearch, recordSearch, type SearchKind, type SavedSearchRow } from "@/lib/services/saved-searches";
import { cn } from "@/lib/utils";

/**
 * "My searches" control (images 50/51/56/57) — Saved searches / Recent
 * searches / Save this search. `currentQuery` is whatever filter-state shape
 * the caller uses; `onApply` restores it when a saved/recent entry is clicked.
 */
export function MySearchesMenu({
  kind,
  currentQuery,
  onApply,
}: {
  kind: SearchKind;
  currentQuery: Record<string, unknown>;
  onApply: (query: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<SavedSearchRow[]>([]);
  const [recent, setRecent] = useState<SavedSearchRow[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function refresh() {
    getSavedSearches(kind).then((r) => { setSaved(r.saved); setRecent(r.recent); }).catch(() => {});
  }

  function toggle() {
    setOpen((o) => { if (!o) refresh(); return !o; });
  }

  function apply(row: SavedSearchRow) {
    onApply(row.query);
    setOpen(false);
  }

  function saveThisSearch() {
    const name = window.prompt("Name this search");
    if (!name) return;
    recordSearch(kind, currentQuery, name).then(() => { toast.success("Search saved"); refresh(); }).catch(() => toast.error("Couldn't save search"));
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSaved((s) => s.filter((x) => x.id !== id));
    try { await deleteSavedSearch(id); } catch { toast.error("Couldn't remove"); refresh(); }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white/70">
        My searches <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-[#ececec] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#1e1e1e]"
          >
            <p className="px-3 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#b3b3b3]">Saved searches</p>
            {saved.length === 0 && <p className="px-3 py-2 text-[12px] text-[#9a9a9a]">None yet</p>}
            {saved.map((s) => (
              <button key={s.id} onClick={() => apply(s)} className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#f5f5f5] dark:hover:bg-white/5">
                <Bookmark size={13} className="flex-shrink-0 text-[#9a9a9a]" />
                <span className="flex-1 truncate text-[13px] text-[#1e1e1e] dark:text-white">{s.name}</span>
                <span onClick={(e) => remove(s.id, e)} className="flex-shrink-0 text-[#c9c9c9] opacity-0 transition-opacity hover:text-[#e5484d] group-hover:opacity-100"><X size={12} /></span>
              </button>
            ))}
            {recent.length > 0 && (
              <>
                <p className="mt-1.5 px-3 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#b3b3b3]">Recent searches</p>
                {recent.map((s) => (
                  <button key={s.id} onClick={() => apply(s)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#f5f5f5] dark:hover:bg-white/5">
                    <Clock size={13} className="flex-shrink-0 text-[#9a9a9a]" />
                    <span className="flex-1 truncate text-[13px] text-[#3d3d3d] dark:text-white/70">{new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span>
                  </button>
                ))}
              </>
            )}
            <div className="my-1.5 h-px bg-[#ececec] dark:bg-white/10" />
            <button onClick={saveThisSearch} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#f5f5f5] dark:text-white dark:hover:bg-white/5">
              <Plus size={13} /> Save this search
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
