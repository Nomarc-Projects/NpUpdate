"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ZoomIn, ZoomOut, RotateCw, Expand, X, CheckCircle2, Search } from "lucide-react";
import { StatusBadge, EmptyState, type BadgeTone } from "@/components/dashboard/kit";
import { Modal, GhostButton } from "@/components/ui/modal";
import { NomarcAvatar } from "@/components/ui/avatar";
import { ReasonSelect, type Reason } from "@/components/admin/reason-select";
import { approveKyc, rejectKyc, requestKycClarification, type KycItem, type KycQueueStatus } from "@/lib/services/admin";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Exact reject/clarify reason copy, transcribed verbatim from the Figma screenshots ── */
const IDENTITY_REJECT_REASONS: Reason[] = [
  { label: "Document Expired", description: "" },
  { label: "Suspected Fraud", description: "" },
  { label: "Name Mismatch", description: "" },
];
const IDENTITY_CLARIFY_REASONS: Reason[] = [
  { label: "Blurry Photo", description: "" },
  { label: "Glare on ID", description: "" },
  { label: "Name Mismatch", description: "" },
];
const CORPORATE_REJECT_REASONS: Reason[] = [
  { label: "Unverifiable Corporate Entity", description: "The RC number or company name cannot be found on the official CAC portal." },
  { label: "Suspected Fraudulent Documents", description: "Signs of forgery or tampering on the uploaded certificates." },
  { label: "Severe Entity Mismatch", description: "The company name on the profile is entirely different from the incorporated entity, with no clear legal linkage." },
  { label: "Unauthorized Representative", description: "The Primary Contact is not listed as a Director, Owner, or authorized agent on the CAC Status Report." },
  { label: "Unsupported Business Type", description: "The registered entity does not meet the criteria to be an Exhibitor on the platform." },
];
const CORPORATE_CLARIFY_REASONS: Reason[] = [
  { label: "Document Illegible", description: "One or more uploaded files are too blurry, low-resolution, or have glare." },
  { label: "Incomplete CAC Status Report", description: "The uploaded file is missing crucial pages." },
  { label: "Incorrect Document Uploaded", description: "The user uploaded the wrong file type for a specific slot." },
  { label: "TIN Documentation Issue", description: "The TIN certificate is unreliable or issued in a personal name rather than the company name." },
  { label: "Contact ID Expired / Invalid", description: "The Primary Contact's personal identification document has expired and needs to be replaced." },
];

const ID_TYPE_OPTIONS = [
  { value: "nin", label: "National ID (NIN)" },
  { value: "passport", label: "International Passport" },
  { value: "drivers_licence", label: "Driver's License" },
  { value: "pvc", label: "Permanent Voter Card (PVC)" },
  { value: "national_id", label: "National ID Card" },
];
const ID_TYPE_LABEL: Record<string, string> = Object.fromEntries(ID_TYPE_OPTIONS.map((o) => [o.value, o.label]));

const STATUS_TONE: Record<KycQueueStatus, BadgeTone> = { pending: "grey", approved: "green", rejected: "red", resubmitted: "amber" };
const STATUS_LABEL: Record<KycQueueStatus, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", resubmitted: "Resubmitted" };

function ReasonModal({ open, onClose, title, reasons, confirmLabel, danger, onSubmit }: {
  open: boolean; onClose: () => void; title: string; reasons: Reason[]; confirmLabel: string; danger?: boolean; onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="mb-3 text-[12.5px] font-medium text-[#6b6b6b] dark:text-white/60">Select a reason for this request</p>
      <ReasonSelect reasons={reasons} value={reason} onChange={setReason} />
      <div className="mt-5 flex justify-end gap-2">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        {danger ? (
          <button disabled={!reason} onClick={() => onSubmit(reason)} className="rounded-lg bg-[#e5484d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d33a3f] disabled:opacity-40">{confirmLabel}</button>
        ) : (
          <button disabled={!reason} onClick={() => onSubmit(reason)} className="rounded-lg bg-[#ffd716] px-4 py-2 text-sm font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-40">{confirmLabel}</button>
        )}
      </div>
    </Modal>
  );
}

