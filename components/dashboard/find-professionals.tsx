"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronLeft, ChevronRight, ArrowLeft, X, BadgeCheck, Users, Loader2, UserPlus, SlidersHorizontal, ArrowUpDown, List, MapPin, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import type { Role } from "@/lib/use-dashboard-role";
import { getProfessionalDetail, recommendProfessional, type ProCard, type ProDetail } from "@/lib/services/directory";
import { inviteToApply } from "@/lib/services/jobs";
import { SaveToList } from "@/components/dashboard/save-to-list";
import { Pagination } from "@/components/ui/pagination";
import { NomarcAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DISCIPLINE_LABEL } from "@/lib/helm/disciplines";
import { shortLocation } from "@/lib/location-format";

type OpenJob = { id: string; title: string; company: string | null };

const professionalRelationships = [
  "You managed [Name] directly", "You reported directly to [Name]", "You were senior to [Name] but didn't manage directly",
  "[Name] was senior to you but didn't manage directly", "You worked with [Name] in the same group", "[Name] worked with you in a different group",
  "You worked with [Name] but at different companies", "[Name] was a client of yours", "You were a client of [Name]",
  "You taught [Name]", "You mentored [Name]", "You and [Name] studied together",
];
const exhibitorRelationships = [
  "You supplied products or materials to [Name]", "[Name] specified or utilized your products", "You collaborated with [Name] on a project",
  "You provided technical support or consultation to [Name]", "[Name] was a vendor or service provider to you", "[Name] was a direct client or customer",
];

/* Practice status filter — values come straight from profile.practiceStatus
 * (intern | graduate | consultant | licensed | company). Options shown to the
 * user are built from the ones actually present on the updated profiles so the
 * filter always reflects real data. */
const PRACTICE_STATUS_LABEL: Record<string, string> = {
  intern: "Intern",
  graduate: "Graduate / Freelancer",
  consultant: "Consultant",
  licensed: "Licensed",
  company: "Company",
  registered: "Registered",
};
const PRACTICE_STATUS_VALUE: Record<string, string> = Object.fromEntries(
  Object.entries(PRACTICE_STATUS_LABEL).map(([v, l]) => [l, v]),
);
const PRACTICE_STATUS_ORDER = ["intern", "graduate", "consultant", "licensed", "company", "registered"];

const firmTypeFilter = { label: "Firm type", options: ["Architecture & Design", "Engineering", "Construction & Contracting", "Real Estate & Development", "Government & Public Sector", "Other / Consultancy"] };

