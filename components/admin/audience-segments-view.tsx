"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Search, X, Loader2, Trash2, Copy, Pencil, Users } from "lucide-react";
import { FiltersRail, type FilterGroup } from "@/components/admin/filters-rail";
import { KebabMenu, type KebabItem } from "@/components/dashboard/kit";
import {
  SEGMENT_FIELDS, OPERATOR_LABEL, fieldDef, isRuleComplete, describeRules,
  type SegmentRule, type SegmentMatchMode,
} from "@/lib/services/segment-rules";
import { createSegment, updateSegment, deleteSegment, duplicateSegment, countMatchingUsers, type SegmentRow } from "@/lib/services/segments";
import { cn } from "@/lib/utils";

const selectClass =
  "w-full rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] outline-none transition-colors focus:border-[#ffd716] dark:border-white/15 dark:bg-[#161616] dark:text-white";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "az", label: "A-Z (alphabetically)" },
  { value: "most", label: "Most Users" },
];

const TYPES = [
  { value: "", label: "All" },
  { value: "exhibitor", label: "Exhibitors Only" },
  { value: "professional", label: "Professionals Only" },
];

function newRule(): SegmentRule {
  return { field: SEGMENT_FIELDS[0].key, operator: SEGMENT_FIELDS[0].operators[0], value: "" };
}