/**
 * Submitted-document viewer. Redesigned per the punch list: the zoom/rotate/
 * fullscreen toolbar sits BELOW the image with text labels (not icon-only,
 * not overlaid on top), and fullscreen actually opens a real lightbox.
 */
export function DocViewer({ url }: { url: string | null }) {
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  if (!url) return <div className="flex h-64 items-center justify-center rounded-xl bg-[#f4f4f4] text-[13px] text-[#9a9a9a] dark:bg-white/5">No document uploaded</div>;

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Submitted document" style={{ transform: `scale(${zoom}) rotate(${rotate}deg)` }} className="max-h-full max-w-full object-contain transition-transform" />
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#ececec] dark:border-white/10">
      <div className="flex h-72 items-center justify-center overflow-auto bg-[#f4f4f4] dark:bg-white/[0.03]">{img}</div>
      {/* Labels are hidden below `sm` and the buttons become equal-width icon
          targets. Spelled out, the four labels wrapped onto two and three lines
          each and the row collapsed into unreadable stacked words. The title and
          sr-only text keep them identifiable without the visible label. */}
      <div className="flex items-center justify-center gap-1 border-t border-[#ececec] bg-[#fafafa] px-2 py-2 dark:border-white/10 dark:bg-white/[0.02]">
        <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} title="Zoom in" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f0f0f0] dark:text-white/60 dark:hover:bg-white/10 sm:flex-none"><ZoomIn size={16} className="flex-shrink-0" /><span className="hidden sm:inline">Zoom In</span><span className="sr-only sm:hidden">Zoom in</span></button>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} title="Zoom out" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f0f0f0] dark:text-white/60 dark:hover:bg-white/10 sm:flex-none"><ZoomOut size={16} className="flex-shrink-0" /><span className="hidden sm:inline">Zoom Out</span><span className="sr-only sm:hidden">Zoom out</span></button>
        <button onClick={() => setRotate((r) => (r + 90) % 360)} title="Rotate" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f0f0f0] dark:text-white/60 dark:hover:bg-white/10 sm:flex-none"><RotateCw size={16} className="flex-shrink-0" /><span className="hidden sm:inline">Rotate</span><span className="sr-only sm:hidden">Rotate</span></button>
        <button onClick={() => setFullscreen(true)} title="Expand full screen" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f0f0f0] dark:text-white/60 dark:hover:bg-white/10 sm:flex-none"><Expand size={16} className="flex-shrink-0" /><span className="hidden sm:inline">Expand Full Screen</span><span className="sr-only sm:hidden">Expand full screen</span></button>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-6" onClick={() => setFullscreen(false)}>
          <button onClick={() => setFullscreen(false)} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20" aria-label="Close">
            <X size={20} />
          </button>
          <div className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>{img}</div>
        </div>
      )}
    </div>
  );
}

function daysAgo(raw: string | null): number | null {
  if (!raw) return null;
  const ms = Date.now() - new Date(raw).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function SquareThumb({ name, src }: { name: string; src: string | null }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f4f4f4] text-[11px] font-bold text-[#9a9a9a] dark:bg-white/10">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : initials}
    </div>
  );
}

