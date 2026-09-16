"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getAccountInfo } from "@/lib/services/account";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Briefcase,
  Bookmark, BookmarkCheck, X, Trash2, SlidersHorizontal, MapPin, Clock,
  List, Zap, ArrowRight, ArrowUpDown,
  Wallet, Layers, TrendingUp, PanelLeftClose, PanelLeftOpen, SearchX,
} from "lucide-react";
import { getQualifications, type Experience } from "@/lib/services/qualifications";
import { toggleSaved } from "@/lib/services/saved";
import { ShareMenu } from "@/components/ui/share";
import { EXPERIENCE_LEVELS } from "@/lib/experience-levels";
// SAMPLE_JOBS no longer padded into the list (see `data` below). OVERVIEW is
// still the shared copy shown in the quick-look drawer.
import { JOB_OVERVIEW as OVERVIEW } from "@/lib/sample-jobs";
import { EmptyState } from "@/components/dashboard/kit";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────── */

type JobCard = {
  id: string; title: string; company: string; location: string;
  desc: string; tags: string[]; salary: string; time: string;
  applicants?: number; category?: string;
};

/* ─── Filter config ─────────────────────────────────────────────── */

const FILTER_SECTIONS = [
  { key: "Experience level", options: [...EXPERIENCE_LEVELS] },
  { key: "Employment type",  options: ["Full-time", "Part-time", "Internship", "Remote", "Contract"] },
  { key: "Work model",       options: ["On-site", "Hybrid", "Remote"] },
  { key: "Salary Range",     options: ["Under ₦250k/mo", "₦250k–₦500k/mo", "₦500k–₦1M/mo", "₦1M+/mo"] },
  { key: "Industry",         options: ["Architecture", "Engineering", "Construction", "Interior Design", "Quantity Surveying", "Project Management"] },
];

/* ─── Icon tile — replaces the old colored-letter avatar with the redesign's
 *     plain yellow-tinted icon square used everywhere a job/application has
 *     no photo (images 33/35/27/28/31). ─────────────────────────────────── */
function JobIcon({ size = 40, iconSize = 18, className }: { size?: number; iconSize?: number; className?: string }) {
  return (
    <div
      className={cn("flex flex-shrink-0 items-center justify-center rounded-xl bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10", className)}
      style={{ width: size, height: size }}
    >
      <Briefcase size={iconSize} />
    </div>
  );
}

/* The profile sidebar reads the signed-in professional's own experience and
   skills — see ProfileSidebar below. */

/* ─── Filter section (boxed accordion, matches image 34) ───────── */

