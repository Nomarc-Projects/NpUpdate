"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Send, Users, Loader2, Search, X, UserRoundCheck } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  getAudienceCount, sendBroadcast, searchUsers, type AudienceFilter, type BroadcastLogEntry,
} from "@/lib/services/broadcasts";

type PickedUser = { id: string; name: string; email: string };

const ROLE_OPTS: { value: NonNullable<AudienceFilter["role"]>; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "professional", label: "Professionals" },
  { value: "exhibitor", label: "Exhibitors" },
];
const PLAN_OPTS: { value: NonNullable<AudienceFilter["plan"]>; label: string }[] = [
  { value: "all", label: "Any plan" },
  { value: "free", label: "Free" },
  { value: "plus", label: "Plus" },
  { value: "pro", label: "Pro" },
  { value: "premium", label: "Premium" },
];

function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap items-center bg-[#f5f5f5] dark:bg-white/5 rounded-full p-1 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-all",
            value === o.value ? "bg-[#ffd716] text-[#1e1e1e] shadow-sm" : "text-[#898989] hover:text-[#1e1e1e] dark:hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ sent, failed }: { sent: number; failed: number }) {
  if (sent > 0 && failed === 0) return <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#dcfce7] text-[#16803c]">Sent</span>;
  if (sent > 0 && failed > 0) return <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#b45309]">Partial</span>;
  return <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fee2e2] text-[#b91c1c]">Failed</span>;
}

/** Human label for who a past send went to (recorded in the log's filter). */
function targetLabel(f: AudienceFilter): string {
  if (f.userId) return "Single user";
  const role = f.role && f.role !== "all" ? f.role.charAt(0).toUpperCase() + f.role.slice(1) + "s" : "Everyone";
  const plan = f.plan && f.plan !== "all" ? ` (${f.plan.charAt(0).toUpperCase() + f.plan.slice(1)})` : "";
  const ver = f.verifiedOnly ? " · verified" : "";
  return `${role}${plan}${ver}`;
}

export function AdminBroadcasts({ history, mailConfigured }: { history: BroadcastLogEntry[]; mailConfigured: boolean }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState<NonNullable<AudienceFilter["role"]>>("all");
  const [plan, setPlan] = useState<NonNullable<AudienceFilter["plan"]>>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selected, setSelected] = useState<PickedUser | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [list, setList] = useState(history);

  const filter: AudienceFilter = { role, plan, verifiedOnly, userId: selected?.id };

  // Debounced live search for the single-recipient picker.
  useEffect(() => {
    if (!query.trim() || selected) return;
    setSearching(true);
    const t = setTimeout(() => {
      searchUsers(query)
        .then((r) => { setResults(r); setOpen(true); })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected]);

  useEffect(() => {
    let cancelled = false;
    getAudienceCount(filter).then((n) => { if (!cancelled) setCount(n); }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, plan, verifiedOnly, selected]);

  function send() {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!body.trim()) { toast.error("Message body is required"); return; }
    if (count !== 0 && !window.confirm(`Send this email to ${count ?? "…"} recipient(s)? This can't be undone.`)) return;
    if (count === 0) { toast.error("No matching recipients — choose an audience or search for a user."); return; }

    start(async () => {
      try {
        const bodyHtml = body.split("\n").map((line) => `<p style="margin:0 0 10px;">${line}</p>`).join("");
        const res = await sendBroadcast({ subject, bodyHtml, filter });
        toast.success(`Sent to ${res.sentCount} recipient(s)${res.failedCount ? `, ${res.failedCount} failed` : ""}`);
        setList((l) => [{ id: `${Date.now()}`, subject, filter, sentCount: res.sentCount, failedCount: res.failedCount, createdAt: "Just now" }, ...l]);
        setSubject("");
        setBody("");
        setSelected(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not send email");
      }
    });
  }

  return (
    <div className="space-y-6">
      {!mailConfigured && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#fef3c7] text-[#92400e] text-[13px]">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Email isn&apos;t configured yet — sends below will be logged but not actually delivered until the RESEND_API_KEY is set.</span>
        </div>
      )}

        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 space-y-4">
        <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">
          {selected ? `Compose email to ${selected.name}` : "Compose direct email"}
        </h2>
        <Field label="Subject">
          <input className={inputClass} placeholder="What's this email about?" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Message">
          <textarea rows={6} className={inputClass} placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        {/* Single-user picker */}
        <Field label="Send to a single user">
          {selected ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#ffd716]/50 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] px-3.5 py-2.5">
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
                <UserRoundCheck size={16} className="text-[#b89400]" />
                {selected.name}
                <span className="text-[12px] font-normal text-[#9a9a9a]">{selected.email}</span>
              </span>
              <button type="button" onClick={() => { setSelected(null); setQuery(""); setOpen(false); }} aria-label="Clear selected user" className="text-[#9a9a9a] hover:text-[#e5484d] transition-colors"><X size={16} /></button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
                <input
                  className={cn(inputClass, "pl-9")}
                  placeholder="Search by name or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => query.trim() && setOpen(true)}
                />
                {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#9a9a9a]" />}
              </div>
              {open && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-lg">
                    {results.length === 0 ? (
                      <p className="px-4 py-6 text-center text-[13px] text-[#9a9a9a]">{query.trim() ? "No users found." : "Start typing to search users."}</p>
                    ) : (
                      results.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelected(u); setQuery(""); setOpen(false); }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="w-7 h-7 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] text-[11px] font-bold flex-shrink-0">{(u.name || u.email).slice(0, 1).toUpperCase()}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-[#1e1e1e] dark:text-white">{u.name || "—"}</span>
                            <span className="block truncate text-[12px] text-[#9a9a9a]">{u.email}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Field label="Role">
            <Segmented options={ROLE_OPTS} value={role} onChange={setRole} />
          </Field>
          <Field label="Plan">
            <Segmented options={PLAN_OPTS} value={plan} onChange={setPlan} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60 cursor-pointer">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="rounded" />
          Verified accounts only
        </label>
        {!selected && <p className="text-[12px] text-[#9a9a9a] -mt-1">Target everyone, a role, or a plan below — or pick a single user above to email just them.</p>}

        <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0] dark:border-white/10">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-[#6b6b6b] dark:text-white/60">
            <Users size={14} />
            {count === null ? <Loader2 size={12} className="animate-spin" /> : `${count} recipient${count === 1 ? "" : "s"}`}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={send}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-bold hover:bg-[#e6c114] transition-colors disabled:opacity-60"
          >
            {pending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send</>}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[#ececec] dark:border-white/10">
          <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Send history</h2>
        </div>
        {list.length === 0 ? (
          <p className="px-5 sm:px-6 py-8 text-center text-[13px] text-[#9a9a9a]">No broadcasts sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#9a9a9a] border-b border-[#ececec] dark:border-white/10">
                  <th className="px-5 sm:px-6 py-3 font-semibold">Subject</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Sent</th>
                  <th className="px-3 py-3 font-semibold">Failed</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
                    <td className="px-5 sm:px-6 py-3 font-medium text-[#1e1e1e] dark:text-white">{b.subject}</td>
                    <td className="px-3 py-3"><StatusPill sent={b.sentCount} failed={b.failedCount} /></td>
                    <td className="px-3 py-3 text-[#6b6b6b] dark:text-white/60">{b.sentCount}</td>
                    <td className="px-3 py-3 text-[#6b6b6b] dark:text-white/60">{b.failedCount}</td>
                    <td className="px-3 py-3 text-[#9a9a9a]">{b.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
