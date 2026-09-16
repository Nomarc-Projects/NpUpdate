"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Download, Sparkles, Star, ChevronLeft, ChevronRight, Eye, FolderPlus, Loader2, KanbanSquare,
  FileText, FileSpreadsheet, CalendarClock, ShieldAlert, ClipboardList,
  ListChecks, Receipt, FileCheck, BadgeCheck, Layers, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import CircularGallery from "@/components/ui/circular-gallery";
import { recordDownload, type TemplateRow } from "@/lib/services/templates";
import { listProjects, importTemplateToProject } from "@/lib/services/pm/projects";
import type { PmProjectSummary } from "@/lib/services/pm/types";
import { cn } from "@/lib/utils";
import { r2Url } from "@/lib/r2-public";

type TemplateSection = { heading: string; content: string };
type Template = {
  id: string; title: string; desc: string; category: string;
  fileType: "DOCX" | "XLSX" | "PDF"; icon: LucideIcon; color: string; badge?: "Popular" | "New" | "Pro";
  realId?: string; sections?: TemplateSection[];
};

// resolve a presentational icon/colour for DB-backed templates by category
const CAT_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  contract: { icon: FileText, color: "#6366f1" }, boq: { icon: FileSpreadsheet, color: "#22c55e" },
  schedule: { icon: CalendarClock, color: "#f97316" }, report: { icon: ClipboardList, color: "#06b6d4" },
  specification: { icon: Layers, color: "#0ea5e9" }, invoice: { icon: Receipt, color: "#16a34a" },
  other: { icon: FileCheck, color: "#6366f1" },
};
function fromDb(t: TemplateRow): Template {
  const s = CAT_STYLE[t.category] ?? CAT_STYLE.other;
  const ft = (t.fileType || "docx").toUpperCase();
  return {
    id: t.id, realId: t.id, title: t.name, desc: t.description ?? "", category: t.category,
    fileType: (["DOCX", "XLSX", "PDF"].includes(ft) ? ft : "DOCX") as Template["fileType"],
    icon: s.icon, color: s.color, badge: t.isPremium ? "Pro" : undefined,
  };
}