export function VerificationView({ kind, title, subtitle, items }: { kind: "profile" | "company"; title: string; subtitle: string; items: KycItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<KycItem | null>(null);
  const [docTab, setDocTab] = useState(0);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [idType, setIdType] = useState("");
  const [tier, setTier] = useState("");
  const [, start] = useTransition();

  const rejectReasons = kind === "profile" ? IDENTITY_REJECT_REASONS : CORPORATE_REJECT_REASONS;
  const clarifyReasons = kind === "profile" ? IDENTITY_CLARIFY_REASONS : CORPORATE_CLARIFY_REASONS;

  const filtered = useMemo(() => {
    let rows = items.filter((it) => {
      if (query && !`${it.name} ${it.email}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (kind === "profile" && idType && !it.docs.some((d) => d.docType === idType)) return false;
      if (kind === "company" && tier && String(it.docs[0]?.tier ?? 2) !== tier) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const at = a.submittedAtRaw ? new Date(a.submittedAtRaw).getTime() : 0;
      const bt = b.submittedAtRaw ? new Date(b.submittedAtRaw).getTime() : 0;
      return sort === "newest" ? bt - at : at - bt;
    });
    return rows;
  }, [items, query, idType, tier, sort, kind]);

  function approve() {
    if (!selected) return;
    start(async () => {
      try { await approveKyc(kind, selected.id); toast.success("Approved"); setSelected(null); router.refresh(); }
      catch { toast.error("Couldn't approve"); }
    });
  }
  function reject(reason: string) {
    if (!selected) return;
    setRejectOpen(false);
    start(async () => {
      try { await rejectKyc(kind, selected.id, reason); toast.success("Rejected"); setSelected(null); router.refresh(); }
      catch { toast.error("Couldn't reject"); }
    });
  }
  function clarify(reason: string) {
    if (!selected) return;
    setClarifyOpen(false);
    start(async () => {
      try { await requestKycClarification(kind, selected.id, reason); toast.success("Clarification requested"); setSelected(null); router.refresh(); }
      catch { toast.error("Couldn't send request"); }
    });
  }

  if (selected) {
    // Fixed doc-tab sets (punch list): identity shows Front/Back of the submitted
    // ID regardless of how many rows exist; corporate always shows the same four
    // canonical slots, with "Not uploaded" for whichever the applicant hasn't submitted.
    const tabs = kind === "profile"
      ? [
          { label: "Front", doc: selected.docs[0] },
          { label: "Back", doc: selected.docs[1] },
        ]
      : [
          { label: "CAC Certificate", doc: selected.docs.find((d) => d.docType === "cac_certificate") },
          { label: "CAC Status Report", doc: selected.docs.find((d) => d.docType === "cac_status_report") },
          { label: "Primary Contact ID", doc: selected.docs.find((d) => d.docType === "director_id") },
          { label: "Tax Identification Number (TIN)", doc: selected.docs.find((d) => d.docType === "tin_document") },
        ];
    const doc = tabs[docTab]?.doc;
    const showActions = selected.status === "pending" || selected.status === "resubmitted";
    const idDoc = selected.docs.find((d) => ID_TYPE_LABEL[d.docType]);

    return (
      <div className="px-6 py-6 md:px-8">
        <button onClick={() => { setSelected(null); setDocTab(0); }} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white"><ArrowLeft size={14} /> Back to Verifications</button>

        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">{kind === "profile" ? "Identity Check" : "Corporate Check"}: {selected.name}</h1>
            </div>
            {selected.status === "pending" ? (
              <StatusBadge tone="amber">Pending · In Queue {daysAgo(selected.submittedAtRaw) ?? 0} {daysAgo(selected.submittedAtRaw) === 1 ? "day" : "days"}</StatusBadge>
            ) : (
              <div className="text-right">
                <StatusBadge tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</StatusBadge>
                {selected.status === "approved" && selected.reviewedByName && (
                  <p className="mt-1 text-[11px] text-[#9a9a9a]">Approved by {selected.reviewedByName}{selected.reviewedAt ? ` • ${selected.reviewedAt}` : ""}</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Full name</p>
                <p className="rounded-lg border border-[#e3e3e3] px-3 py-2 text-[13px] text-[#1e1e1e] dark:border-white/15 dark:text-white">{selected.name}</p>
              </div>
              <div>
                <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a]">{kind === "profile" ? "Email address" : "Primary Contact Person"}</p>
                <p className="rounded-lg border border-[#e3e3e3] px-3 py-2 text-[13px] text-[#1e1e1e] dark:border-white/15 dark:text-white">{kind === "profile" ? selected.email : (selected.primaryContactName ?? "—")}</p>
              </div>
            </div>

            <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Verification Overview</h3>
            <div className={cn("grid grid-cols-2 gap-3 text-[13px] text-[#3d3d3d] dark:text-white/70", kind === "profile" ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
              {kind === "profile" && (
                <div>
                  <p className="text-[11px] text-[#9a9a9a]">ID Type</p>
                  <p className="font-medium">{idDoc ? ID_TYPE_LABEL[idDoc.docType] ?? idDoc.docType : "—"}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-[#9a9a9a]">Email verified</p>
                <p className="flex items-center gap-1 font-medium">Yes <CheckCircle2 size={13} className="text-[#1a7f43]" /></p>
              </div>
              <div>
                <p className="text-[11px] text-[#9a9a9a]">Phone Number Verified</p>
                <p className="flex items-center gap-1 font-medium">Yes <CheckCircle2 size={13} className="text-[#1a7f43]" /></p>
              </div>
              <div>
                <p className="text-[11px] text-[#9a9a9a]">Previous rejections</p>
                <p className="font-medium">{selected.previousRejections}</p>
              </div>
            </div>

            <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">{kind === "profile" ? "Submitted Identity" : "Submitted Corporate Documents"}</h3>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tabs.map((t, i) => (
                <button key={t.label} onClick={() => setDocTab(i)} className={cn("flex-shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors", i === docTab ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f4f4f4] text-[#6b6b6b] dark:bg-white/5 dark:text-white/60")}>{t.label}</button>
              ))}
            </div>
            <DocViewer url={doc?.docUrl ?? null} />
          </div>

          {/* One full-width button per row on mobile — side by side these wrapped
              their labels onto three lines and became unreadable. Approve leads
              on mobile (it is the common action) and stays right on desktop. */}
          {showActions && (
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={() => setRejectOpen(true)} className="w-full rounded-lg border border-[#e5484d]/40 px-4 py-2.5 text-[13px] font-semibold text-[#e5484d] transition-colors hover:bg-[#fdecec] sm:w-auto">Reject Verification</button>
              <button onClick={() => setClarifyOpen(true)} className="w-full rounded-lg border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white sm:w-auto">Request Clarification</button>
              <button onClick={approve} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#ffd716] px-5 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] sm:w-auto"><CheckCircle2 size={15} /> Approve</button>
            </div>
          )}
        </div>

        <ReasonModal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Verification" reasons={rejectReasons} confirmLabel="Reject" danger onSubmit={reject} />
        <ReasonModal open={clarifyOpen} onClose={() => setClarifyOpen(false)} title="Request Clarification" reasons={clarifyReasons} confirmLabel="Done" onSubmit={clarify} />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 md:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={kind === "profile" ? "Search specific user" : "Search specific company or RC number"} className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white">
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        </select>
        {kind === "profile" ? (
          <select value={idType} onChange={(e) => setIdType(e.target.value)} className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white">
            <option value="">ID Type</option>
            {ID_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white">
            <option value="">All tiers</option><option value="1">Tier 1</option><option value="2">Tier 2</option>
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing to review" description="The verification queue is empty." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#ececec] dark:border-white/10">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#ececec] bg-[#fafafa] text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a] dark:border-white/10 dark:bg-white/[0.03]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">{kind === "profile" ? "ID Type" : "Primary Contact"}</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const age = daysAgo(it.submittedAtRaw);
                const aging = it.status === "pending" && age !== null && age >= 2;
                const canReview = it.status === "pending" || it.status === "resubmitted";
                const idDoc = it.docs.find((d) => ID_TYPE_LABEL[d.docType]);
                return (
                  <tr key={it.id} className="border-b border-[#f0f0f0] last:border-0 dark:border-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {kind === "company" ? <SquareThumb name={it.name} src={it.avatarUrl} /> : <NomarcAvatar name={it.name} src={it.avatarUrl ?? undefined} size="sm" />}
                        <div><p className="font-semibold text-[#1e1e1e] dark:text-white">{it.name}</p><p className="text-[11.5px] text-[#9a9a9a]">{it.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6b6b6b] dark:text-white/60">{kind === "profile" ? (idDoc ? ID_TYPE_LABEL[idDoc.docType] ?? idDoc.docType : "—") : (it.primaryContactName ?? "—")}</td>
                    <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[it.status]}>{STATUS_LABEL[it.status]}</StatusBadge></td>
                    <td className={cn("px-4 py-3", aging ? "font-semibold text-[#c53434]" : "text-[#9a9a9a]")}>{age === 0 ? "Today" : age === 1 ? "Yesterday" : age !== null ? `${age} days ago` : it.submittedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setSelected(it); setDocTab(0); }}
                        className={cn("rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors", canReview ? "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]" : "border border-[#e3e3e3] text-[#1e1e1e] hover:border-[#ffd716] dark:border-white/15 dark:text-white")}
                      >
                        {canReview ? "Review" : "View"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
