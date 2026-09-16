"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical, Pin, Share2, EyeOff, Trash2, Plus, Pencil, ChevronLeft,
  Eye, FileText, Bookmark, MessageSquare, UserCheck, ShieldCheck, Briefcase,
  CalendarClock, FolderOpen,
} from "lucide-react";
import { Modal, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { KebabMenu } from "@/components/dashboard/kit";
import {
  ProfileIdentityCard, IdentitySection, ChipList, DashboardTabs,
  KpiTileRow, ActivityFeed, StatusBadge, EmptyState,
  type Stat, type TabItem, type ActivityItem,
} from "@/components/dashboard/kit";
import { RecommendationsPanel } from "@/components/dashboard/shared/recommendations-panel";
import { AdsBoardPanel } from "@/components/dashboard/shared/ads-board-panel";
import { TourWizardButton } from "@/components/tour/tour-wizard-button";
import { CompanySetupModal } from "@/components/dashboard/onboarding/company-setup-modal";
import { getMyProfile, type ProfileData } from "@/lib/services/profile";
import { shortLocation } from "@/lib/location-format";
import { usePromotionEligibility } from "@/lib/use-promotion-eligibility";
import { getQualifications, type Experience, type Cert } from "@/lib/services/qualifications";
import { listMyProjects, deleteProject, type PortfolioProject } from "@/lib/services/projects";
import { getMyApplications } from "@/lib/services/applications";
import { getSavedIds } from "@/lib/services/saved";
import { getUnreadCount } from "@/lib/services/messaging";
import { getMyNotifications, type NotificationRow } from "@/lib/services/notifications";
import { useSession } from "@/lib/auth-client";

/* ── Portfolio ─────────────────────────────────────────────────────────── */
type Project = {
  id?: string;
  name: string; loc: string; img: string;
  duration?: string; role?: string; description?: string; responsibilities?: string[]; gallery?: string[];
};

/** Formats a saved project's dates into the "Jan 2024 - Present" line the card shows. */
function durationLabel(p: PortfolioProject): string {
  const month = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (!p.startDate) return p.ongoing ? "Ongoing" : "";
  return `${month(p.startDate)} - ${p.ongoing ? "Present" : p.endDate ? month(p.endDate) : "Present"}`;
}

/** Saved row → the shape the existing cards and detail view already render. */
function toCard(p: PortfolioProject): Project {
  return {
    id: p.id,
    name: p.title,
    loc: p.location,
    img: p.coverUrl,
    duration: durationLabel(p),
    role: p.role,
    description: p.description,
    responsibilities: p.responsibilities,
    gallery: p.gallery,
  };
}

type TabKey = "overview" | "recommendations" | "ads";
const TABS: TabItem[] = [
  { key: "overview", label: "Overview" },
  { key: "recommendations", label: "Recommendations" },
  { key: "ads", label: "Ads Board" },
];

/* ── Small helpers ─────────────────────────────────────────────────────── */
function fmtMonthYear(d: string | null): string {
  if (!d) return "";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function expRange(e: Experience): string {
  const start = fmtMonthYear(e.startDate);
  const end = e.current ? "Present" : fmtMonthYear(e.endDate);
  return [start, end].filter(Boolean).join(" - ");
}

/** Clamp-to-lines block with an inline "see more" toggle. */
function ClampText({ text, lines = 5 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <p className="text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/65">
      <span style={open ? undefined : { WebkitLineClamp: lines, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {text}
      </span>
      {text.length > 180 && (
        <button onClick={() => setOpen((o) => !o)} className="mt-0.5 font-medium text-[#8a6d00] transition-colors hover:opacity-80 dark:text-[#ffd716]">
          {open ? "see less" : "…see more"}
        </button>
      )}
    </p>
  );
}

/* ── Identity card (wired to profile + qualifications services) ─────────── */
function IdentityCard({
  profile, quals, sessionName, sessionAvatar, secondaryAction,
}: {
  profile: ProfileData | null;
  quals: { experience: Experience[]; skills: { name: string }[]; specializations: { name: string }[]; certifications: Cert[] } | null;
  sessionName: string;
  sessionAvatar?: string;
  secondaryAction?: React.ReactNode;
}) {
  const name = profile?.name || sessionName || "Your Name";
  const headline = profile?.headline || "Construction Professional";
  const latestCompany = quals?.experience?.[0]?.company;
  const subtitleLine1 = [headline, latestCompany].filter(Boolean).join(" • ");
  const AVAILABILITY_LABEL: Record<string, string> = { open_to_work: "Open to work", hiring: "Hiring" };
  const availability = profile?.availability ? AVAILABILITY_LABEL[profile.availability] ?? profile.availability : undefined;

  return (
    <ProfileIdentityCard
      name={name}
      avatar={profile?.avatarUrl || sessionAvatar}
      verified={!!profile?.verified}
      statusPill={availability ? <StatusBadge tone="green">{availability}</StatusBadge> : undefined}
      subtitle={
        <>
          <span className="block">{subtitleLine1}</span>
          {profile?.location && <span className="mt-0.5 block">{shortLocation(profile.location)}</span>}
        </>
      }
      editHref="/dashboard/profile"
      editLabel="Edit Profile Info"
      secondaryAction={secondaryAction}
      className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto"
    >
      {profile?.bio && (
        <IdentitySection title="About">
          <ClampText text={profile.bio} />
        </IdentitySection>
      )}

      {!!quals?.experience?.length && (
        <IdentitySection title="Work Experience">
          <div className="space-y-4">
            {quals.experience.slice(0, 3).map((e) => (
              <div key={e.id}>
                <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">
                  {[e.title, e.company].filter(Boolean).join(" • ")}
                </p>
                <p className="mt-0.5 text-[12px] text-[#9a9a9a]">{expRange(e)}</p>
                {(e.location || e.workplaceType) && (
                  <p className="text-[12px] text-[#9a9a9a]">{[e.location, e.workplaceType].filter(Boolean).join(" • ")}</p>
                )}
                {e.description && <div className="mt-1.5"><ClampText text={e.description} lines={3} /></div>}
              </div>
            ))}
          </div>
        </IdentitySection>
      )}

      {!!quals?.skills?.length && (
        <IdentitySection title="Skills">
          <ChipList items={quals.skills.map((s) => s.name)} />
        </IdentitySection>
      )}

      {!!quals?.specializations?.length && (
        <IdentitySection title="Specializations">
          <ChipList items={quals.specializations.map((s) => s.name)} />
        </IdentitySection>
      )}

      {!!quals?.certifications?.length && (
        <IdentitySection title="Certifications">
          <div className="space-y-3">
            {quals.certifications.map((c) => (
              <div key={c.id}>
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{c.name}</p>
                <p className="text-[12px] text-[#9a9a9a]">{[c.issuer, c.year].filter(Boolean).join(" • ")}</p>
              </div>
            ))}
          </div>
        </IdentitySection>
      )}
    </ProfileIdentityCard>
  );
}

/* ── Project card + row menu (existing behaviour, restyled) ─────────────── */
function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Pin; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${danger ? "text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10" : "text-[#1e1e1e] hover:bg-[#f7f7f7] dark:text-white/80 dark:hover:bg-white/5"}`}>
      <Icon size={15} /> {label}
    </button>
  );
}

function ProjectCard({ p, pinned, onOpen, onEdit, onPin, onShare, onHide, onDelete }: { p: Project; pinned?: boolean; onOpen: () => void; onEdit: () => void; onPin: () => void; onShare: () => void; onHide: () => void; onDelete: () => void }) {
  return (
    <div onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }} className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-[#ececec] bg-white text-left transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#1e1e1e]">
      <div className="relative h-40 bg-[#f0f0f0] dark:bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        {pinned && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#ffd716] px-2 py-0.5 text-[10px] font-bold text-[#1e1e1e]"><Pin size={10} /> Pinned</span>}
        <div className="absolute inset-x-3 bottom-2.5">
          <h4 className="truncate text-[13.5px] font-bold text-white">{p.name}</h4>
          <p className="text-[11.5px] text-white/80">{p.loc}</p>
        </div>
        {/* Portal-based KebabMenu — the card's overflow-hidden used to clip the
            inline absolute menu. */}
        <div className="absolute right-2 top-2">
          <KebabMenu
            triggerClassName="h-7 w-7 rounded-full bg-white/90 text-[#1e1e1e] hover:bg-white dark:bg-black/50 dark:text-white border-0"
            items={[
              { icon: Pencil, label: "Edit project", onClick: onEdit },
              { icon: Pin, label: pinned ? "Unpin" : "Pin to top", onClick: onPin },
              { icon: Share2, label: "Share", onClick: onShare },
              { icon: EyeOff, label: "Hide from profile", onClick: onHide },
              { icon: Trash2, label: "Delete", danger: true, onClick: onDelete },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/* ── In-tab project detail (image 92) ──────────────────────────────────── */
function ProjectDetail({ p, onBack, onEdit, onPin, onShare, onHide, onDelete }: { p: Project; onBack: () => void; onEdit: () => void; onPin: () => void; onShare: () => void; onHide: () => void; onDelete: () => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white">
          <ChevronLeft size={16} /> Back to projects
        </button>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ececec] text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"><MoreVertical size={16} /></button>
          <AnimatePresence>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#ececec] bg-white py-1.5 text-[13px] shadow-lg dark:border-white/10 dark:bg-[#262626]">
                  <MenuItem icon={Pencil} label="Edit project" onClick={() => { setMenu(false); onEdit(); }} />
                  <MenuItem icon={Pin} label="Pin to top" onClick={() => { setMenu(false); onPin(); }} />
                  <MenuItem icon={Share2} label="Share" onClick={() => { setMenu(false); onShare(); }} />
                  <MenuItem icon={EyeOff} label="Hide from profile" onClick={() => { setMenu(false); onHide(); }} />
                  <MenuItem icon={Trash2} label="Delete" danger onClick={() => { setMenu(false); onDelete(); }} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} className="h-64 w-full rounded-2xl object-cover" />
      </div>

      <h2 className="mt-4 text-[19px] font-bold text-[#1e1e1e] dark:text-white">{p.name}</h2>
      <p className="mt-1 text-[13px] text-[#6b6b6b] dark:text-white/60">
        {p.duration && <><span className="font-semibold text-[#1e1e1e] dark:text-white">Project duration:</span> {p.duration}</>}
        {p.role && <>{"  •  "}<span className="font-semibold text-[#1e1e1e] dark:text-white">Talent role:</span> {p.role}</>}
      </p>

      {p.description && (
        <div className="mt-5">
          <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Project description</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/65">{p.description}</p>
        </div>
      )}

      {!!p.responsibilities?.length && (
        <div className="mt-5">
          <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Key Responsibilities:</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/65">
            {p.responsibilities.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      {!!p.gallery?.length && (
        <div className="mt-5">
          <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Project Gallery</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.gallery.map((g, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={g} alt={`${p.name} ${i + 1}`} className="h-24 w-full rounded-xl object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** What a draft still needs before it is worth publishing. */
function draftGaps(d: PortfolioProject): string[] {
  const gaps: string[] = [];
  if (!d.coverUrl) gaps.push("cover image");
  if (!d.role) gaps.push("your role");
  if (!d.description) gaps.push("description");
  if (!d.responsibilities.length) gaps.push("responsibilities");
  if (!d.startDate) gaps.push("start date");
  return gaps;
}

function DraftsList({ drafts, onRemove }: { drafts: PortfolioProject[]; onRemove: (id: string) => void }) {
  if (drafts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        tone="yellow"
        title="No drafts right now"
        description="Projects you start but haven't published yet will appear here."
        primary={{ label: "Add a project", href: "/dashboard/add-project", icon: Plus }}
      />
    );
  }
  return (
    <div className="space-y-4">
      {drafts.map((d) => {
        const gaps = draftGaps(d);
        const complete = Math.round(((5 - gaps.length) / 5) * 100);
        return (
          <div key={d.id} className="flex gap-4 rounded-2xl border border-[#ececec] bg-white p-3.5 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex h-20 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f0f0f0] dark:bg-white/5">
              {d.coverUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={d.coverUrl} alt={d.title} className="h-full w-full object-cover" /> : <span className="text-xs text-[#cfcfcf]">No image</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div><h4 className="text-sm font-semibold text-[#1e1e1e] dark:text-white">{d.title}</h4><p className="text-[12px] text-[#9a9a9a]">{d.role || "Role not set"}</p></div>
                <button onClick={() => onRemove(d.id)} className="flex items-center gap-1.5 text-[12px] text-[#9a9a9a] transition-colors hover:text-[#e5484d]"><Trash2 size={14} /> Remove</button>
              </div>
              <div className="mt-2"><div className="mb-1 flex items-center justify-between text-[11px] text-[#9a9a9a]"><span>{complete}% complete</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10"><div className="h-full rounded-full bg-[#ffd716]" style={{ width: `${complete}%` }} /></div></div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                {gaps.length > 0 ? (
                  <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-[#e5484d]">Missing {gaps.map((m) => <span key={m} className="rounded bg-[#f3f3f3] px-1.5 py-0.5 text-[#9a9a9a] dark:bg-white/5">{m}</span>)}</p>
                ) : (
                  <p className="text-[12px] font-medium text-[#1a7f43]">Ready to publish</p>
                )}
                <Link href="/dashboard/add-project" className="rounded-lg bg-[#ffd716] px-4 py-1.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">Continue</Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */
export function ProfessionalHome() {
  const router = useRouter();
  const { data: session } = useSession();
  const u = session?.user as { name?: string; image?: string | null } | undefined;
  // Session-derived text must not differ between the server render and the
  // client's first paint: better-auth can hydrate with the session already
  // resolved, so "there" on the server vs the real name on the client crashed
  // hydration. Hold the fallback until after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tab, setTab] = useState<TabKey>("overview");
  // Ads Board is restricted to Key players exhibitors and Nomarc partners —
  // everyone else doesn't get the tab at all.
  const { eligible: canPromote } = usePromotionEligibility();
  const visibleTabs = canPromote ? TABS : TABS.filter((t) => t.key !== "ads");
  const [showDrafts, setShowDrafts] = useState(false);
  const [companySetupOpen, setCompanySetupOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [quals, setQuals] = useState<Awaited<ReturnType<typeof getQualifications>> | null>(null);
  const [kpi, setKpi] = useState<{ apps: number; inReview: number; saved: number; unread: number }>({ apps: 0, inReview: 0, saved: 0, unread: 0 });

  // Real portfolio rows. Published in the Projects tab, drafts behind the Drafts
  // toggle — both were client-only state before, so anything "added" disappeared
  // on the next reload.
  const [portfolio, setPortfolio] = useState<PortfolioProject[]>([]);
  const draftList = useMemo(() => portfolio.filter((p) => p.draft), [portfolio]);
  const [pinnedNames, setPinnedNames] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ kind: "hide" | "delete"; id: string } | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);

  const fullWidth = false;

  // Published projects as cards, pinned ones first.
  const projectList = useMemo(() => {
    const cards = portfolio.filter((p) => !p.draft).map(toCard);
    return [
      ...cards.filter((c) => pinnedNames.includes(c.name)),
      ...cards.filter((c) => !pinnedNames.includes(c.name)),
    ];
  }, [portfolio, pinnedNames]);

  useEffect(() => {
    getMyProfile().then((r) => setProfile(r.data)).catch(() => {}).finally(() => setProfileLoaded(true));
    getMyNotifications().then((n) => setNotifications(n.slice(0, 6))).catch(() => {});
    getQualifications().then(setQuals).catch(() => {});
    listMyProjects().then(setPortfolio).catch(() => {});
    (async () => {
      try {
        const [apps, saved, unread] = await Promise.all([
          getMyApplications(false).catch(() => []),
          getSavedIds("job").catch(() => []),
          getUnreadCount().catch(() => 0),
        ]);
        const inReview = apps.filter((a) => /review|shortlist|interview/i.test(a.status)).length;
        setKpi({ apps: apps.length, inReview, saved: saved.length, unread });
      } catch { /* resilient */ }
    })();
  }, []);

  const firstName = ((mounted ? profile?.name || u?.name : undefined) ?? "there").split(" ")[0];

  // No profile-view tracking exists in the schema, so the old hardcoded
  // "248 views / +1.5%" tile was fabricated — no fabricated or rating tiles.
  const stats: Stat[] = useMemo(() => [
    { label: "Applications", value: kpi.apps, hint: kpi.inReview > 0 ? `${kpi.inReview} in review` : "Track your submissions" },
    { label: "Saved Jobs", value: kpi.saved, hint: kpi.saved > 0 ? "In your list" : "Save jobs to compare" },
    { label: "Unread Messages", value: kpi.unread, hint: kpi.unread > 0 ? `${kpi.unread} new` : "All caught up" },
  ], [kpi]);

  // Real activity, from the user's own notifications. (Previously a hardcoded
  // list — "viewed by Cubic Studio", "Tunde Adeoye", etc. — which showed
  // identical fake history on every account, including brand-new ones.)
  const NOTIF_ICON: Record<string, typeof Eye> = {
    message: MessageSquare, application: FileText, job: Briefcase,
    verification: ShieldCheck, saved: Bookmark, quote: MessageSquare,
  };
  const activity: ActivityItem[] = useMemo(
    () =>
      notifications.map((n) => ({
        icon: NOTIF_ICON[n.type] ?? Eye,
        text: <>{n.title}</>,
        meta: n.time,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications],
  );
  // Nothing in the schema models scheduled/upcoming events yet, so this stays
  // empty rather than showing invented interviews and deadlines.
  const upcoming: ActivityItem[] = [];

  /* Project actions (client-only, mirrors prior behaviour) */
  const shareLink = (name: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/profile`;
    navigator.clipboard?.writeText(url).then(() => toast.success(`Link to “${name}” copied`)).catch(() => toast.error("Couldn't copy link"));
  };
  const togglePin = (name: string) => {
    const willPin = !pinnedNames.includes(name);
    setPinnedNames((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));
    // Ordering is derived from pinnedNames below rather than by reordering the
    // list, which is now computed from saved rows and so can't be mutated.
    toast.success(willPin ? "Pinned to top" : "Unpinned");
  };
  const doConfirm = () => {
    if (!confirm) return;
    const target = portfolio.find((p) => p.title === confirm.id);
    const kind = confirm.kind;
    setConfirm(null);
    if (!target) return;
    // Delete actually deletes now. "Hide" has no server-side concept yet, so it
    // moves the project back to draft, which is what hiding it from the public
    // portfolio means.
    const action = kind === "delete"
      ? deleteProject(target.id)
      : Promise.resolve({ ok: false as const, error: "not-implemented" });

    if (kind === "hide") {
      toast.error("Hiding a project isn't available yet — save it as a draft instead.");
      return;
    }
    action.then((res) => {
      if (!res.ok) { toast.error(res.error ?? "Couldn't delete the project."); return; }
      setPortfolio((l) => l.filter((p) => p.id !== target.id));
      if (selected?.name === target.title) setSelected(null);
      toast.success("Deleted");
    });
  };

  // Brand-new / freshly-reset account: no profile row worth showing yet — a
  // full dashboard shell around blank/placeholder fields ("Welcome back,
  // there") reads as broken. Show a clean setup prompt instead.
  // A freshly signed-up / reset account keeps its account name, so name is NOT a
  // signal here — only actual profile content is.
  const isBlankSlate =
    profileLoaded && !!profile && !profile.headline && !profile.bio && !profile.location && !profile.avatarUrl;
  if (isBlankSlate) {
    return (
      <div className="px-6 py-6 md:px-8">
        <EmptyState
          icon={UserCheck}
          title="Welcome to Nomarc Projects"
          description="Get started by setting up your profile to unlock personalised recommendations, industry connections, and platform features."
          primary={{ label: "Set Up Profile", href: "/dashboard/profile" }}
        />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 md:px-8">
      {/* Welcome header (page-level; the top bar chrome is global) */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1e1e1e] dark:text-white">Welcome back, {firstName}</h1>
          <p className="mt-0.5 text-[13.5px] text-[#9a9a9a]">Your profile, recommendations, and promotions at a glance</p>
        </div>
        <TourWizardButton />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left identity card — hidden in full-width Drafts mode (image 98) */}
        {!fullWidth && (
          <aside className="w-full flex-shrink-0 lg:w-[320px]">
            <IdentityCard
              profile={profile}
              quals={quals}
              sessionName={mounted ? u?.name ?? "" : ""}
              sessionAvatar={mounted ? u?.image ?? undefined : undefined}
              secondaryAction={
                <button
                  onClick={() => setCompanySetupOpen(true)}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 px-4 py-2.5 text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white transition-colors hover:border-[#ffd716] hover:bg-[#fffdf2] dark:hover:bg-[#ffd716]/5"
                >
                  <Briefcase size={15} /> Set up as a company
                </button>
              }
            />
          </aside>
        )}

        {/* Right tabbed hub */}
        <div className="min-w-0 flex-1">
          {/* Drafts and Add-new go in DashboardTabs' own `trailing` slot rather
              than a flex-wrap sibling. As siblings they dropped onto a second
              line on a phone, detached from the tab row's bottom border, and
              squeezed the tabs into a narrow flex-1 column. Inside the component
              they share its single horizontally-scrolling row. */}
          <DashboardTabs
            tabs={visibleTabs}
            active={tab}
            onChange={(k) => { setTab(k as TabKey); setSelected(null); }}
          />

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-5">
              {tab === "overview" && (
                <div className="space-y-5">
                  <KpiTileRow stats={stats} />
                  <ActivityFeed recent={activity} upcoming={upcoming} title="Activity" />
                </div>
              )}

              {tab === "recommendations" && (
                <RecommendationsPanel allowRequests={false} emptyDescription="Recommendations build immediate trust and credibility on Nomarc. Ask colleagues, past clients, or employers to endorse your skills and professional work ethic." />
              )}

              {canPromote && tab === "ads" && (
                <AdsBoardPanel
                  ownerName={profile?.name || (mounted ? u?.name : undefined) || firstName}
                  ownerMeta={profile?.headline || "Construction Professional"}
                  ownerAvatarUrl={profile?.avatarUrl || u?.image || undefined}
                  kinds={[
                    { kind: "profile", label: "Profile", ctaLabel: "Promote Profile" },
                    { kind: "project", label: "Project", ctaLabel: "Promote a Project", options: projectList.map((p) => ({ id: p.name, label: p.name, imageUrl: p.img, meta: [p.role, p.loc].filter(Boolean).join(" · "), description: p.description })) },
                  ]}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Modal open={confirm?.kind === "hide"} onClose={() => setConfirm(null)} title="Hide from profile" maxWidth="max-w-md">
        <p className="text-sm text-[#6b6b6b] dark:text-white/60">Are you sure you want to hide this project from your profile? You can re-add it later.</p>
        <div className="mt-5 flex justify-end gap-2"><GhostButton onClick={() => setConfirm(null)}>Cancel</GhostButton><PrimaryButton onClick={doConfirm}>Hide</PrimaryButton></div>
      </Modal>
      <Modal open={confirm?.kind === "delete"} onClose={() => setConfirm(null)} title="Delete project" maxWidth="max-w-md">
        <p className="text-sm text-[#6b6b6b] dark:text-white/60">Are you sure you want to delete this project? Once deleted, it cannot be recovered.</p>
        <div className="mt-5 flex justify-end gap-2"><GhostButton onClick={() => setConfirm(null)}>Cancel</GhostButton><button onClick={doConfirm} className="flex items-center gap-1.5 rounded-lg bg-[#e5484d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d33a3f]"><Trash2 size={15} /> Delete</button></div>
      </Modal>

      <CompanySetupModal open={companySetupOpen} onClose={() => setCompanySetupOpen(false)} />
    </div>
  );
}