const TEMPLATES: Template[] = [
  { id: "subcontract", title: "Subcontractor Agreement", desc: "Standard subcontract covering scope, programme, payment terms, and retention.", category: "Contracts", fileType: "DOCX", icon: FileText, color: "#6366f1", badge: "Popular",
    sections: [{ heading: "1. Parties", content: "Contractor and Subcontractor details, addresses, date of agreement." }, { heading: "2. Scope of Works", content: "Project name, location, description, drawings, specification references." }, { heading: "3. Contract Sum", content: "Lump sum, mobilisation %, interim valuations, retention, final payment terms." }, { heading: "4. Programme", content: "Commencement/completion dates, duration, master programme compliance." }, { heading: "5. Insurance & Liability", content: "Employers' liability, public liability, professional indemnity." }, { heading: "6. Dispute Resolution", content: "Negotiation, mediation (Lagos MDC), arbitration." }] },
  { id: "boq", title: "Bill of Quantities (BOQ)", desc: "Structured spreadsheet to measure and price works by trade and element.", category: "Procurement", fileType: "XLSX", icon: FileSpreadsheet, color: "#22c55e", badge: "Popular",
    sections: [{ heading: "Preliminaries", content: "Site establishment, security, temporary facilities, insurance, bonds." }, { heading: "Substructure", content: "Excavation, hardcore, blinding, foundations, blockwork to DPC." }, { heading: "Superstructure", content: "Blockwork, columns, beams, suspended slabs." }, { heading: "Finishes", content: "Rendering, painting, floor/wall tiling, POP ceiling." }, { heading: "Summary", content: "Section totals, contingency 5%, VAT 7.5%, grand total." }] },
  { id: "programme", title: "Construction Programme", desc: "Master Gantt programme with phases, milestones, and dependencies.", category: "Programme", fileType: "XLSX", icon: CalendarClock, color: "#f97316",
    sections: [{ heading: "Project Information", content: "Project, client, contractor, consultant, start/completion dates." }, { heading: "Programme Phases", content: "11 phases from mobilisation through snagging, with durations and dependencies." }, { heading: "Milestones", content: "Site possession, foundation, frame, roof, M&E, practical completion." }] },
  { id: "rams", title: "Risk Assessment & Method Statement", desc: "Combined RAMS template for high-risk activities and safe systems of work.", category: "Health & Safety", fileType: "DOCX", icon: ShieldAlert, color: "#ef4444", badge: "New",
    sections: [{ heading: "1. Activity Details", content: "Activity, location, assessor, review date, project, contractor." }, { heading: "2. Risk Assessment", content: "Hazard matrix: severity x likelihood, control measures, residual risk." }, { heading: "3. Method Statement", content: "Step-by-step safe method: exclusion zone, scaffold, works, inspections, cleanup." }, { heading: "4. Emergency Procedures", content: "First aider, kit location, nearest hospital, assembly point, fire extinguishers." }] },
  { id: "daily-report", title: "Site Daily Report", desc: "Daily diary: weather, labour, plant, deliveries, delays, and progress.", category: "Reports", fileType: "DOCX", icon: ClipboardList, color: "#06b6d4",
    sections: [{ heading: "General Information", content: "Project, date, report no., weather, temperature, reporter." }, { heading: "Labour on Site", content: "Trade breakdown: foremen, masons, carpenters, steel fixers, electricians, plumbers, labourers." }, { heading: "Plant & Equipment", content: "Concrete mixer, excavator, generator, crane, scaffolding status and hours." }, { heading: "Works Carried Out", content: "Hourly activity log with location and progress notes." }, { heading: "Delays / Issues", content: "Issue, cause, impact, action taken." }] },
  { id: "snagging", title: "Snagging / Defects Schedule", desc: "Track defects from inspection through to close-out at handover.", category: "Quality", fileType: "XLSX", icon: ListChecks, color: "#a855f7",
    sections: [{ heading: "Project Details", content: "Project, inspection date, inspector, contractor, building, unit." }, { heading: "Defects Register", content: "Numbered defects: location, trade, description, priority, photo ref, assignee, due date, status." }, { heading: "Summary", content: "Priority breakdown (High/Med/Low) with open/closed counts and % complete." }] },
  { id: "material-spec", title: "Material Specification Sheet", desc: "Pre-filled material spec by trade with standards and tolerances.", category: "Specifications", fileType: "DOCX", icon: Layers, color: "#0ea5e9",
    sections: [{ heading: "Material Details", content: "Material, trade, spec ref, drawing ref, supplier, manufacturer." }, { heading: "Technical Specification", content: "Grade, dimensions, colour, strength, durability, fire rating, thermal, moisture." }, { heading: "Compliance", content: "NIS/SON, BS EN, ASTM standards, warranty, sample approval checklist." }] },
  { id: "valuation", title: "Payment Application / Valuation", desc: "Interim valuation and payment application against the contract sum.", category: "Finance", fileType: "XLSX", icon: Receipt, color: "#16a34a",
    sections: [{ heading: "Application Details", content: "Project, application no., valuation period, contractor, contract sum." }, { heading: "Valuation Summary", content: "Section-by-section: contract value, previous, this period, cumulative, % complete." }, { heading: "Payment Calculation", content: "Gross valuation, less retention 5%, less previous payments, amount due." }] },
  { id: "fee-proposal", title: "Fee Proposal & Scope of Services", desc: "Professional fee proposal with deliverables, stages, and assumptions.", category: "Contracts", fileType: "DOCX", icon: FileCheck, color: "#6366f1",
    sections: [{ heading: "1. Introduction", content: "Cover letter addressing client, referencing project name." }, { heading: "2. Scope of Services", content: "5 RIBA stages: Brief, Concept, Design Development, Technical, Contract Admin." }, { heading: "3. Fee Schedule", content: "Stage-by-stage fee breakdown with totals." }, { heading: "4. Terms", content: "50% upfront per stage, hourly rates, expenses, 30-day validity." }] },
  { id: "pc-certificate", title: "Practical Completion Certificate", desc: "Certify practical completion with outstanding items and key dates.", category: "Handover", fileType: "PDF", icon: BadgeCheck, color: "#caa400", badge: "Pro",
    sections: [{ heading: "Certificate Details", content: "Certificate no., project, employer, contractor, contract date, contract sum." }, { heading: "Certification", content: "Formal certification of practical completion date, subject to snagging list." }, { heading: "Outstanding Items", content: "Numbered list of items to complete during defects liability period." }, { heading: "Signatures", content: "Architect, contractor, and employer sign-off blocks." }] },
];