function FilterSection({ sectionKey, options, selected, onToggle, extra }: {
  sectionKey: string; options: string[]; selected: string[]; onToggle: (o: string) => void; extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const active = selected.length > 0;
  return (
    <div className={cn("rounded-xl border transition-colors", open || active ? "border-[#ffd716]" : "border-[#ececec] dark:border-white/10")}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">
        <span className="flex items-center gap-2">
          {sectionKey}
          {active && <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#ffd716] text-[#1e1e1e] text-[9px] font-bold flex items-center justify-center">{selected.length}</span>}
        </span>
        {open ? <ChevronUp size={13} className="text-[#9a9a9a]" /> : <ChevronDown size={13} className="text-[#9a9a9a]" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.14 }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-[#f5f5f5] dark:border-white/5">
              {extra}
              {options.map((opt) => {
                const checked = selected.includes(opt);
                return (
                  <label key={opt} onClick={() => onToggle(opt)} className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0 transition-colors", checked ? "bg-[#ffd716] border-[#ffd716]" : "border-[#d1d5db] dark:border-white/20 group-hover:border-[#ffd716]")}>
                      {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#1e1e1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span className={cn("text-[12.5px] select-none transition-colors", checked ? "text-[#1e1e1e] dark:text-white font-medium" : "text-[#6b6b6b] dark:text-white/60 group-hover:text-[#1e1e1e] dark:group-hover:text-white")}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterPanel({ sel, onToggle, activeCount, onClear, locationQuery, onLocationQuery }: {
  sel: Record<string, string[]>; onToggle: (key: string, opt: string) => void; activeCount: number; onClear: () => void;
  locationQuery: string; onLocationQuery: (v: string) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-0.5 pb-3 flex-shrink-0">
        <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Filters</h2>
        {activeCount > 0 && <button onClick={onClear} className="text-[11px] text-[#9a9a9a] hover:text-[#e5484d] transition-colors font-medium">Clear all</button>}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2.5 pb-2">
        <FilterSection
          sectionKey="Location" options={[]} selected={locationQuery ? [locationQuery] : []} onToggle={() => {}}
          extra={
            <input
              value={locationQuery}
              onChange={(e) => onLocationQuery(e.target.value)}
              placeholder="Enter location"
              className="w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-3 py-2 text-[12.5px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors"
            />
          }
        />
        {FILTER_SECTIONS.map((s) => (
          <FilterSection key={s.key} sectionKey={s.key} options={s.options} selected={sel[s.key] ?? []} onToggle={(o) => onToggle(s.key, o)} />
        ))}
      </div>
    </div>
  );
}

/* ─── Profile sidebar ───────────────────────────────────────────── */

type ProfileInfo = { name: string; headline: string; location: string; practiceLicenceStatus: string };

const PRACTICE_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  intern: { label: "Intern", cls: "border-[#e5e7eb] bg-[#f9fafb] dark:border-white/12 dark:bg-white/[0.04]", dot: "bg-[#9ca3af]" },
  graduate: { label: "Graduate / Freelancer", cls: "border-[#e5e7eb] bg-[#f9fafb] dark:border-white/12 dark:bg-white/[0.04]", dot: "bg-[#9ca3af]" },
  consultant: { label: "Consultant", cls: "border-[#e9d5ff] bg-[#faf5ff] dark:border-[#a855f7]/25 dark:bg-[#a855f7]/10", dot: "bg-[#a855f7]" },
  licensed: { label: "Licensed", cls: "border-[#bbf7d0] bg-[#f0fdf4] dark:border-[#22c55e]/20 dark:bg-[#22c55e]/10", dot: "bg-[#22c55e]" },
  registered: { label: "Registered", cls: "border-[#bbf7d0] bg-[#f0fdf4] dark:border-[#22c55e]/20 dark:bg-[#22c55e]/10", dot: "bg-[#10b981]" },
  company: { label: "Company", cls: "border-[#bfdbfe] bg-[#eff6ff] dark:border-[#3b82f6]/25 dark:bg-[#3b82f6]/10", dot: "bg-[#3b82f6]" },
};

function ProfileSidebar() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    getAccountInfo().then((d) => setProfile({ name: d.name, headline: d.headline, location: d.location, practiceLicenceStatus: d.practiceLicenceStatus })).catch(() => {});
    // Real experience and skills for the signed-in professional. These panels
    // used to render a fixed list ("Reyfield Associates", "AutoCAD", "Revit"…),
    // so every account appeared to share one person's CV.
    getQualifications()
      .then((q) => {
        setExperience(q.experience ?? []);
        setSkills((q.skills ?? []).map((s) => s.name));
      })
      .catch(() => {});
  }, []);

  const period = (e: Experience) => {
    const fmt = (d: string | null) => (d ? new Date(d).getFullYear().toString() : "");
    const start = fmt(e.startDate);
    const end = e.current ? "Present" : fmt(e.endDate);
    return [start, end].filter(Boolean).join(" – ");
  };
  // Deterministic tint per company, so colours stay stable between renders
  // instead of reshuffling on every paint.
  const TINTS = ["#ffd716", "#22c55e", "#6366f1", "#f97316", "#06b6d4"];

  const name = profile?.name || session?.user?.name || "Your Profile";
  const headline = profile?.headline || "Construction Professional";
  const location = profile?.location || "Lagos, Nigeria";
  const practice = profile?.practiceLicenceStatus ? PRACTICE_BADGE[profile.practiceLicenceStatus] : null;
  const initials = name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
  const avatar = session?.user?.image;

  return (
    <div className="h-full overflow-y-auto">
      <h2 className="text-[12px] font-bold text-[#9a9a9a] uppercase tracking-wide mb-3 px-1">Profile</h2>

      <div className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 mb-3">
        <div className="flex items-start gap-3">
          {avatar ? (
            <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold text-[14px] flex-shrink-0">{initials}</div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white leading-snug truncate">{name}</h3>
            <p className="text-[11.5px] text-[#9a9a9a] truncate">{headline}</p>
            <p className="flex items-center gap-1 text-[11px] text-[#9a9a9a] mt-0.5"><MapPin size={9} /> {location}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f0fdf4] dark:bg-[#22c55e]/10 border border-[#bbf7d0] dark:border-[#22c55e]/20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#16a34a] dark:text-[#4ade80]">Available for work</span>
        </div>
        {practice && (
          <div className={cn("mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border", practice.cls)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", practice.dot)} />
            <span className="text-[11px] font-semibold text-[#6b6b6b] dark:text-white/70">{practice.label}</span>
          </div>
        )}
        <Link href="/dashboard/profile" className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
          View profile <ArrowRight size={11} />
        </Link>
      </div>

      <div className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 mb-3">
        <h4 className="text-[12px] font-bold text-[#1e1e1e] dark:text-white uppercase tracking-wide mb-3 flex items-center gap-1.5"><TrendingUp size={12} className="text-[#caa400]" /> Work Experience</h4>
        {experience.length === 0 ? (
          <p className="text-[11.5px] text-[#9a9a9a]">
            No roles added yet. <Link href="/dashboard/profile/qualifications" className="font-medium text-[#1e1e1e] underline dark:text-white">Add your experience</Link> to strengthen applications.
          </p>
        ) : (
          <div className="space-y-3">
            {experience.slice(0, 3).map((e, n) => (
              <div key={e.id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: TINTS[n % TINTS.length] }}>
                  {(e.company || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white truncate">{e.title}</p>
                  <p className="text-[11px] text-[#9a9a9a] truncate">{[e.company, period(e)].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 mb-3">
        <h4 className="text-[12px] font-bold text-[#1e1e1e] dark:text-white uppercase tracking-wide mb-3 flex items-center gap-1.5"><Zap size={12} className="text-[#caa400]" /> Top Skills</h4>
        {skills.length === 0 ? (
          <p className="text-[11.5px] text-[#9a9a9a]">
            No skills listed yet. <Link href="/dashboard/profile/qualifications" className="font-medium text-[#1e1e1e] underline dark:text-white">Add a few</Link> so employers can match you.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 8).map((s) => <span key={s} className="px-2 py-1 rounded-md bg-[#f5f5f5] dark:bg-white/[0.06] text-[11px] font-medium text-[#6b6b6b] dark:text-white/60">{s}</span>)}
          </div>
        )}
      </div>

      {/* A "Job Fairs" panel used to sit here listing fixed events (Lagos Build
          Expo, Contractors Forum Abuja…). Nothing in the schema models events,
          so it's removed rather than shown as invented dates. */}
    </div>
  );
}

/* ─── Job preview (shared content for right-panel + mobile drawer) ─ */

function MetaCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-[#9a9a9a] leading-tight">{label}</p>
        <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white leading-tight mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function JobPreview({ job, isSaved, onSave, onClose }: {
  job: JobCard; isSaved: boolean; onSave: () => void; onClose: () => void;
}) {
  const workModel = job.tags.find((t) => ["On-site", "Hybrid", "Remote"].includes(t)) || "On-site";
  const jobType = job.tags.find((t) => ["Full-time", "Part-time", "Contract", "Internship"].includes(t)) || "Full-time";

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1a1a1a]">
      {/* Top bar — consistent across desktop panel + mobile drawer */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
        <span className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Overview</span>
        <div className="flex items-center gap-1">
          <ShareMenu title={`${job.title} at ${job.company}`} variant="icon" />
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {/* Identity */}
        <div className="flex items-start gap-3">
          <JobIcon size={44} iconSize={20} />
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white leading-snug">{job.title}</h3>
            <p className="text-[12.5px] text-[#9a9a9a]">{job.company} · {job.location}</p>
          </div>
        </div>

        {/* Tags + salary + posted */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {job.tags.map((t) => <span key={t} className="px-2.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[11px] font-medium text-[#6b6b6b] dark:text-white/55">{t}</span>)}
          {job.salary && <span className="px-2.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[11px] font-medium text-[#6b6b6b] dark:text-white/55">{job.salary}</span>}
          <span className="text-[11px] text-[#9a9a9a]">· {job.time}</span>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <button onClick={onSave} className={cn("w-9 h-9 flex items-center justify-center rounded-xl border transition-colors flex-shrink-0", isSaved ? "border-[#ffd716] text-[#ffd716] bg-[#fff7cc] dark:bg-[#ffd716]/10" : "border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:border-[#ffd716] hover:text-[#ffd716]")}>
            {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
          <Link href={`/dashboard/jobs/apply?job=${job.id}`} className="flex-1 text-center py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">
            Apply
          </Link>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 mt-4 py-4 border-y border-[#f0f0f0] dark:border-white/10">
          <MetaCell icon={<MapPin size={13} />} label="Job Location" value={job.location} />
          <MetaCell icon={<Briefcase size={13} />} label="Work Model" value={workModel} />
          <MetaCell icon={<Layers size={13} />} label="Job Type" value={jobType} />
          <MetaCell icon={<Wallet size={13} />} label="Salary Range" value={job.salary || "Not disclosed"} />
        </div>

        <p className="text-[12px] text-[#9a9a9a] mt-3">Posted {job.time} · {job.applicants ?? 24} applicants</p>
        <Link href={`/dashboard/jobs/${job.id}`} className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
          See full details <ArrowRight size={14} />
        </Link>

        {/* Description */}
        <div className="mt-5">
          <h4 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-2">About this role</h4>
          <p className="text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{job.desc || OVERVIEW.body}</p>
        </div>

        {/* Responsibilities */}
        <div className="mt-5">
          <h4 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-2">Responsibilities</h4>
          <ul className="space-y-1.5">
            {OVERVIEW.responsibilities.map((r) => (
              <li key={r} className="flex gap-2 text-[12.5px] text-[#6b6b6b] dark:text-white/60"><span className="text-[#ffd716] mt-0.5 flex-shrink-0">•</span>{r}</li>
            ))}
          </ul>
        </div>

        {/* Requirements */}
        <div className="mt-5">
          <h4 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-2">Qualifications</h4>
          <ul className="space-y-1.5">
            {OVERVIEW.requirements.map((r) => (
              <li key={r} className="flex gap-2 text-[12.5px] text-[#6b6b6b] dark:text-white/60"><span className="text-[#22c55e] mt-0.5 flex-shrink-0">✓</span>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Job cards (browse: grid + list) ───────────────────────────── */

function JobCardGrid({ job, isSaved, onSave, onOpen, active }: {
  job: JobCard; isSaved: boolean; onSave: () => void; onOpen: () => void; active?: boolean;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      className={cn("rounded-xl border bg-white dark:bg-[#1e1e1e] p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] transition-all flex flex-col group cursor-pointer", active ? "border-[#ffd716] shadow-[0_4px_20px_rgba(0,0,0,0.07)]" : "border-[#ececec] dark:border-white/10 hover:border-[#ffd716]")}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <JobIcon />
          {job.category && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#f5f5f5] dark:bg-white/[0.06] text-[#6b6b6b] dark:text-white/60">{job.category}</span>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onSave(); }} className={cn("w-7 h-7 flex items-center justify-center rounded-lg transition-colors", isSaved ? "text-[#ffd716] bg-[#fff7cc] dark:bg-[#ffd716]/10" : "text-[#c3c3c3] hover:text-[#ffd716] hover:bg-[#fafafa] dark:hover:bg-white/5")}>
          {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>
      </div>
      <div className="flex-1">
        <p className="text-[11.5px] text-[#9a9a9a] mb-0.5">{job.company} · {job.location}</p>
        <h3 className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white leading-snug group-hover:text-[#caa400] transition-colors line-clamp-2">{job.title}</h3>
        <p className="mt-1.5 text-[12px] text-[#9a9a9a] line-clamp-2 leading-relaxed">{job.desc}</p>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {job.tags.slice(0, 3).map((t) => <span key={t} className="px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[10.5px] text-[#6b6b6b] dark:text-white/50">{t}</span>)}
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-[#9a9a9a]">
          {job.salary && <span className="font-bold text-[13px] text-[#1e1e1e] dark:text-white">{job.salary}</span>}
          <span className="flex items-center gap-1"><Clock size={10} /> {job.time}</span>
        </div>
      </div>
      <div className="mt-3.5 pt-3 border-t border-[#f5f5f5] dark:border-white/5 flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex-1 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[11.5px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors">Details</button>
        <Link href={`/dashboard/jobs/apply?job=${job.id}`} onClick={(e) => e.stopPropagation()} className="flex-1 text-center py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[11.5px] font-bold hover:bg-[#e6c114] transition-colors">Apply</Link>
      </div>
    </motion.div>
  );
}

function JobCardList({ job, isSaved, onSave, onOpen, active }: {
  job: JobCard; isSaved: boolean; onSave: () => void; onOpen: () => void; active?: boolean;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      onClick={onOpen}
      className={cn("rounded-xl border bg-white dark:bg-[#1e1e1e] p-4 hover:shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all group cursor-pointer", active ? "border-[#ffd716]" : "border-[#ececec] dark:border-white/10 hover:border-[#ffd716]")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <JobIcon />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white group-hover:text-[#caa400] transition-colors">{job.title}</h3>
                <p className="text-[11.5px] text-[#9a9a9a] mt-0.5">{job.company} · {job.location}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onSave(); }} className={cn("w-7 h-7 -mt-1 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors", isSaved ? "text-[#ffd716]" : "text-[#c3c3c3] hover:text-[#ffd716]")}>
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-[#9a9a9a] leading-relaxed line-clamp-2">{job.desc}</p>
          </div>
        </div>
      </div>

      {/* Footer: tags + salary + meta + actions */}
      <div className="mt-3 pt-3 border-t border-[#f5f5f5] dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {job.tags.slice(0, 3).map((t) => <span key={t} className="px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[10.5px] font-medium text-[#6b6b6b] dark:text-white/55">{t}</span>)}
          {job.salary && <span className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">{job.salary}</span>}
          <span className="text-[11px] text-[#9a9a9a]">· {job.time}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[11.5px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors">Details</button>
          <Link href={`/dashboard/jobs/apply?job=${job.id}`} onClick={(e) => e.stopPropagation()} className="px-4 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[11.5px] font-bold hover:bg-[#e6c114] transition-colors">Apply</Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Saved job card (image 39 — richer single-column layout) ──── */

function SavedJobCard({ job, onRemove }: { job: JobCard; onRemove: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
      className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <JobIcon size={40} />
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{job.title}</h3>
            <p className="text-[12.5px] text-[#9a9a9a]">{job.company} · {job.location}</p>
          </div>
        </div>
        <button onClick={onRemove} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:border-[#e5484d] hover:text-[#e5484d] transition-colors">
          <Trash2 size={13} /> Remove
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{job.desc}</p>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-1.5">
          {job.tags.map((t) => <span key={t} className="px-2.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[11px] font-medium text-[#6b6b6b] dark:text-white/55">{t}</span>)}
          {job.salary && <span className="px-2.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[11px] font-semibold text-[#1e1e1e] dark:text-white">{job.salary}</span>}
          <span className="text-[11.5px] text-[#9a9a9a]">· {job.time}</span>
        </div>
        <Link href={`/dashboard/jobs/apply?job=${job.id}`} className="px-5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors flex-shrink-0">Apply</Link>
      </div>
    </motion.div>
  );
}

/* ─── Toolbar config + helpers ──────────────────────────────────── */

const SORT_OPTIONS = ["Most Relevant", "Most Recent", "Top Salary", "Company A–Z"];
const PER_PAGE_OPTIONS = [6, 9, 12, 24];
const PLACEHOLDER_WORDS = ["Architect", "Site Engineer", "Quantity Surveyor", "Project Manager", "Remote roles", "BIM Specialist"];

type View = "list" | "g2" | "g3" | "g4";

/** Largest salary figure in a string, normalising k / M suffixes. */
function salaryNum(s: string): number {
  let max = 0; const re = /([\d.]+)\s*(m|k)?/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    let v = parseFloat(m[1]); if (!v) continue;
    const u = (m[2] || "").toLowerCase();
    if (u === "m") v *= 1_000_000; else if (u === "k") v *= 1_000;
    max = Math.max(max, v);
  }
  return max;
}
/** Rough age in days from a "4d ago" / "2h ago" style string (smaller = newer). */
function recencyDays(s: string): number {
  const m = s.match(/(\d+)\s*(min|h|hour|d|day|w|week|mo|month)/i);
  if (!m) return 9999;
  const n = +m[1], u = m[2].toLowerCase();
  const mult = u.startsWith("min") ? 1 / 1440 : u.startsWith("h") ? 1 / 24 : u.startsWith("w") ? 7 : u.startsWith("mo") ? 30 : 1;
  return n * mult;
}
/** Bucket a salary string into one of the Salary Range filter options. */
const SALARY_BUCKETS: [string, (n: number) => boolean][] = [
  ["Under ₦250k/mo", (n) => n > 0 && n < 250_000],
  ["₦250k–₦500k/mo", (n) => n >= 250_000 && n < 500_000],
  ["₦500k–₦1M/mo", (n) => n >= 500_000 && n < 1_000_000],
  ["₦1M+/mo", (n) => n >= 1_000_000],
];

/** Animated typewriter text for the search placeholder (only while idle). */
function useTypingPlaceholder(words: string[], active: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active) { setText(""); return; }
    let wi = 0, ci = 0, deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = words[wi % words.length];
      ci += deleting ? -1 : 1;
      setText(word.slice(0, Math.max(0, ci)));
      let delay = deleting ? 45 : 95;
      if (!deleting && ci >= word.length) { deleting = true; delay = 1400; }
      else if (deleting && ci <= 0) { deleting = false; wi++; delay = 320; }
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [active, words]);
  return text;
}


/* Compact dropdown for the toolbar (sort, per-page). */
function MiniSelect({ value, options, onChange, icon, suffix, align = "right" }: {
  value: string | number; options: (string | number)[]; onChange: (v: string | number) => void;
  icon?: React.ReactNode; suffix?: string; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/70 hover:border-[#ffd716] transition-colors whitespace-nowrap">
        {icon}{value}{suffix}<ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}
            className={cn("absolute top-full mt-1.5 z-30 min-w-[150px] rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#262626] shadow-xl p-1", align === "right" ? "right-0" : "left-0")}>
            {options.map((o) => (
              <button key={o} onClick={() => { onChange(o); setOpen(false); }} className={cn("w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] transition-colors", o === value ? "bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white font-medium" : "text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5")}>
                {o}{suffix}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function pageRange(cur: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (cur >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, cur - 1, cur, cur + 1, -1, total];
}

/* Bottom-right pagination (pink pills, matching the reference). */
function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  const pillBase = "inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors";
  return (
    <div className="mt-7 flex items-center justify-end gap-2 flex-wrap">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={cn(pillBase, "bg-[#fdecec] dark:bg-[#ef4444]/15 text-[#1e1e1e] dark:text-white hover:bg-[#fbdcdc] dark:hover:bg-[#ef4444]/25 disabled:opacity-40 disabled:pointer-events-none")}>
        <ChevronLeft size={14} /> Previous
      </button>
      <div className="flex items-center gap-1">
        {pageRange(page, pageCount).map((n, i) => n === -1 ? (
          <span key={`e${i}`} className="px-1.5 text-[#9a9a9a]">…</span>
        ) : (
          <button key={n} onClick={() => onPage(n)} className={cn("w-8 h-8 rounded-full text-[12.5px] font-semibold transition-colors", n === page ? "bg-[#fdecec] dark:bg-[#ef4444]/20 text-[#1e1e1e] dark:text-white" : "text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5")}>
            {n}
          </button>
        ))}
      </div>
      <button disabled={page >= pageCount} onClick={() => onPage(page + 1)} className={cn(pillBase, "bg-[#fdecec] dark:bg-[#ef4444]/15 text-[#1e1e1e] dark:text-white hover:bg-[#fbdcdc] dark:hover:bg-[#ef4444]/25 disabled:opacity-40 disabled:pointer-events-none")}>
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}

export function JobsBrowse({
  saved = false,
  initialSaved = [],
  items = [],
}: {
  saved?: boolean;
  initialSaved?: string[];
  items?: JobCard[];
}) {
  const [overviewJob, setOverviewJob] = useState<JobCard | null>(null);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [locationQuery, setLocationQuery] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSaved));
  const [view, setView] = useState<View>("g2");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [perPage, setPerPage] = useState(9);
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /**
   * Only real jobs. This padded the list with nine fabricated listings whenever
   * fewer than six real ones existed, which is the current state of the board.
   * Those samples carry ids like "s1", so every Apply button on them pointed at
   * /dashboard/jobs/apply?job=s1 — an id no job can ever have — and the apply
   * page died on it. A short board is the truth; a board of invented jobs whose
   * apply buttons break is worse than an empty one.
   */
  const data = items;
  const typed = useTypingPlaceholder(PLACEHOLDER_WORDS, !query);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setDrawerOpen(false); setOverviewJob(null); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  function toggle(key: string, opt: string) {
    setSel((s) => { const cur = s[key] ?? []; return { ...s, [key]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] }; });
  }
  function clearAll() { setSel({}); setQuery(""); setLocationQuery(""); }

  async function toggleSave(id: string) {
    const wasSaved = savedIds.has(id);
    setSavedIds((s) => { const n = new Set(s); if (wasSaved) n.delete(id); else n.add(id); return n; });
    toast(wasSaved ? "Removed from saved" : "Saved to your jobs");
    try { await toggleSaved("job", id); }
    catch { setSavedIds((s) => { const n = new Set(s); if (wasSaved) n.add(id); else n.delete(id); return n; }); toast.error("Could not update saved jobs"); }
  }

  const q = query.trim().toLowerCase();
  const loc = locationQuery.trim().toLowerCase();
  const filtered = data.filter((j) => {
    if (saved && !savedIds.has(j.id)) return false;
    if (q && !`${j.title} ${j.company} ${j.location} ${j.desc}`.toLowerCase().includes(q)) return false;
    if (loc && !j.location.toLowerCase().includes(loc)) return false;
    const tags = j.tags.map((t) => t.toLowerCase());
    if ((sel["Employment type"] ?? []).length && !(sel["Employment type"] ?? []).some((o) => tags.some((t) => t.includes(o.toLowerCase().split(" ")[0])))) return false;
    if ((sel["Work model"] ?? []).length && !(sel["Work model"] ?? []).some((o) => tags.includes(o.toLowerCase()))) return false;
    if ((sel["Experience level"] ?? []).length && !(sel["Experience level"] ?? []).some((o) => tags.some((t) => t.startsWith(o.toLowerCase().split(" ")[0])))) return false;
    if ((sel["Industry"] ?? []).length && !(sel["Industry"] ?? []).some((o) => (j.category ?? "").toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes((j.category ?? "zzz").toLowerCase()))) return false;
    const salaryOpts = sel["Salary Range"] ?? [];
    if (salaryOpts.length) {
      const n = salaryNum(j.salary);
      const inRange = salaryOpts.some((o) => SALARY_BUCKETS.find(([label]) => label === o)?.[1](n));
      if (!inRange) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Top Salary") return salaryNum(b.salary) - salaryNum(a.salary);
    if (sortBy === "Most Recent") return recencyDays(a.time) - recencyDays(b.time);
    if (sortBy === "Company A–Z") return a.company.localeCompare(b.company);
    return 0;
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, pageCount);
  const paged = sorted.slice((safePage - 1) * perPage, safePage * perPage);

  // reset to the first page whenever the result set changes
  useEffect(() => { setPage(1); }, [query, sel, sortBy, perPage, locationQuery]);

  const activeCount = Object.values(sel).reduce((n, a) => n + a.length, 0) + (q ? 1 : 0) + (loc ? 1 : 0);
  const filterPanelProps = { sel, onToggle: toggle, activeCount, onClear: clearAll, locationQuery, onLocationQuery: setLocationQuery };

  // grid column classes per view; tighten when the preview panel is open
  const gridCls = view === "list" ? "" :
    view === "g2" ? "grid-cols-1 sm:grid-cols-2" :
    view === "g3" ? (overviewJob ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3") :
    (overviewJob ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4");

  function openJob(j: JobCard) { setOverviewJob(j); }
  function closeJob() { setOverviewJob(null); }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-screen min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-6 pb-4 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">{saved ? "Saved Jobs" : "Jobs"}</h1>
        <p className="text-[13px] text-[#9a9a9a] mt-0.5">{saved ? "Roles you've bookmarked to come back to." : "Discover roles that match your profile."}</p>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden border-t border-[#f0f0f0] dark:border-white/10">
        {/* Desktop filter sidebar */}
        <AnimatePresence initial={false}>
          {!saved && sidebarOpen && (
            <motion.aside key="sidebar" initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="hidden lg:flex flex-col flex-shrink-0 border-r border-[#f0f0f0] dark:border-white/10 overflow-hidden">
              <div className="w-[240px] h-full overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-end mb-1">
                  <button onClick={() => setSidebarOpen(false)} title="Hide filters" className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
                    <PanelLeftClose size={14} />
                  </button>
                </div>
                <FilterPanel {...filterPanelProps} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile filter drawer (from left) */}
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
                <div className="flex-1 overflow-y-auto px-5 py-3"><FilterPanel {...filterPanelProps} /></div>
                <div className="flex-shrink-0 px-5 py-4 border-t border-[#f0f0f0] dark:border-white/10 flex gap-2.5">
                  {activeCount > 0 && <button onClick={() => { clearAll(); setDrawerOpen(false); }} className="flex-1 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:bg-[#f7f7f7] transition-colors">Clear all</button>}
                  <button onClick={() => setDrawerOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">Show {filtered.length} results</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Job list column */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="px-5 sm:px-6 py-5">
            {/* Toolbar: filters trigger + search + sort/perpage/view */}
            {!saved && (
              <div className="mb-4 flex items-center gap-2.5 flex-wrap">
                {!sidebarOpen && (
                  <button onClick={() => setSidebarOpen(true)} title="Show filters" className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors flex-shrink-0">
                    <PanelLeftOpen size={14} /> Filters
                  </button>
                )}
                <button onClick={() => setDrawerOpen(true)} className={cn("lg:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[12.5px] font-medium transition-colors flex-shrink-0", activeCount > 0 ? "bg-[#ffd716] text-[#1e1e1e] border-[#ffd716]" : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60")}>
                  <SlidersHorizontal size={13} /> Filters
                  {activeCount > 0 && <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#1e1e1e] text-white text-[9px] font-bold flex items-center justify-center">{activeCount}</span>}
                </button>

                <div className="relative flex-1 min-w-[180px]">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9a9a] pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] pl-10 pr-9 py-2.5 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors"
                    placeholder={query ? "" : (typed ? `Try "${typed}"` : "Search role, company, or occupation")}
                  />
                  {query && <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-[#9a9a9a]"><X size={15} /></button>}
                </div>

                <MiniSelect value={sortBy} options={SORT_OPTIONS} onChange={(v) => setSortBy(v as string)} icon={<ArrowUpDown size={13} className="text-[#9a9a9a]" />} />
                <MiniSelect value={perPage} options={PER_PAGE_OPTIONS} onChange={(v) => setPerPage(v as number)} suffix=" / page" />
                <div className="hidden sm:flex items-center rounded-full border border-[#e3e3e3] dark:border-white/15 overflow-hidden flex-shrink-0">
                  <button onClick={() => setView("list")} title="List view" className={cn("px-2.5 py-2 transition-colors", view === "list" ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}><List size={14} /></button>
                  {([["g2", 2], ["g3", 3], ["g4", 4]] as [View, number][]).map(([v, n]) => (
                    <button key={v} onClick={() => setView(v)} title={`${n} columns`} className={cn("px-2.5 py-2 text-[12px] font-bold leading-none transition-colors", n === 3 && "hidden md:block", n === 4 && "hidden xl:block", view === v ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>{n}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {!saved && activeCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(sel).flatMap(([key, vals]) => vals.map((v) => (
                  <button key={`${key}:${v}`} onClick={() => toggle(key, v)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-[#ffd716] text-[11.5px] font-medium border border-[#ffd716]/30 hover:bg-[#ffe566] transition-colors">{v} <X size={10} /></button>
                )))}
                {loc && <button onClick={() => setLocationQuery("")} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-[#ffd716] text-[11.5px] font-medium border border-[#ffd716]/30">{loc} <X size={10} /></button>}
                {q && <button onClick={() => setQuery("")} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-[#ffd716] text-[11.5px] font-medium border border-[#ffd716]/30">&quot;{q}&quot; <X size={10} /></button>}
              </div>
            )}

            {/* Count */}
            {!saved && (
              <p className="text-[12px] text-[#9a9a9a] mb-3">Showing <span className="font-semibold text-[#1e1e1e] dark:text-white">{sorted.length}</span> {sorted.length === 1 ? "job" : "jobs"}{activeCount > 0 ? " matching your filters" : ""}</p>
            )}

            {/* Results */}
            {sorted.length === 0 ? (
              <EmptyState
                icon={saved ? Bookmark : SearchX}
                tone={saved ? "yellow" : "grey"}
                title={saved ? "No saved jobs yet" : "No jobs match"}
                description={saved ? "Tap the bookmark icon on any role to keep it here for later. Your shortlist stays private and is only visible to you." : "Try adjusting or clearing your filters."}
                primary={saved ? { label: "Browse jobs", href: "/dashboard/jobs", icon: Search } : (activeCount > 0 ? { label: "Clear filters", onClick: clearAll } : undefined)}
                secondary={saved ? { label: "View submitted", href: "/dashboard/applications" } : undefined}
              />
            ) : saved ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {sorted.map((j) => <SavedJobCard key={j.id} job={j} onRemove={() => toggleSave(j.id)} />)}
                </AnimatePresence>
              </div>
            ) : (
              <>
                {view === "list" ? (
                  <div className="space-y-2.5">
                    <AnimatePresence>
                      {paged.map((j) => <JobCardList key={j.id} job={j} isSaved={savedIds.has(j.id)} onSave={() => toggleSave(j.id)} onOpen={() => openJob(j)} active={overviewJob?.id === j.id} />)}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className={cn("grid gap-3", gridCls)}>
                    <AnimatePresence>
                      {paged.map((j) => <JobCardGrid key={j.id} job={j} isSaved={savedIds.has(j.id)} onSave={() => toggleSave(j.id)} onOpen={() => openJob(j)} active={overviewJob?.id === j.id} />)}
                    </AnimatePresence>
                  </div>
                )}
                {pageCount > 1 && <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />}
              </>
            )}
          </div>
        </div>

        {/* Right column (xl): profile OR job preview (inline swap) */}
        {!saved && (
          <div className="hidden xl:block w-[300px] flex-shrink-0 border-l border-[#f0f0f0] dark:border-white/10 overflow-hidden">
            <AnimatePresence mode="wait">
              {overviewJob ? (
                <motion.div key="preview" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }} className="h-full">
                  <JobPreview job={overviewJob} isSaved={savedIds.has(overviewJob.id)} onSave={() => toggleSave(overviewJob.id)} onClose={closeJob} />
                </motion.div>
              ) : (
                <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="h-full overflow-y-auto px-4 py-4">
                  <ProfileSidebar />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Mobile/tablet job preview drawer (from right, < xl) */}
      <AnimatePresence>
        {overviewJob && (
          <div className="xl:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px]" onClick={closeJob} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 right-0 z-[71] w-[380px] max-w-[92vw] bg-white dark:bg-[#1a1a1a] shadow-2xl">
              <JobPreview job={overviewJob} isSaved={savedIds.has(overviewJob.id)} onSave={() => toggleSave(overviewJob.id)} onClose={closeJob} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function JobsBrowseSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) =>
    <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-screen min-h-0 overflow-hidden">
      <div className="px-5 sm:px-6 pt-6 pb-4 flex-shrink-0 space-y-1.5">
        <S cls="h-7 w-36" />
        <S cls="h-3.5 w-64 max-w-[80vw]" />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden border-t border-[#f0f0f0] dark:border-white/10">
        <div className="hidden lg:flex flex-col w-[240px] flex-shrink-0 border-r border-[#f0f0f0] dark:border-white/10 px-5 py-4 space-y-2.5 overflow-y-auto">
          {Array.from({ length: 6 }).map((_, i) => <S key={i} cls="h-11 w-full rounded-xl" />)}
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          <div className="flex items-center gap-2.5 mb-4">
            <S cls="h-9 w-24 rounded-xl flex-shrink-0" />
            <S cls="h-9 flex-1 rounded-xl" />
            <S cls="h-9 w-28 rounded-full" />
            <S cls="h-9 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <S cls="w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5"><S cls="h-4 w-3/4" /><S cls="h-3 w-1/2" /></div>
                  <S cls="w-7 h-7 rounded-lg flex-shrink-0" />
                </div>
                <div className="space-y-1.5"><S cls="h-3 w-full" /><S cls="h-3 w-5/6" /></div>
                <div className="flex gap-1.5 flex-wrap">
                  <S cls="h-6 w-20 rounded-full" /><S cls="h-6 w-24 rounded-full" /><S cls="h-6 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#f5f5f5] dark:border-white/5">
                  <S cls="h-4 w-20" /><S cls="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