/** Create/edit drawer — name, rule rows, and a live count of who matches. */
function SegmentDrawer({ initial, onClose }: { initial: SegmentRow | null; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [matchMode, setMatchMode] = useState<SegmentMatchMode>(initial?.matchMode ?? "all");
  const [rules, setRules] = useState<SegmentRule[]>(initial?.rules?.length ? initial.rules : [newRule()]);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [saving, startSave] = useTransition();

  const complete = useMemo(() => rules.filter(isRuleComplete), [rules]);
  // Serialised so the effect below compares by value, not array identity.
  const key = useMemo(() => JSON.stringify({ complete, matchMode }), [complete, matchMode]);
  const reqId = useRef(0);

  // Debounced live count. Each run carries a sequence number so a slow earlier
  // response can't overwrite the answer for the rules currently on screen.
  useEffect(() => {
    if (complete.length === 0) { setCount(null); setCounting(false); return; }
    setCounting(true);
    const mine = ++reqId.current;
    const t = setTimeout(() => {
      countMatchingUsers(complete, matchMode)
        .then((n) => { if (mine === reqId.current) { setCount(n); setCounting(false); } })
        .catch(() => { if (mine === reqId.current) { setCount(null); setCounting(false); } });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function patch(i: number, next: Partial<SegmentRule>) {
    setRules((rs) => rs.map((r, idx) => {
      if (idx !== i) return r;
      const merged = { ...r, ...next };
      // Changing the field can invalidate the operator/value pair, so reset both
      // to something the new field actually supports.
      if (next.field && next.field !== r.field) {
        const def = fieldDef(next.field);
        return { field: next.field, operator: def?.operators[0] ?? "is", value: "" };
      }
      return merged;
    }));
  }

  function save() {
    if (complete.length === 0) { toast.error("Add at least one complete rule."); return; }
    startSave(async () => {
      const payload = { name, rules: complete, matchMode };
      const res = initial ? await updateSegment(initial.id, payload) : await createSegment(payload);
      if (!res.ok) { toast.error(res.error ?? "Couldn't save the segment."); return; }
      toast.success(initial ? "Segment updated." : "Segment created.");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-[#ececec] px-5 py-4 dark:border-white/10">
          <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{initial ? "Edit Segment" : "Create Segment"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <label htmlFor="seg-name" className="mb-1.5 block text-[12px] font-semibold text-[#1e1e1e] dark:text-white">Segment Name</label>
            <input
              id="seg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Targeted blasts for Architects"
              className={selectClass}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white">Filter Rules</label>
              <select
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as SegmentMatchMode)}
                aria-label="Combine rules with"
                className="rounded-md border border-[#e3e3e3] bg-white px-2 py-1 text-[11.5px] text-[#6b6b6b] dark:border-white/15 dark:bg-[#161616] dark:text-white/70"
              >
                <option value="all">Match ALL rules</option>
                <option value="any">Match ANY rule</option>
              </select>
            </div>

            <div className="space-y-2">
              {rules.map((r, i) => {
                const def = fieldDef(r.field);
                return (
                  <div key={i} className="rounded-xl border border-[#ececec] bg-[#fafafa] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    {i > 0 && (
                      <span className="mb-2 inline-block rounded bg-[#ffd716] px-1.5 py-0.5 text-[10px] font-bold text-[#1e1e1e]">
                        {matchMode === "any" ? "OR" : "AND"}
                      </span>
                    )}
                    <select value={r.field} onChange={(e) => patch(i, { field: e.target.value })} aria-label="Field" className={selectClass}>
                      {SEGMENT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <select
                        value={r.operator}
                        onChange={(e) => patch(i, { operator: e.target.value as SegmentRule["operator"] })}
                        aria-label="Operator"
                        className={selectClass}
                      >
                        {(def?.operators ?? []).map((op) => <option key={op} value={op}>{OPERATOR_LABEL[op]}</option>)}
                      </select>

                      {def?.kind === "select" ? (
                        <select value={r.value} onChange={(e) => patch(i, { value: e.target.value })} aria-label="Value" className={selectClass}>
                          <option value="">Select…</option>
                          {(def.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input
                          type={def?.kind === "number" ? "number" : "text"}
                          value={r.value}
                          onChange={(e) => patch(i, { value: e.target.value })}
                          placeholder={def?.hint ?? "Value"}
                          aria-label="Value"
                          className={selectClass}
                        />
                      )}
                    </div>

                    {rules.length > 1 && (
                      <button
                        onClick={() => setRules((rs) => rs.filter((_, idx) => idx !== i))}
                        className="mt-2 text-[11.5px] font-medium text-[#9a9a9a] transition-colors hover:text-[#e5484d]"
                      >
                        Remove rule
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setRules((rs) => [...rs, newRule()])}
              className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:text-[#caa400] dark:text-white"
            >
              <Plus size={14} /> Add rule
            </button>
          </div>
        </div>

        <div className="border-t border-[#ececec] px-5 py-4 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between rounded-xl border border-[#ececec] bg-[#fafafa] px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
            <span className="text-[12.5px] text-[#6b6b6b] dark:text-white/60">Number of users</span>
            <span className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">
              {complete.length === 0 ? "Add a rule to preview"
                : counting ? <Loader2 size={13} className="animate-spin" />
                : count === null ? "—"
                : `${count.toLocaleString()} users match these rules`}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-[#e3e3e3] px-4 py-2 text-[13px] font-medium text-[#1e1e1e] transition-colors hover:bg-[#f7f7f7] dark:border-white/15 dark:text-white dark:hover:bg-white/5">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ffd716] px-5 py-2 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}{initial ? "Save changes" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowMenu({ onEdit, onDuplicate, onDelete }: { onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  // Portal-based KebabMenu — the table's overflow-x-auto container used to clip
  // the inline absolute dropdown, making the lower items unreachable.
  const items: KebabItem[] = [
    { icon: Pencil, label: "Edit", onClick: onEdit },
    { icon: Copy, label: "Duplicate", onClick: onDuplicate },
    { icon: Trash2, label: "Delete", danger: true, onClick: onDelete },
  ];
  return <KebabMenu items={items} />;
}

export function AudienceSegmentsView({ rows }: { rows: SegmentRow[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [type, setType] = useState("");
  const [drawer, setDrawer] = useState<{ open: boolean; initial: SegmentRow | null }>({ open: false, initial: null });
  const [, startAction] = useTransition();

  const groups: FilterGroup[] = [
    { key: "sort", label: "Sort by", options: SORTS, value: sort, onChange: setSort },
    { key: "type", label: "Segment Type", options: TYPES, value: type, onChange: setType },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => (q ? r.name.toLowerCase().includes(q) : true));
    if (type) {
      // "Exhibitors Only" means the segment actually pins user_type to that role.
      out = out.filter((r) => r.rules.some((x) => x.field === "user_type" && x.operator === "is" && x.value === type));
    }
    const sorted = [...out];
    if (sort === "az") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "most") sorted.sort((a, b) => b.totalUsers - a.totalUsers);
    else if (sort === "oldest") sorted.reverse();
    return sorted;
  }, [rows, query, sort, type]);

  function act(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    startAction(async () => {
      const res = await fn();
      res.ok ? toast.success(label) : toast.error(res.error ?? "That didn't work.");
    });
  }

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <FiltersRail groups={groups} />

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[#ececec] bg-white px-3 focus-within:border-[#ffd716] dark:border-white/10 dark:bg-[#1e1e1e]">
            <Search size={15} className="flex-shrink-0 text-[#9a9a9a]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search segment name..."
              aria-label="Search segments"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1e1e1e] placeholder:text-[#9a9a9a] focus:outline-none dark:text-white"
            />
          </div>
          <button
            onClick={() => setDrawer({ open: true, initial: null })}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#ffd716] px-4 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
          >
            <Plus size={15} /> Create Segment
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#ececec] bg-white dark:border-white/10 dark:bg-[#1e1e1e]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-[#ececec] dark:border-white/10">
                  {["Segment Name", "Filter Rules", "Total Users", "Date Created", ""].map((h, i) => (
                    <th key={h || i} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-[#f2f2f2] last:border-0 dark:border-white/5">
                    <td className="px-4 py-3.5 text-[13.5px] font-medium text-[#1e1e1e] dark:text-white">{r.name}</td>
                    <td className="px-4 py-3.5">
                      {describeRules(r.rules).map((line, i) => (
                        <p key={i} className={cn("text-[12px]", i === 0 ? "text-[#1e1e1e] dark:text-white/80" : "text-[#9a9a9a]")}>{line}</p>
                      ))}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#6b6b6b] dark:text-white/60">{r.totalUsers.toLocaleString()} Users</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#6b6b6b] dark:text-white/60">{r.createdAt}</td>
                    <td className="px-4 py-3.5 text-right">
                      <RowMenu
                        onEdit={() => setDrawer({ open: true, initial: r })}
                        onDuplicate={() => act("Segment duplicated.", () => duplicateSegment(r.id))}
                        onDelete={() => { if (window.confirm(`Delete "${r.name}"? This cannot be undone.`)) act("Segment deleted.", () => deleteSegment(r.id)); }}
                      />
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <Users size={26} className="mx-auto mb-3 text-[#d4d4d4]" />
                      <p className="text-[13.5px] font-medium text-[#1e1e1e] dark:text-white">
                        {rows.length === 0 ? "No segments yet" : "No segments match those filters"}
                      </p>
                      <p className="mt-1 text-[12.5px] text-[#9a9a9a]">
                        {rows.length === 0
                          ? "Build a rule-based list so campaigns reach the right people."
                          : "Try a different search or filter."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawer.open && <SegmentDrawer initial={drawer.initial} onClose={() => setDrawer({ open: false, initial: null })} />}
    </div>
  );
}