const CATEGORIES = ["All", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];

// Color stock imagery for the curved showcase gallery (no greyscale).
const GALLERY = [
  { image: r2Url("site/photo-1503387762-592deb58ef4e.jpg"), text: "Subcontract Agreement" },
  { image: r2Url("site/photo-1454165804606-c3d57bc86b40.jpg"), text: "Bill of Quantities" },
  { image: r2Url("site/photo-1581094794329-c8112a89af12.jpg"), text: "Construction Programme" },
  { image: r2Url("site/photo-1504307651254-35680f356dfd.jpg"), text: "Risk Assessment" },
  { image: r2Url("site/photo-1497366216548-37526070297c.jpg"), text: "Site Daily Report" },
  { image: r2Url("site/photo-1486406146926-c627a92ad1ab.jpg"), text: "Material Spec Sheet" },
  { image: r2Url("site/photo-1505798577917-a65157d3320a.jpg"), text: "Payment Valuation" },
  { image: r2Url("site/photo-1541888946425-d81bb19240f5.jpg"), text: "Snagging Schedule" },
  { image: r2Url("site/photo-1503389152951-9f343605f61e.jpg"), text: "Fee Proposal" },
  { image: r2Url("site/photo-1487958449943-2429e8be8625.jpg"), text: "Completion Certificate" },
];

const TESTIMONIALS = [
  { name: "Adegoke Micheal", role: "Principal Architect, Reyfield", quote: "These templates cut our document prep time in half. The RAMS and BOQ formats are spot on for Nigerian projects." },
  { name: "Chiamaka Eze", role: "Quantity Surveyor", quote: "The Bill of Quantities and valuation templates are exactly what I reach for on every job. Clean and ready to price." },
  { name: "Tunde Bakare", role: "Project Manager, Apex Builders", quote: "Programme and daily report templates keep my sites consistent. My team adopted them within a week." },
  { name: "Ngozi Obi", role: "Structural Engineer", quote: "Professional, well-structured and easy to customise. The subcontract agreement saved me a costly back-and-forth." },
  { name: "Samir Hassan", role: "BIM Specialist", quote: "Finally a library built for construction, not generic office docs. The spec sheets are genuinely useful." },
  { name: "Funke Ola-Bello", role: "Interior Designer", quote: "I use the fee proposal template for every pitch now. It makes my practice look far more polished." },
];

const PER_PAGE = 8;

const badgeTone: Record<string, string> = {
  Popular: "bg-[#fff7cc] text-[#8a7400] dark:bg-[#ffd716]/10 dark:text-[#ffd716]",
  New: "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/10 dark:text-[#4ade80]",
  Pro: "bg-[#ede9fe] text-[#6d28d9] dark:bg-[#8b5cf6]/15 dark:text-[#c4b5fd]",
};

function downloadTemplate(t: Template) {
  toast.success("Preparing download...");
  if (t.realId) {
    recordDownload(t.realId).then((url) => { if (url) window.open(url, "_blank"); }).catch(() => {});
  } else {
    window.open("/api/templates/download?id=" + encodeURIComponent(t.id), "_blank");
  }
}