function FilterGroup({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (o: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[#f0f0f0] dark:border-white/10">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-3 text-sm font-medium text-[#1e1e1e] dark:text-white">
        <span className="flex items-center gap-2">{label}{selected.length > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#ffd716] text-[#1e1e1e] text-[10px] font-bold flex items-center justify-center">{selected.length}</span>}</span>
        <ChevronDown size={16} className={`text-[#9a9a9a] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-3 space-y-1.5">
              {options.map((o) => (
                <label key={o} className="flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60 cursor-pointer hover:text-[#1e1e1e] dark:hover:text-white">
                  <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(o)} className="accent-[#ffd716]" /> {o}
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Live keyword search filter for Occupation / Location — the user types what
 * they're looking for and the list filters as they type. Suggestions come from
 * the professionals' own updated profiles (distinct occupations / places). */
function LiveSearchFilter({ label, value, onChange, suggestions }: { label: string; value: string; onChange: (v: string) => void; suggestions: string[] }) {
  const [open, setOpen] = useState(true);
  const id = `live-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  const active = value.trim().length > 0;
  return (
    <div className="border-b border-[#f0f0f0] dark:border-white/10">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-3 text-sm font-medium text-[#1e1e1e] dark:text-white">
        <span className="flex items-center gap-2">{label}{active && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#ffd716] text-[#1e1e1e] text-[10px] font-bold flex items-center justify-center">1</span>}</span>
        <ChevronDown size={16} className={`text-[#9a9a9a] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
                <input
                  list={id}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent pl-9 pr-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]"
                />
              </div>
              <datalist id={id}>
                {suggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-[#ffd716]/60 bg-[#fffdf2] dark:bg-[#ffd716]/10 px-2.5 py-1 text-[11px] font-medium text-[#1e1e1e] dark:text-white/80">{children}</span>;
}

/* ── recommend slide-over (writes a real recommendation, pending approval) ── */
function RecommendPanel({ open, onClose, detail, role }: { open: boolean; onClose: () => void; detail: ProDetail | null; role: Role }) {
  const relationships = role === "exhibitor" ? exhibitorRelationships : professionalRelationships;
  const first = (detail?.name ?? "").split(" ")[0] || "them";
  const [relationship, setRelationship] = useState("");
  const [position, setPosition] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!detail) return;
    if (!body.trim()) { toast.error("Write a few words before sending"); return; }
    start(async () => {
      try {
        await recommendProfessional({ recommendeeUserId: detail.id, relationship, positionAtTime: position, body });
        toast.success(`Recommendation sent — ${first} will approve it before it shows`);
        setBody(""); setRelationship(""); setPosition(""); onClose();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send recommendation"); }
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="absolute right-0 top-0 h-full w-full max-w-[440px] bg-white dark:bg-[#1e1e1e] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ececec] dark:border-white/10">
              <h3 className="text-base font-bold text-[#1e1e1e] dark:text-white">Write {first} a recommendation</h3>
              <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Relationship</label>
                <div className="mt-1.5">
                  <SelectMenu
                    placeholder="Select relationship"
                    value={relationship}
                    onChange={setRelationship}
                    options={relationships.map((r) => r.replace("[Name]", first))}
                  />
                </div>
              </div>
              {detail && detail.positions.length > 0 && (
                <div>
                  <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{first}&apos;s position at the time</label>
                  <div className="mt-1.5">
                    <SelectMenu
                      placeholder="Select position"
                      value={position}
                      onChange={setPosition}
                      options={detail.positions}
                    />
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Recommendation</label>
                  <span className="text-[11px] text-[#b3b3b3]">{body.length}/2,500</span>
                </div>
                <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 2500))} rows={6} className="mt-1.5 w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" placeholder={`What was it like working with ${first}? Highlight specific skills, project outcomes, or work ethic...`} />
              </div>
            </div>
            <div className="p-5 border-t border-[#ececec] dark:border-white/10 flex justify-end">
              <button onClick={submit} disabled={pending} className="px-6 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors disabled:opacity-50">{pending ? "Sending…" : "Send"}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── invite-to-apply modal ── */
function InviteModal({ open, onClose, detail, jobs }: { open: boolean; onClose: () => void; detail: ProDetail | null; jobs: OpenJob[] }) {
  const router = useRouter();
  const first = (detail?.name ?? "").split(" ")[0] || "this professional";
  const [jobLabel, setJobLabel] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const options = jobs.map((j) => (j.company ? `${j.title} — ${j.company}` : j.title));
  const jobByLabel = (l: string) => jobs[options.indexOf(l)];

  function submit() {
    if (!detail) return;
    const j = jobByLabel(jobLabel);
    if (!j) { toast.error("Choose a job"); return; }
    start(async () => {
      try {
        await inviteToApply({ jobId: j.id, inviteeUserId: detail.id, note });
        toast.success(`Invitation sent to ${first}`);
        setJobLabel(""); setNote(""); onClose();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send invite"); }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Invite ${first} to apply`} subtitle="They'll get a notification linking straight to your job.">
      {jobs.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-[#6b6b6b] dark:text-white/60">You have no open jobs to invite to yet.</p>
          <Link href="/dashboard/jobs/post" onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">Post a job first</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Which job?"><SelectMenu placeholder="Select one of your open jobs" value={jobLabel} onChange={setJobLabel} options={options} /></Field>
          <Field label="Personal note" hint="Optional"><textarea rows={3} className={inputClass + " resize-none"} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Hi ${first}, your profile looks like a strong fit for this role…`} /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton type="button" disabled={pending} onClick={submit}>{pending ? "Sending…" : "Send invite"}</PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── detail view ── */
function DetailView({ detail, loading, canInvite, onBack, onRecommend, onMessage, onInvite }: { detail: ProDetail | null; loading: boolean; canInvite: boolean; onBack: () => void; onRecommend: () => void; onMessage: () => void; onInvite: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-5"><ArrowLeft size={16} /> Back to professionals</button>
      {loading || !detail ? (
        <div className="flex items-center justify-center py-24 text-[#9a9a9a]"><Loader2 className="animate-spin" size={22} /></div>
      ) : (
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 md:p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <NomarcAvatar src={detail.avatarUrl} name={detail.name} className="h-14 w-14 text-base" />
              <div>
                <div className="flex items-center gap-2"><h2 className="text-lg font-bold text-[#1e1e1e] dark:text-white">{detail.name}</h2>{detail.verified && <BadgeCheck size={16} className="text-[#1e9df5]" />}{detail.availability && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#16803c]">{detail.availability}</span>}</div>
                <p className="text-[13px] text-[#9a9a9a]">{[detail.headline, detail.location ? shortLocation(detail.location) : ""].filter(Boolean).join(" • ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canInvite && <button onClick={onInvite} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><UserPlus size={15} /> Invite to apply</button>}
              <button onClick={onMessage} className="px-5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">Message</button>
            </div>
          </div>

          {detail.about && <DetailSection title="About"><p className="text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{detail.about}</p></DetailSection>}

          {detail.services.length > 0 && (
            <DetailSection title="Services">
              <div className="space-y-4">
                {detail.services.map((s) => (
                  <div key={s.id} className="rounded-xl border border-[#ececec] dark:border-white/10 p-4">
                    <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{s.title}</p>
                    {s.category && <p className="text-[12px] text-[#9a9a9a]">{s.category}</p>}
                    {s.description && <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 mt-1.5">{s.description}</p>}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {s.tiers.map((t) => (
                        <div key={t.id} className="rounded-lg border border-[#ececec] dark:border-white/10 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#caa400]">{t.name}</p>
                          <p className="text-base font-bold text-[#1e1e1e] dark:text-white mt-0.5">{t.price ? `₦${t.price.toLocaleString()}` : "—"}</p>
                          {t.deliveryDays != null && <p className="text-[11px] text-[#9a9a9a]">{t.deliveryDays} day{t.deliveryDays === 1 ? "" : "s"}</p>}
                          {t.scope && <p className="text-[11px] text-[#6b6b6b] dark:text-white/60 mt-1.5">{t.scope}</p>}
                          <button onClick={onMessage} className="mt-2.5 w-full py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12px] font-semibold hover:bg-[#e6c114] transition-colors">Request</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            {detail.experience.length > 0 && <DetailSection title="Experience">{detail.experience.map(([a, b]) => <Row key={a} a={a} b={b} />)}</DetailSection>}
            {detail.specialization.length > 0 && <DetailSection title="Areas of specialization"><div className="flex flex-wrap gap-2">{detail.specialization.map((s) => <Tag key={s}>{s}</Tag>)}</div></DetailSection>}
            {detail.education.length > 0 && <DetailSection title="Education">{detail.education.map(([a, b]) => <Row key={a} a={a} b={b} />)}</DetailSection>}
            {detail.skills.length > 0 && <DetailSection title="Skills"><div className="flex flex-wrap gap-2">{detail.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div></DetailSection>}
            {detail.certifications.length > 0 && <DetailSection title="Certifications">{detail.certifications.map(([a, b]) => <Row key={a} a={a} b={b} />)}</DetailSection>}
          </div>

          <div className="mt-5 pt-5 border-t border-[#f0f0f0] dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#1e1e1e] dark:text-white">Recommendations</h3>
              <button onClick={onRecommend} className="text-[13px] font-medium px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">Recommend {detail.name.split(" ")[0]}</button>
            </div>
            {detail.recommendations.length === 0 ? (
              <p className="text-[13px] text-[#9a9a9a]">No recommendations yet — be the first to recommend {detail.name.split(" ")[0]}.</p>
            ) : detail.recommendations.map((r) => (
              <div key={r.name + r.date} className="flex items-start gap-3 mb-4">
                <NomarcAvatar src={r.avatarUrl} name={r.name} size="sm" className="h-9 w-9 text-[11px]" />
                <div>
                  <p className="text-sm"><span className="font-semibold text-[#1e1e1e] dark:text-white">{r.name}</span> <span className="text-[#9a9a9a]">{[r.role, r.date].filter(Boolean).join(" • ") && `• ${[r.role, r.date].filter(Boolean).join(" • ")}`}</span></p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-5 pt-5 border-t border-[#f0f0f0] dark:border-white/10"><h3 className="text-sm font-bold text-[#1e1e1e] dark:text-white mb-2.5">{title}</h3>{children}</div>;
}
function Row({ a, b }: { a: string; b: string }) {
  return <div className="flex items-center justify-between text-[13px] py-0.5 gap-3"><span className="text-[#1e1e1e] dark:text-white/80">{a}</span><span className="text-[#9a9a9a] flex-shrink-0">{b}</span></div>;
}

const PRO_SORT_OPTIONS = ["Best match", "Most experience", "Name A–Z"];
const PRO_PER_PAGE_OPTIONS = [20, 50, 100, 200, 500, 1000];
type ProView = "list" | "g2" | "g3" | "g4";
const TYPE_OPTIONS = ["Individual Professional", "Company"] as const;
type ProType = (typeof TYPE_OPTIONS)[number] | "All";
const PRO_TYPE_OPTIONS: ProType[] = ["All", "Individual Professional", "Company"];

/* Compact toolbar dropdown (sort, per-page) — mirrors Browse Jobs. */
function MiniSelect({ value, options, onChange, icon, suffix }: {
  value: string | number; options: (string | number)[]; onChange: (v: string | number) => void; icon?: React.ReactNode; suffix?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-shrink-0">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 120)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:border-[#ffd716] transition-colors whitespace-nowrap">
        {icon}{value}{suffix}<ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}
            className="absolute top-full right-0 mt-1.5 z-30 min-w-[150px] rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#262626] shadow-xl p-1">
            {options.map((o) => (
              <button key={o} onMouseDown={() => { onChange(o); setOpen(false); }} className={cn("w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] transition-colors", o === value ? "bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white font-medium" : "text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5")}>{o}{suffix}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── main ── */
export function FindProfessionals({ role, pros = [], myOpenJobs = [], online = {} }: { role: Role; pros?: ProCard[]; myOpenJobs?: OpenJob[]; online?: Record<string, boolean> }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProDetail | null>(null);
  const [loadingDetail, startDetail] = useTransition();
  const [recommend, setRecommend] = useState(false);
  const [invite, setInvite] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [occSearch, setOccSearch] = useState("");
  const [locSearch, setLocSearch] = useState("");

  // Filter options are derived from the professionals' own profile data rather
  // than a hardcoded list, so Occupation / Practice status / Location always
  // reflect what members last saved on their professional profiles.
  const occOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pros) {
      const t = (p.headline ?? "").trim();
      if (!t) continue;
      const k = t.toLowerCase();
      if (!m.has(k)) m.set(k, t);
    }
    return [...m.values()].sort((a, b) => a.localeCompare(b));
  }, [pros]);

  const locOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of pros) {
      const loc = (p.location ?? "").trim();
      if (!loc) continue;
      const parts = loc.split(",").map((x) => x.trim()).filter(Boolean);
      s.add(parts.length > 1 ? parts[parts.length - 1] : loc);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [pros]);

  const practiceStatusOptions = useMemo(() => {
    const present = new Set<string>();
    for (const p of pros) if (p.practiceStatus) present.add(p.practiceStatus);
    return PRACTICE_STATUS_ORDER.filter((v) => present.has(v)).map((v) => PRACTICE_STATUS_LABEL[v]);
  }, [pros]);

  // Occupations and locations search live as the user types; practice status
  // stays a checkbox list. Suggestions for the live searches come straight from
  // the updated professional profiles.
  const liveSearchFilters = [
    { label: "Occupation", value: occSearch, onChange: setOccSearch, suggestions: occOptions },
    { label: "Location", value: locSearch, onChange: setLocSearch, suggestions: locOptions },
  ];
  const checkboxFilters = [
    { label: "Practice status", options: practiceStatusOptions },
    ...(role === "exhibitor" ? [firmTypeFilter] : []),
  ];
  const subtitle = role === "exhibitor"
    ? "Connect with verified industry professionals and key decision-makers."
    : "Browse verified construction talent for your next project.";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ProView>("g3");
  const [sortBy, setSortBy] = useState(PRO_SORT_OPTIONS[0]);
  const [perPage, setPerPage] = useState(50);
  const [type, setType] = useState<ProType>("All");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const toggle = (label: string, o: string) =>
    setSel((s) => { const cur = s[label] ?? []; return { ...s, [label]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] }; });
  const clearAll = () => { setSel({}); setQuery(""); setOccSearch(""); setLocSearch(""); };

  const openProfile = (id: string) => {
    setSelectedId(id); setDetail(null);
    startDetail(async () => { try { setDetail(await getProfessionalDetail(id)); } catch { toast.error("Couldn't load profile"); } });
  };

  // filtering + sorting over the DB-backed list
  const q = query.trim().toLowerCase();
  const occSearchLower = occSearch.trim().toLowerCase();
  const locSearchLower = locSearch.trim().toLowerCase();
  const practiceStatus = sel["Practice status"] ?? [];
  let results = pros.filter((p) => {
    const hay = `${p.name} ${p.headline} ${p.location} ${p.skills.join(" ")}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (type === "Individual Professional" && p.isCompany) return false;
    if (type === "Company" && !p.isCompany) return false;
    if (occSearchLower) {
      const occHay = `${p.headline} ${DISCIPLINE_LABEL[p.discipline] ?? ""}`.toLowerCase();
      if (!occHay.includes(occSearchLower)) return false;
    }
    if (locSearchLower && !p.location.toLowerCase().includes(locSearchLower)) return false;
    if (practiceStatus.length && !practiceStatus.some((l) => p.practiceStatus === PRACTICE_STATUS_VALUE[l])) return false;
    return true;
  });
  if (sortBy === "Most experience") results = [...results].sort((a, b) => b.years - a.years);
  else if (sortBy === "Name A–Z") results = [...results].sort((a, b) => a.name.localeCompare(b.name));
  const activeCount = Object.values(sel).reduce((n, a) => n + a.length, 0) + (q ? 1 : 0) + (occSearch.trim() ? 1 : 0) + (locSearch.trim() ? 1 : 0);

  const pageCount = Math.max(1, Math.ceil(results.length / perPage));
  const safePage = Math.min(page, pageCount);
  const paged = results.slice((safePage - 1) * perPage, safePage * perPage);
  useEffect(() => { setPage(1); }, [query, sel, sortBy, perPage, type]);

  const gridCls = view === "list" ? "space-y-3"
    : view === "g2" ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
    : view === "g3" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";

  const filterInner = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-1 pb-3 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
        <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Filters</h2>
        {activeCount > 0 && <button onClick={clearAll} className="text-[11px] text-[#9a9a9a] hover:text-[#e5484d] transition-colors font-medium">Clear all</button>}
      </div>
      <div className="flex-1 overflow-y-auto pt-1">
        {liveSearchFilters.map((f) => <LiveSearchFilter key={f.label} label={f.label} value={f.value} onChange={f.onChange} suggestions={f.suggestions} />)}
        {checkboxFilters.map((f) => <FilterGroup key={f.label} label={f.label} options={f.options} selected={sel[f.label] ?? []} onToggle={(o) => toggle(f.label, o)} />)}
      </div>
    </div>
  );

  // Detail view takes over the full scroll area
  if (selectedId) {
    return (
      <div className="h-[calc(100dvh-3.5rem)] lg:h-screen overflow-y-auto px-5 sm:px-8 py-6">
        <DetailView detail={detail} loading={loadingDetail} canInvite={role !== "professional"} onBack={() => { setSelectedId(null); setDetail(null); }} onRecommend={() => setRecommend(true)} onMessage={() => router.push(`/dashboard/messages?to=${selectedId}`)} onInvite={() => setInvite(true)} />
        <RecommendPanel open={recommend} onClose={() => setRecommend(false)} detail={detail} role={role} />
        <InviteModal open={invite} onClose={() => setInvite(false)} detail={detail} jobs={myOpenJobs} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-screen min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-6 pb-3 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">Find Professionals</h1>
        <p className="text-[13px] text-[#9a9a9a] mt-0.5">{subtitle}</p>
      </div>

      {/* Toolbar */}
      <div className="px-5 sm:px-6 pb-3 flex items-center gap-2.5 flex-shrink-0">
        <button onClick={() => setSidebarOpen((o) => !o)} className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-full border text-[12.5px] font-medium transition-colors flex-shrink-0 ${sidebarOpen ? "bg-[#ffd716] text-[#1e1e1e] border-[#ffd716]" : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"}`}>
          <SlidersHorizontal size={13} /> Filters
          {activeCount > 0 && <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e] text-[9px] font-bold flex items-center justify-center">{activeCount}</span>}
        </button>
        <button onClick={() => setDrawerOpen(true)} className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-full border text-[12.5px] font-medium transition-colors flex-shrink-0 ${activeCount > 0 ? "bg-[#ffd716] text-[#1e1e1e] border-[#ffd716]" : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60"}`}>
          <SlidersHorizontal size={13} /> Filters
          {activeCount > 0 && <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#1e1e1e] text-white text-[9px] font-bold flex items-center justify-center">{activeCount}</span>}
        </button>
        <MiniSelect value={type} options={PRO_TYPE_OPTIONS} onChange={(v) => setType(v as ProType)} icon={<Users size={13} className="text-[#9a9a9a]" />} />
        <div className="flex-1" />
        <MiniSelect value={sortBy} options={PRO_SORT_OPTIONS} onChange={(v) => setSortBy(v as string)} icon={<ArrowUpDown size={13} className="text-[#9a9a9a]" />} />
        <MiniSelect value={perPage} options={PRO_PER_PAGE_OPTIONS} onChange={(v) => setPerPage(v as number)} suffix=" / page" />
        <div className="hidden sm:flex items-center rounded-full border border-[#e3e3e3] dark:border-white/15 overflow-hidden flex-shrink-0">
          <button onClick={() => setView("list")} title="List view" className={cn("px-2.5 py-2 transition-colors", view === "list" ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}><List size={14} /></button>
          {([["g2", 2], ["g3", 3], ["g4", 4]] as [ProView, number][]).map(([v, n]) => (
            <button key={v} onClick={() => setView(v)} title={`${n} columns`} className={cn("px-2.5 py-2 text-[12px] font-bold leading-none transition-colors", n >= 3 && "hidden lg:block", n === 4 && "hidden xl:block", view === v ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>{n}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop filter sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside key="sidebar" initial={{ width: 0, opacity: 0 }} animate={{ width: 232, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="hidden lg:flex flex-col flex-shrink-0 border-r border-[#f0f0f0] dark:border-white/10 overflow-hidden">
              <div className="w-[232px] h-full overflow-y-auto px-5 sm:px-6 py-4">{filterInner}</div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile filter drawer */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={() => setDrawerOpen(false)} />
              <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="fixed inset-y-0 left-0 z-50 w-[290px] max-w-[85vw] bg-white dark:bg-[#1a1a1a] shadow-2xl flex flex-col lg:hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-2"><SlidersHorizontal size={15} className="text-[#caa400]" /><span className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Filters</span></div>
                  <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-3">{filterInner}</div>
                <div className="flex-shrink-0 px-5 py-4 border-t border-[#f0f0f0] dark:border-white/10 flex gap-2.5">
                  {activeCount > 0 && <button onClick={() => { clearAll(); setDrawerOpen(false); }} className="flex-1 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:bg-[#f7f7f7] transition-colors">Clear all</button>}
                  <button onClick={() => setDrawerOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">Show {results.length} results</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* List column */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="px-5 sm:px-6 pb-10">
            {/* Hero banner with embedded search — mirrors Browse Jobs */}
            <div className="rounded-2xl bg-[#1e1e1e] dark:bg-[#ffd716] p-5 sm:p-6 mb-4">
              <h2 className="text-[17px] sm:text-[19px] font-bold text-white dark:text-[#1e1e1e] leading-snug">{role === "exhibitor" ? "Find the right people for your brand" : "Find verified construction talent"}</h2>
              <p className="text-[12.5px] text-white/55 dark:text-[#1e1e1e]/70 mt-1 max-w-md">Search by name, role, skill or location — then save, message or invite.</p>
              <div className="mt-4 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-full bg-white dark:bg-[#262626] pl-11 pr-11 py-3 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:ring-2 focus:ring-[#ffd716]/40 transition-shadow shadow-sm" placeholder="Try “Architect”, “Lagos”, or “Revit”" />
                {query && <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-[#9a9a9a]"><X size={15} /></button>}
              </div>
            </div>

            <p className="text-[12px] text-[#9a9a9a] mb-3">Showing <span className="font-semibold text-[#1e1e1e] dark:text-white">{results.length}</span> {type === "Company" ? (results.length === 1 ? "company" : "companies") : results.length === 1 ? "professional" : "professionals"}{activeCount > 0 ? " matching your filters" : ""}</p>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] mb-4"><Users size={22} /></div>
                <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{pros.length === 0 ? "No professionals yet" : "No professionals match"}</h3>
                <p className="mt-1.5 text-[13px] text-[#9a9a9a] max-w-sm">{pros.length === 0 ? "Check back soon as talent joins the platform." : "Try adjusting your filters or search."}</p>
                {activeCount > 0 && <button onClick={clearAll} className="mt-5 px-5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">Clear filters</button>}
              </div>
            ) : (
              <>
              <div className={gridCls}>
                <AnimatePresence>
                  {paged.map((p) => {
                    const meta = (
                      <>
                        <h3 className="text-[14px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1.5 flex-wrap">{p.name} {p.verified && <BadgeCheck size={14} className="text-[#1e9df5] flex-shrink-0" />}</h3>
                        <p className="text-[12px] text-[#9a9a9a] mt-0.5">{[p.headline, p.location].filter(Boolean).join(" • ")}{p.availability && <span className="text-[#16a34a] dark:text-[#4ade80]"> • {p.availability}</span>}</p>
                      </>
                    );
                    if (view === "list") {
                      return (
                        <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                          className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 hover:border-[#ffd716] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <NomarcAvatar src={p.avatarUrl} name={p.name} className="h-11 w-11 flex-shrink-0 text-[13px]" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">{meta}</div>
                                <div className="mt-2 flex flex-wrap gap-1.5">{p.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <SaveToList itemType="professional" itemId={p.id} />
                              <button onClick={() => openProfile(p.id)} className="px-4 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors whitespace-nowrap">View profile</button>
                              <button onClick={() => router.push(`/dashboard/messages?to=${p.id}`)} className="px-4 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] transition-colors whitespace-nowrap">Message</button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    }
                    // grid card — banner + overlapping avatar + stats
                    const extraSkills = Math.max(0, p.skills.length - 3);
                    return (
                      <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                        whileHover={{ y: -3 }}
                        className="group flex flex-col rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden hover:border-[#ffd716] hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)] transition-[border-color,box-shadow]">
                        {/* brand cover */}
                        <div className="relative h-[68px] bg-gradient-to-br from-[#1e1e1e] to-[#3a3a3a] dark:from-[#2a2a2a] dark:to-[#141414]">
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                            <SaveToList itemType="professional" itemId={p.id} />
                          </div>
                        </div>

                        <div className="px-4 pb-4 flex flex-col flex-1">
                          {/* avatar overlapping cover */}
                          <div className="-mt-9">
                            <div className="relative inline-block">
                              <NomarcAvatar
                                src={p.avatarUrl}
                                name={p.name}
                                className="w-[68px] h-[68px] text-lg ring-4 ring-white dark:ring-[#1e1e1e]"
                              />
                              {online[p.id] ? (
                                <span title="Online now" className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#16a34a] ring-2 ring-white dark:ring-[#1e1e1e]" />
                              ) : p.availability ? (
                                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#9a9a9a] ring-2 ring-white dark:ring-[#1e1e1e]" />
                              ) : null}
                            </div>
                          </div>

                          {/* identity */}
                          <div className="mt-2.5">
                            <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{p.name}</span>
                              {p.verified && <BadgeCheck size={15} className="text-[#1e9df5] flex-shrink-0" />}
                            </h3>
                            {p.headline && <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/60 mt-0.5 truncate">{p.headline}</p>}
                            <p className="text-[11.5px] text-[#9a9a9a] mt-1 flex items-center gap-1 min-w-0">
                              {p.location && <><MapPin size={12} className="flex-shrink-0" /> <span className="truncate">{p.location}</span></>}
                              {p.availability && <span className="text-[#16a34a] dark:text-[#4ade80] font-medium whitespace-nowrap">• {p.availability}</span>}
                            </p>
                          </div>

                          {/* Skills, not the rating/experience/success tiles.
                              Those three read "—" on almost every card: ratings
                              need reviews, and years/success are unpopulated for
                              most profiles, so the block cost a third of the card
                              to say nothing. Skills are the field people actually
                              fill in, and they are what you hire on. */}
                          <div className="mt-3 flex flex-wrap gap-1.5 flex-1 content-start">
                            {p.skills.slice(0, 3).map((s) => <Tag key={s}>{s}</Tag>)}
                            {extraSkills > 0 && <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[#ffd716]/60 bg-[#fffdf2] dark:bg-[#ffd716]/10 text-[11px] font-medium text-[#9a9a9a] dark:text-white/50">+{extraSkills}</span>}
                          </div>

                          {/* actions */}
                          <div className="mt-4 flex items-center gap-2">
                            <button onClick={() => openProfile(p.id)} className="flex-1 px-3 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] hover:bg-[#fffdf2] dark:hover:bg-[#ffd716]/[0.06] transition-colors">View profile</button>
                            <button onClick={() => router.push(`/dashboard/messages?to=${p.id}`)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] transition-colors"><MessageSquare size={14} /> Message</button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <Pagination
                className="mt-7"
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                totalItems={results.length}
                pageSize={perPage}
                noun="professional"
              />
              </>
            )}
          </div>
        </div>
      </div>

      <RecommendPanel open={recommend} onClose={() => setRecommend(false)} detail={detail} role={role} />
      <InviteModal open={invite} onClose={() => setInvite(false)} detail={detail} jobs={myOpenJobs} />
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function FindProfessionalsSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) =>
    <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-screen min-h-0 overflow-hidden">
      <div className="px-5 sm:px-6 pt-6 pb-3 flex-shrink-0 space-y-1.5">
        <S cls="h-7 w-48" />
        <S cls="h-3.5 w-72 max-w-[80vw]" />
      </div>
      <div className="px-5 sm:px-6 pb-3 flex items-center gap-2.5 flex-shrink-0">
        <S cls="h-8 w-20 rounded-full flex-shrink-0" />
        <div className="flex-1" />
        <S cls="h-8 w-28 rounded-full" />
        <S cls="h-8 w-20 rounded-full" />
        <S cls="hidden sm:block h-8 w-20 rounded-full" />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden lg:flex flex-col w-[232px] flex-shrink-0 border-r border-[#f0f0f0] dark:border-white/10 px-5 py-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between"><S cls="h-4 w-14" /><S cls="h-3 w-12" /></div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <S cls="h-3.5 w-24" />
              <div className="space-y-1.5">{Array.from({ length: 3 }).map((_, j) => <S key={j} cls="h-7 w-full rounded-lg" />)}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <S cls="w-11 h-11 rounded-full flex-shrink-0" />
                    <div className="min-w-0 space-y-1.5">
                      <S cls="h-3.5 w-32" /><S cls="h-3 w-24" /><S cls="h-3 w-20" />
                    </div>
                  </div>
                  <S cls="w-7 h-7 rounded-lg flex-shrink-0" />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[60, 72, 56, 80].map((w, j) => <S key={j} cls="h-6 rounded-full" style={{ width: w }} />)}
                </div>
                <div className="mt-3 pt-3 border-t border-[#f5f5f5] dark:border-white/5 flex items-center gap-2">
                  <S cls="flex-1 h-9 rounded-lg" /><S cls="flex-1 h-9 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
