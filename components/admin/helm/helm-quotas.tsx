"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Loader2, Plus, Save, Search, Trash2, Zap } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import {
  deleteHelmQuota, saveHelmQuota, searchHelmUsers,
  type HelmQuotaRow, type HelmUserHit,
} from "@/lib/services/helm-admin";

const PLAN_STYLE: Record<string, string> = {
  free: "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60",
  plus: "bg-[#fef3c7] text-[#b45309] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]",
  pro: "bg-[#ede9fe] text-[#6d28d9] dark:bg-[#7c3aed]/20 dark:text-[#c4b5fd]",
  premium: "bg-[#ccfbf1] text-[#0f766e] dark:bg-[#14b8a6]/20 dark:text-[#5eead4]",
};

function allowanceLabel(n: number | null) {
  return n === null ? "Unlimited" : `${n.toLocaleString()} / mo`;
}

/** Inline editor for a monthly allowance + priority, shared by plan and override rows. */
function QuotaEditor({
  row, onSaved,
}: { row: HelmQuotaRow; onSaved: () => void }) {
  const [monthly, setMonthly] = useState<string>(row.monthlyMessages === null ? "" : String(row.monthlyMessages));
  const [unlimited, setUnlimited] = useState(row.monthlyMessages === null);
  const [priority, setPriority] = useState(String(row.priority));
  const [note, setNote] = useState(row.note);
  const [saving, start] = useTransition();

  function save() {
    start(async () => {
      const res = await saveHelmQuota({
        id: row.id,
        monthlyMessages: unlimited ? null : Number(monthly || 0),
        priority: Number(priority || 0),
        note,
      });
      if (res.ok) { toast.success("Allowance saved"); onSaved(); }
      else toast.error(res.error ?? "Couldn't save");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-[#9a9a9a]">Monthly messages</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={unlimited ? "" : monthly}
            disabled={unlimited}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder={unlimited ? "∞" : "0"}
            className="w-28 rounded-lg border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#161616] px-2.5 py-1.5 text-sm text-[#1e1e1e] dark:text-white outline-none focus:border-[#ffd716] disabled:opacity-40"
          />
          <label className="flex items-center gap-1.5 text-xs text-[#6b6b6b] dark:text-white/60">
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="accent-[#ffd716]" />
            Unlimited
          </label>
        </div>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-[#9a9a9a]">Priority</span>
        <input
          type="number"
          min={0}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-20 rounded-lg border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#161616] px-2.5 py-1.5 text-sm text-[#1e1e1e] dark:text-white outline-none focus:border-[#ffd716]"
        />
      </label>
      <label className="flex flex-1 min-w-[160px] flex-col gap-1">
        <span className="text-[11px] font-medium text-[#9a9a9a]">Note</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#161616] px-2.5 py-1.5 text-sm text-[#1e1e1e] dark:text-white outline-none focus:border-[#ffd716]"
        />
      </label>
      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] dark:bg-white px-3 py-2 text-sm font-medium text-white dark:text-[#1e1e1e] transition hover:opacity-85 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save
      </button>
    </div>
  );
}

export function HelmQuotasView({
  plans, overrides, period,
}: { plans: HelmQuotaRow[]; overrides: HelmQuotaRow[]; period: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<HelmUserHit[]>([]);
  const [picked, setPicked] = useState<HelmUserHit | null>(null);
  const [newMonthly, setNewMonthly] = useState("");
  const [newUnlimited, setNewUnlimited] = useState(false);
  const [newPriority, setNewPriority] = useState("2");
  const [newNote, setNewNote] = useState("");
  const [, start] = useTransition();
  const [searching, startSearch] = useTransition();

  const refresh = () => { setEditing(null); setAdding(false); setPicked(null); setQuery(""); setHits([]); router.refresh(); };

  function runSearch(q: string) {
    setQuery(q);
    startSearch(async () => setHits(await searchHelmUsers(q)));
  }

  function addOverride() {
    if (!picked) return;
    start(async () => {
      const res = await saveHelmQuota({
        userId: picked.id,
        monthlyMessages: newUnlimited ? null : Number(newMonthly || 0),
        priority: Number(newPriority || 0),
        note: newNote,
      });
      if (res.ok) { toast.success(`Override added for ${picked.name}`); refresh(); }
      else toast.error(res.error ?? "Couldn't add override");
    });
  }

  function removeOverride(id: string, name: string) {
    start(async () => {
      const res = await deleteHelmQuota(id);
      if (res.ok) { toast.success(`Override for ${name} removed`); router.refresh(); }
      else toast.error(res.error ?? "Couldn't remove");
    });
  }

  return (
    <div className="space-y-6">
      {/* plan defaults */}
      <Reveal>
        <section className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-[#b89500] dark:text-[#ffd716]" />
            <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Plan allowances</h2>
          </div>
          <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/50">
            Monthly message allowance and queue priority for each plan. Higher priority is served first.
          </p>
          <div className="mt-4 space-y-2.5">
            {plans.length === 0 && (
              <p className="rounded-xl bg-[#f7f7f7] dark:bg-white/5 px-4 py-6 text-center text-sm text-[#9a9a9a]">
                No plan allowances yet — run migration 0016 to seed the defaults.
              </p>
            )}
            {plans.map((row) => (
              <div key={row.id} className="rounded-xl border border-[#f0f0f0] dark:border-white/10 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", PLAN_STYLE[row.plan ?? "free"])}>
                      {row.plan}
                    </span>
                    <span className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{allowanceLabel(row.monthlyMessages)}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#9a9a9a]">
                      <Zap className="h-3 w-3" /> priority {row.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditing(editing === row.id ? null : row.id)}
                    className="text-xs font-medium text-[#b89500] hover:underline dark:text-[#ffd716]"
                  >
                    {editing === row.id ? "Cancel" : "Edit"}
                  </button>
                </div>
                {row.note && <p className="mt-1 text-xs text-[#9a9a9a]">{row.note}</p>}
                {editing === row.id && (
                  <div className="mt-3 border-t border-[#f0f0f0] dark:border-white/10 pt-3">
                    <QuotaEditor row={row} onSaved={refresh} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* per-user overrides */}
      <Reveal delay={0.05}>
        <section className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Per-user overrides</h2>
              <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/50">
                Give a specific user a different allowance — for a VIP, a trial, or to resolve a complaint. Wins over their plan default.
              </p>
            </div>
            <button
              onClick={() => setAdding((a) => !a)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#ffd716] px-3 py-2 text-sm font-semibold text-[#1e1e1e] transition hover:brightness-95"
            >
              <Plus className="h-4 w-4" /> Add override
            </button>
          </div>

          {adding && (
            <div className="mt-4 rounded-xl border border-[#ffd716]/50 bg-[#fffbea] dark:bg-[#ffd716]/[0.06] p-4">
              {!picked ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9a9a]" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => runSearch(e.target.value)}
                      placeholder="Search users by name or email…"
                      className="w-full rounded-lg border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#161616] py-2 pl-9 pr-3 text-sm text-[#1e1e1e] dark:text-white outline-none focus:border-[#ffd716]"
                    />
                  </div>
                  {searching && <p className="mt-2 text-xs text-[#9a9a9a]">Searching…</p>}
                  <div className="mt-2 space-y-1">
                    {hits.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setPicked(u)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[#1e1e1e] dark:text-white">{u.name}</span>
                          <span className="block truncate text-xs text-[#9a9a9a]">{u.email}</span>
                        </span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", PLAN_STYLE[u.plan])}>{u.plan}</span>
                      </button>
                    ))}
                    {query.length >= 2 && !searching && hits.length === 0 && (
                      <p className="px-3 py-2 text-xs text-[#9a9a9a]">No users match “{query}”.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{picked.name}</p>
                      <p className="text-xs text-[#9a9a9a]">{picked.email}</p>
                    </div>
                    <button onClick={() => setPicked(null)} className="text-xs text-[#9a9a9a] hover:underline">Change</button>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-[#9a9a9a]">Monthly messages</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} value={newUnlimited ? "" : newMonthly}
                          disabled={newUnlimited} onChange={(e) => setNewMonthly(e.target.value)}
                          placeholder={newUnlimited ? "∞" : "0"}
                          className="w-28 rounded-lg border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#161616] px-2.5 py-1.5 text-sm outline-none focus:border-[#ffd716] disabled:opacity-40 dark:text-white"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-[#6b6b6b] dark:text-white/60">
                          <input type="checkbox" checked={newUnlimited} onChange={(e) => setNewUnlimited(e.target.checked)} className="accent-[#ffd716]" />
                          Unlimited
                        </label>
                      </div>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-[#9a9a9a]">Priority</span>
                      <input
                        type="number" min={0} value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
                        className="w-20 rounded-lg border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#161616] px-2.5 py-1.5 text-sm outline-none focus:border-[#ffd716] dark:text-white"
                      />
                    </label>
                    <label className="flex flex-1 min-w-[160px] flex-col gap-1">
                      <span className="text-[11px] font-medium text-[#9a9a9a]">Note</span>
                      <input
                        value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        className="w-full rounded-lg border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#161616] px-2.5 py-1.5 text-sm outline-none focus:border-[#ffd716] dark:text-white"
                      />
                    </label>
                    <button
                      onClick={addOverride}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] dark:bg-white px-3 py-2 text-sm font-medium text-white dark:text-[#1e1e1e] transition hover:opacity-85"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            {overrides.length === 0 && !adding && (
              <p className="rounded-xl bg-[#f7f7f7] dark:bg-white/5 px-4 py-6 text-center text-sm text-[#9a9a9a]">
                No per-user overrides. Everyone follows their plan allowance.
              </p>
            )}
            {overrides.map((row) => (
              <div key={row.id} className="rounded-xl border border-[#f0f0f0] dark:border-white/10 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1e1e1e] dark:text-white">{row.userName}</p>
                    <p className="truncate text-xs text-[#9a9a9a]">{row.userEmail}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{allowanceLabel(row.monthlyMessages)}</span>
                    <span className="text-xs text-[#9a9a9a]">{row.usedThisPeriod} used · {period}</span>
                    <button
                      onClick={() => setEditing(editing === row.id ? null : row.id)}
                      className="text-xs font-medium text-[#b89500] hover:underline dark:text-[#ffd716]"
                    >
                      {editing === row.id ? "Cancel" : "Edit"}
                    </button>
                    <button
                      onClick={() => removeOverride(row.id, row.userName)}
                      className="rounded p-1 text-[#c4c4c4] transition hover:text-[#ef4444]"
                      aria-label="Remove override"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {editing === row.id && (
                  <div className="mt-3 border-t border-[#f0f0f0] dark:border-white/10 pt-3">
                    <QuotaEditor row={row} onSaved={refresh} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