function TemplateCard({ t, onView, onImport }: { t: Template; onView: () => void; onImport: () => void }) {
  const Icon = t.icon;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 hover:border-[#ffd716] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all flex flex-col group min-h-[220px]"
    >
      <div className="flex items-start justify-between mb-4">
        <button onClick={onView} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${t.color}18`, color: t.color }}><Icon size={20} /></button>
        <span className="px-2 py-0.5 rounded-md bg-[#f5f5f5] dark:bg-white/5 text-[10px] font-bold text-[#9a9a9a] tracking-wide">{t.fileType}</span>
      </div>
      <button onClick={onView} className="text-left flex-1">
        <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white leading-snug flex items-center gap-2 flex-wrap group-hover:text-[#caa400] transition-colors">
          {t.title}
          {t.badge && <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", badgeTone[t.badge])}>{t.badge}</span>}
        </h3>
        <p className="mt-2 text-[13px] text-[#6b6b6b] dark:text-white/55 leading-relaxed line-clamp-3">{t.desc}</p>
      </button>
      <div className="mt-4 pt-3.5 border-t border-[#f5f5f5] dark:border-white/5 flex items-center justify-between gap-2">
        <span className="px-2.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[11px] font-medium text-[#6b6b6b] dark:text-white/55 truncate max-w-[120px]">{t.category}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onView} title="View" className="w-8 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"><Eye size={14} /></button>
          <button onClick={onImport} title="Import to a project" className="w-8 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"><FolderPlus size={14} /></button>
          <button onClick={() => downloadTemplate(t)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12px] font-bold hover:bg-[#e6c114] transition-colors"><Download size={13} /> Get</button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Preview modal ──
function PreviewModal({ t, onClose, onImport }: { t: Template; onClose: () => void; onImport: () => void }) {
  const Icon = t.icon;
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative w-full sm:max-w-[560px] max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${t.color}18`, color: t.color }}><Icon size={19} /></div>
            <div className="min-w-0"><p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white truncate">{t.title}</p><p className="text-[12px] text-[#9a9a9a]">{t.category} · {t.fileType}</p></div>
          </div>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 sm:px-6 py-5">
          <div className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02] max-h-[50vh] overflow-y-auto">
            {t.sections && t.sections.length > 0 ? (
              <div className="p-5 space-y-5">
                {t.sections.map((s, i) => (
                  <div key={i}>
                    <h4 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white border-b border-[#ececec] dark:border-white/10 pb-1.5 mb-2">{s.heading}</h4>
                    <pre className="text-[12px] text-[#6b6b6b] dark:text-white/55 leading-relaxed whitespace-pre-wrap font-sans">{s.content}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: `${t.color}18`, color: t.color }}><Icon size={26} /></div>
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{t.title}</p>
                <p className="text-[12px] text-[#9a9a9a] mt-1 max-w-xs">{t.desc}</p>
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-[#f0f0f0] dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
          <button onClick={onImport} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><FolderPlus size={15} /> Import to project</button>
          <button onClick={() => downloadTemplate(t)} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors"><Download size={15} /> Download</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Import-to-project modal ──
function ImportModal({ t, onClose }: { t: Template; onClose: () => void }) {
  const [projects, setProjects] = useState<PmProjectSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { listProjects("me").then((p) => setProjects(p.filter((x) => x.status !== "archived"))).catch(() => setProjects([])); }, []);

  function pick(p: PmProjectSummary) {
    setBusy(p.id);
    importTemplateToProject({ projectId: p.id, name: t.title, category: t.category })
      .then(() => { toast.success(`Added "${t.title}" to ${p.name}`); onClose(); })
      .catch((e) => { setBusy(null); toast.error(e instanceof Error ? e.message : "Couldn't import"); });
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative w-full sm:max-w-[440px] max-h-[85dvh] overflow-y-auto bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10">
          <div className="min-w-0"><p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Import to a project</p><p className="text-[12px] text-[#9a9a9a] truncate">Adds "{t.title}" as a task.</p></div>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">
          {projects === null ? (
            <div className="flex items-center justify-center py-10 text-[#9a9a9a]"><Loader2 className="animate-spin" size={20} /></div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-11 h-11 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] mx-auto"><KanbanSquare size={20} /></div>
              <p className="mt-3 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">No projects yet</p>
              <p className="mt-1 text-[12px] text-[#9a9a9a]">Create a project first, then import templates into it.</p>
              <Link href="/dashboard/project-management" onClick={onClose} className="mt-4 inline-block px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-semibold">Go to Project Management</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <button key={p.id} disabled={!!busy} onClick={() => pick(p)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#ececec] dark:border-white/10 hover:border-[#ffd716] transition-colors text-left disabled:opacity-60">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-[13px]" style={{ backgroundColor: p.color ?? "#ffd716" }}>{p.name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{p.name}</p><p className="text-[11px] text-[#9a9a9a]">{p.taskTotal} tasks · {p.memberCount} members</p></div>
                  {busy === p.id ? <Loader2 className="animate-spin text-[#caa400]" size={16} /> : <FolderPlus size={16} className="text-[#c9c9c9]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function pageRange(cur: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (cur >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, cur - 1, cur, cur + 1, -1, total];
}

export function PracticeTemplates({ dbItems }: { dbItems?: TemplateRow[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [page, setPage] = useState(1);

  // real templates when the library is seeded; otherwise the curated demo set
  const source = dbItems && dbItems.length ? dbItems.map(fromDb) : TEMPLATES;
  const q = query.trim().toLowerCase();
  const results = source.filter((t) =>
    (cat === "All" || t.category === cat) &&
    (!q || `${t.title} ${t.desc} ${t.category}`.toLowerCase().includes(q)),
  );
  const pageCount = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const paged = results.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const reset = (fn: () => void) => { fn(); setPage(1); };

  const [preview, setPreview] = useState<Template | null>(null);
  const [importT, setImportT] = useState<Template | null>(null);

  return (
    <div className="pb-16">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pt-10 text-center max-w-[820px] mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[12px] font-semibold text-[#8a7400] dark:text-[#ffd716] mb-5">
          <Sparkles size={13} /> Included in your plan
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-bold text-[#1e1e1e] dark:text-white leading-[1.1] tracking-tight">
          Professional templates that<br className="hidden sm:block" /> move your projects forward.
        </h1>
        <p className="mt-4 text-[14px] sm:text-[15px] text-[#6b6b6b] dark:text-white/55 max-w-xl mx-auto leading-relaxed">
          A curated library of construction documents — contracts, BOQs, programmes, RAMS, reports and more — ready to download and customise.
        </p>
        <button onClick={() => toast.success("All templates unlocked on your plan")} className="mt-6 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#ffd716] text-[#1e1e1e] text-[14px] font-bold hover:bg-[#e6c114] transition-colors">
          <Sparkles size={15} /> Unlock all access
        </button>
        {/* Trust signal */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {["#ffd716", "#22c55e", "#6366f1", "#f97316", "#06b6d4"].map((c, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-[#161616]" style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="fill-[#ffd716] text-[#ffd716]" />)}</span>
            <span className="text-[12.5px] text-[#9a9a9a]">Trusted by 300+ professionals</span>
          </div>
        </div>
      </div>

      {/* ── Curved showcase gallery (rotates as you scroll) ────── */}
      <div className="mt-8 mb-4 h-[300px] sm:h-[360px] w-full">
        <CircularGallery key={isDark ? "dark" : "light"} items={GALLERY} bend={2.5} textColor={isDark ? "#ffffff" : "#1e1e1e"} borderRadius={0.05} scrollEase={0.05} scrollSpeed={2.2} font="bold 26px Figtree" />
      </div>

      {/* ── All Templates ──────────────────────────────────────── */}
      <div className="px-5 sm:px-8 max-w-[1200px] mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap mt-8 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">All templates</h2>
            <p className="text-[13px] text-[#9a9a9a] mt-0.5">{results.length} ready-to-use documents</p>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-[280px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input value={query} onChange={(e) => reset(() => setQuery(e.target.value))} placeholder="Search templates..." className="w-full rounded-full border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] pl-10 pr-9 py-2.5 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
            {query && <button onClick={() => reset(() => setQuery(""))} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-[#9a9a9a]"><X size={14} /></button>}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => reset(() => setCat(c))} className={cn("px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors", c === cat ? "bg-[#ffd716] text-[#1e1e1e]" : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]")}>{c}</button>
          ))}
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] mb-4"><FileText size={22} /></div>
            <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">No templates found</h3>
            <p className="mt-1.5 text-[13px] text-[#9a9a9a]">Try a different search or category.</p>
          </div>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence>{paged.map((t) => <TemplateCard key={t.id} t={t} onView={() => setPreview(t)} onImport={() => setImportT(t)} />)}</AnimatePresence>
            </motion.div>

            {pageCount > 1 && (
              <div className="mt-7 flex items-center justify-end gap-2 flex-wrap">
                <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-[#fdecec] dark:bg-[#ef4444]/15 text-[#1e1e1e] dark:text-white text-[12.5px] font-semibold hover:bg-[#fbdcdc] disabled:opacity-40 disabled:pointer-events-none transition-colors"><ChevronLeft size={14} /> Previous</button>
                <div className="flex items-center gap-1">
                  {pageRange(safePage, pageCount).map((n, i) => n === -1 ? <span key={`e${i}`} className="px-1.5 text-[#9a9a9a]">...</span> : (
                    <button key={n} onClick={() => setPage(n)} className={cn("w-8 h-8 rounded-full text-[12.5px] font-semibold transition-colors", n === safePage ? "bg-[#fdecec] dark:bg-[#ef4444]/20 text-[#1e1e1e] dark:text-white" : "text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5")}>{n}</button>
                  ))}
                </div>
                <button disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-[#fdecec] dark:bg-[#ef4444]/15 text-[#1e1e1e] dark:text-white text-[12.5px] font-semibold hover:bg-[#fbdcdc] disabled:opacity-40 disabled:pointer-events-none transition-colors">Next <ChevronRight size={14} /></button>
              </div>
            )}
          </>
        )}

        {/* ── Testimonials ─────────────────────────────────────── */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">Used by 300+ professionals, firms & teams</h2>
            <p className="text-[13px] text-[#9a9a9a] mt-1.5">Real feedback from the people building Nigeria.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
                <span className="flex mb-3">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="fill-[#ffd716] text-[#ffd716]" />)}</span>
                <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] text-[11px] font-bold">{t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                  <div>
                    <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white leading-tight">{t.name}</p>
                    <p className="text-[11px] text-[#9a9a9a]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>{preview && <PreviewModal t={preview} onClose={() => setPreview(null)} onImport={() => { setImportT(preview); setPreview(null); }} />}</AnimatePresence>
      <AnimatePresence>{importT && <ImportModal t={importT} onClose={() => setImportT(null)} />}</AnimatePresence>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function PracticeTemplatesSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) =>
    <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="pb-16">
      <div className="px-5 sm:px-8 pt-10 text-center max-w-[820px] mx-auto">
        <S cls="h-7 w-12 rounded-full mx-auto mb-5" />
        <S cls="h-10 w-96 max-w-full mx-auto" />
        <S cls="mt-4 h-4 w-80 max-w-full mx-auto" />
        <S cls="mt-6 h-12 w-44 rounded-full mx-auto" />
      </div>
      <S cls="mt-8 mb-4 h-[300px] sm:h-[360px] w-full rounded-none" />
      <div className="px-5 sm:px-8 max-w-[1200px] mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap mt-8 mb-4">
          <div className="space-y-1.5"><S cls="h-7 w-36" /><S cls="h-3.5 w-44" /></div>
          <S cls="h-10 w-[280px] max-w-full rounded-full" />
        </div>
        <div className="flex gap-2 flex-wrap mb-6">
          {[80, 96, 72, 88, 64, 76].map((w, i) => <S key={i} cls="h-8 rounded-full" style={{ width: w }} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 flex gap-4 items-start">
              <S cls="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <S cls="h-4 w-3/4" /><S cls="h-3 w-full" /><S cls="h-3 w-2/3" />
                <div className="flex items-center gap-2 pt-1"><S cls="h-6 w-14 rounded-full" /><S cls="h-7 w-24 rounded-lg ml-auto" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
