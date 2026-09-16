"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Eye, Pause, Play, X, Pencil, Trash2, ExternalLink, ImagePlus, Lock, Search, Check,
} from "lucide-react";
import { EmptyState, KebabMenu, StatusBadge, type BadgeTone } from "@/components/dashboard/kit";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { CampaignDurationModal } from "@/components/dashboard/campaign-duration-modal";
import { getConfiguredProviders } from "@/lib/services/promotion-checkout";
import type { ProviderName } from "@/lib/payments/types";
import {
  getMyPromotions, getProfileAdAllowance, createPromotion, pausePromotion, resumePromotion,
  cancelPromotionSubmission, resubmitPromotion, deletePromotion,
  type Promotion, type PromotionKind, type PromotionStatus,
} from "@/lib/services/promotions";

export type PromotableOption = {
  id: string;
  label: string;
  imageUrl?: string;
  /** "Role · Location" — the supporting line in the picker. */
  meta?: string;
  /** Source text for the auto-summarised ad description. */
  description?: string;
};

/**
 * Condense a project/product description into ad copy.
 *
 * Deterministic and local — it takes whole sentences up to the 120-character
 * limit the description field enforces, and falls back to a word-boundary trim
 * when the first sentence is already too long. Nothing is invented, so the
 * "auto-summarized" label is accurate; the field stays editable.
 */
export function summariseForAd(text: string, limit = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= limit) return clean;

  let out = "";
  for (const sentence of clean.split(/(?<=[.!?])\s+/)) {
    if (!out) { out = sentence; continue; }
    if (`${out} ${sentence}`.length > limit) break;
    out = `${out} ${sentence}`;
  }
  if (out.length <= limit) return out;

  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : limit).trimEnd()}…`;
}
export type PromotableKindConfig = {
  kind: PromotionKind;
  label: string; // "Profile" | "Project" | "Product"
  ctaLabel: string; // "Promote Profile" | "Promote a Project" | "Promote a Product"
  /** Only for project/product — the picker list; profile has none (self). */
  options?: PromotableOption[];
};

const STATUS_TONE: Record<PromotionStatus, BadgeTone> = {
  draft: "grey",
  pending_review: "amber",
  active: "green",
  paused: "blue",
  rejected: "red",
  completed: "grey",
};
const STATUS_LABEL: Record<PromotionStatus, string> = {
  draft: "Awaiting payment",
  pending_review: "Pending Review",
  active: "Active",
  paused: "Paused",
  rejected: "Rejected",
  completed: "Completed",
};

const FILTERS: { key: "all" | PromotionStatus; label: string }[] = [
  { key: "all", label: "All active" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "pending_review", label: "Pending Review" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

/**
 * Ads Board tab body — shared by the professional (Profile/Project) and
 * exhibitor (Profile/Product) dashboard homes (images 10-14/82-86/139-142).
 * Self-serve: create → pending review → admin approves/rejects → active
 * campaign with views/clicks, pausable/resumable/terminable.
 */
export function AdsBoardPanel({ kinds, ownerName, ownerMeta, ownerAvatarUrl }: { kinds: PromotableKindConfig[]; ownerName: string; ownerMeta: string; ownerAvatarUrl?: string }) {
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [filter, setFilter] = useState<"all" | PromotionStatus>("all");
  const [createKind, setCreateKind] = useState<PromotableKindConfig | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  // Set when a campaign has been composed (or a rejected one resubmitted) and
  // is waiting on the duration/payment step.
  const [payingFor, setPayingFor] = useState<{ id: string; alreadyPaid: boolean } | null>(null);
  const [providers, setProviders] = useState<ProviderName[]>([]);

  const [quota, setQuota] = useState<{ allowance: number; used: number; planLabel: string } | null>(null);

  async function refresh() {
    const [rows, q, gw] = await Promise.all([getMyPromotions(), getProfileAdAllowance(), getConfiguredProviders()]);
    setItems(rows);
    setQuota(q);
    setProviders(gw);
  }
  useEffect(() => { refresh(); }, []);

  const filtered = items?.filter((p) => filter === "all" || p.status === filter) ?? [];
  const activeCount = items?.filter((p) => p.status === "active").length ?? 0;
  // Only exhibitors carry a plan-bundled profile-ad allowance; professionals buy
  // theirs individually. Creation is blocked outright only when profile ads are
  // the sole kind on offer — otherwise the other kinds stay available and the
  // server rejects a profile ad over quota.
  const profileAdsSpent = !!quota && quota.used >= quota.allowance;
  const createBlocked = profileAdsSpent && kinds.every((k) => k.kind === "profile");

  async function act(fn: () => Promise<unknown>, okMsg?: string) {
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  if (items === null) return <div className="py-16 text-center text-[13px] text-[#9a9a9a]">Loading…</div>;

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          icon={Megaphone}
          title="No active promotions"
          description="Boost your visibility on Nomarc. Run a promotion to get in front of key decision-makers, or highlight your best work to generate leads."
          primary={{ label: kinds[0].ctaLabel, onClick: () => setCreateKind(kinds[0]) }}
          secondary={kinds[1] ? { label: kinds[1].ctaLabel, onClick: () => setCreateKind(kinds[1]) } : undefined}
        />
        {createKind && <CreateModal config={createKind} ownerName={ownerName} ownerMeta={ownerMeta} ownerAvatarUrl={ownerAvatarUrl} onClose={() => setCreateKind(null)} onDone={(id) => { refresh(); if (id) setPayingFor({ id, alreadyPaid: false }); }} />}
      <CampaignDurationModal
        open={!!payingFor}
        promotionId={payingFor?.id ?? null}
        alreadyPaid={payingFor?.alreadyPaid ?? false}
        available={providers}
        onClose={() => setPayingFor(null)}
        onDone={refresh}
      />
      </>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                filter === f.key ? "bg-[#ffd716] text-[#1e1e1e]" : "border border-[#e5e5e5] text-[#6b6b6b] hover:bg-[#f5f5f5] dark:border-white/15 dark:text-white/60 dark:hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[12px] font-medium text-[#9a9a9a]">
            Active Promotions {activeCount}
            {quota && <span className="ml-2">· Profile ads {quota.used}/{quota.allowance}</span>}
          </p>
          <button
            onClick={() => setCreateKind(kinds[0])}
            disabled={createBlocked}
            title={createBlocked ? `Profile promotion ads aren't included on the ${quota?.planLabel} plan.` : undefined}
            className="rounded-lg bg-[#ffd716] px-3.5 py-2 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:cursor-not-allowed disabled:bg-[#f0f0f0] disabled:text-[#9a9a9a] dark:disabled:bg-white/10"
          >
            + Create new Ad
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#ececec] dark:border-white/10">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#ececec] bg-[#fafafa] text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a] dark:border-white/10 dark:bg-white/[0.03]">
              <th className="px-4 py-3">Ad Details</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Metrics</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const kindLabel = kinds.find((k) => k.kind === p.kind)?.label ?? p.kind;
              return (
                <tr key={p.id} className="border-b border-[#f0f0f0] last:border-0 dark:border-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#f0f0f0] dark:bg-white/5">
                        {p.bannerImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.bannerImageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{p.headline}</p>
                        <p className="text-[11.5px] text-[#9a9a9a]">{kindLabel} Promotion</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</StatusBadge>
                    {p.status === "rejected" && p.rejectionReason && (
                      <p className="mt-1 text-[11px] text-[#c53434]">Reason: {p.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-[#6b6b6b] dark:text-white/60">{p.views} views · {p.clicks} clicks</td>
                  <td className="px-4 py-3 text-[12.5px] text-[#9a9a9a]">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</td>
                  <td className="px-4 py-3 text-right">
                    <KebabMenu
                      align="right"
                      items={[
                        { icon: Eye, label: "View Preview", onClick: () => setEditing(p) },
                        // A draft has been composed but not paid for; a rejected
                        // ad keeps its credit, so resubmitting costs nothing.
                        { icon: Lock, label: "Pay & submit", onClick: () => setPayingFor({ id: p.id, alreadyPaid: !!p.paidAt }), hidden: p.status !== "draft" },
                        { icon: Pause, label: "Pause", onClick: () => act(() => pausePromotion(p.id), "Paused"), hidden: p.status !== "active" },
                        { icon: Play, label: "Resume", onClick: () => act(() => resumePromotion(p.id), "Resumed"), hidden: p.status !== "paused" },
                        { icon: X, label: "Cancel Submission", danger: true, onClick: () => act(() => cancelPromotionSubmission(p.id), "Submission cancelled"), hidden: p.status !== "pending_review" },
                        { icon: Pencil, label: "Edit & Resubmit", onClick: () => setEditing(p), hidden: p.status !== "rejected" },
                        { icon: Trash2, label: "Delete", danger: true, onClick: () => act(() => deletePromotion(p.id), "Deleted"), hidden: !["completed", "rejected"].includes(p.status) },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {createKind && <CreateModal config={createKind} ownerName={ownerName} ownerMeta={ownerMeta} ownerAvatarUrl={ownerAvatarUrl} onClose={() => setCreateKind(null)} onDone={(id) => { refresh(); if (id) setPayingFor({ id, alreadyPaid: false }); }} />}
      <CampaignDurationModal
        open={!!payingFor}
        promotionId={payingFor?.id ?? null}
        alreadyPaid={payingFor?.alreadyPaid ?? false}
        available={providers}
        onClose={() => setPayingFor(null)}
        onDone={refresh}
      />
      {editing && (
        <EditModal
          promotion={editing}
          kindLabel={kinds.find((k) => k.kind === editing.kind)?.label ?? editing.kind}
          ownerName={ownerName}
          ownerMeta={ownerMeta}
          ownerAvatarUrl={ownerAvatarUrl}
          onClose={() => setEditing(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}

function AdPreview({ headline, description, bannerImageUrl, ownerName, ownerMeta, ownerAvatarUrl }: { headline: string; description: string; bannerImageUrl?: string; ownerName: string; ownerMeta: string; ownerAvatarUrl?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#ececec] dark:border-white/10">
      <div className="h-32 bg-[#f0f0f0] dark:bg-white/5">
        {bannerImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-4">
        <StatusBadge tone="yellow">Promoted</StatusBadge>
        <p className="mt-2 text-[14px] font-bold text-[#1e1e1e] dark:text-white">{headline || "Your headline here"}</p>
        <p className="mt-1 line-clamp-2 text-[12.5px] text-[#6b6b6b] dark:text-white/60">{description || "Your description will appear here."}</p>
        <div className="mt-3 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {ownerAvatarUrl && <img src={ownerAvatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />}
          <span className="text-[11.5px] text-[#9a9a9a]">{ownerName} · {ownerMeta}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * "Select a Project to Promote" — its own step, per the design, rather than a
 * list crammed into the top of the compose form. Selection is explicit
 * (highlight + check, then Continue) so a mis-tap no longer drops you straight
 * into a half-filled form for the wrong project, and the list is searchable
 * because a portfolio can be long.
 */
function PickerModal({ config, onCancel, onPick }: {
  config: PromotableKindConfig;
  onCancel: () => void;
  onPick: (option: PromotableOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const options = config.options ?? [];
  const noun = config.label.toLowerCase();

  const shown = options.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${o.label} ${o.meta ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <Modal open onClose={onCancel} title={`Select a ${config.label} to Promote`} maxWidth="max-w-lg">
      <p className="-mt-1 mb-4 text-[13px] text-[#6b6b6b] dark:text-white/60">
        Choose a {noun} from your portfolio. We will use its details to auto-generate your ad.
      </p>

      {options.length > 3 && (
        <div className="relative mb-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
          <input
            className={`${inputClass} pl-9`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun}s...`}
            autoFocus
          />
        </div>
      )}

      <div className="max-h-72 space-y-2 overflow-y-auto">
        {options.length === 0 && <p className="p-3 text-[12.5px] text-[#9a9a9a]">Nothing to promote yet.</p>}
        {options.length > 0 && shown.length === 0 && <p className="p-3 text-[12.5px] text-[#9a9a9a]">No {noun}s match &ldquo;{query}&rdquo;.</p>}
        {shown.map((o) => {
          const selected = chosen === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setChosen(o.id)}
              aria-pressed={selected}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                selected
                  ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.07]"
                  : "border-[#ececec] hover:border-[#d4d4d4] dark:border-white/10 dark:hover:border-white/25",
              )}
            >
              {o.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.imageUrl} alt="" className="h-10 w-14 flex-shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-[#f0f0f0] dark:bg-white/5"><ImagePlus size={14} className="text-[#9a9a9a]" /></span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{o.label}</span>
                {o.meta && <span className="block truncate text-[12px] text-[#9a9a9a]">{o.meta}</span>}
              </span>
              <span className={cn(
                "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border",
                selected ? "border-[#1e1e1e] bg-[#1e1e1e] dark:border-white dark:bg-white" : "border-[#d4d4d4] dark:border-white/25",
              )}>
                {selected && <Check size={12} className="text-white dark:text-[#1e1e1e]" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <PrimaryButton
          disabled={!chosen}
          onClick={() => { const o = options.find((x) => x.id === chosen); if (o) onPick(o); }}
        >
          Continue
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function CreateModal({ config, ownerName, ownerMeta, ownerAvatarUrl, onClose, onDone }: { config: PromotableKindConfig; ownerName: string; ownerMeta: string; ownerAvatarUrl?: string; onClose: () => void; onDone: (createdId?: string) => void }) {
  const needsRef = config.kind !== "profile";
  const [refId, setRefId] = useState<string | undefined>(needsRef ? undefined : "self");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  /** True until the description is edited by hand, so the "auto-summarized"
   *  note disappears once it is no longer the generated text. */
  const [autoSummarised, setAutoSummarised] = useState(false);

  // The picker owns the flow until something is chosen.
  if (needsRef && !refId) {
    return (
      <PickerModal
        config={config}
        onCancel={onClose}
        onPick={(o) => {
          setRefId(o.id);
          setHeadline(o.label);
          if (o.imageUrl) setBannerImageUrl(o.imageUrl);
          const summary = summariseForAd(o.description ?? "");
          if (summary) { setDescription(summary); setAutoSummarised(true); }
        }}
      />
    );
  }

  const selectedOption = config.options?.find((o) => o.id === refId);
  useEffect(() => {
    if (selectedOption?.imageUrl && !bannerImageUrl) setBannerImageUrl(selectedOption.imageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption]);

  async function submit() {
    if (!headline.trim()) return toast.error("Add a headline first");
    setSubmitting(true);
    try {
      // Composed only — the campaign is priced and paid for in the next step,
      // and reaches review after settlement.
      const id = await createPromotion({ kind: config.kind, refId: needsRef ? refId : undefined, headline, description, bannerImageUrl });
      onDone(id);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Create ${config.label} Promotion`} maxWidth="max-w-lg">
      <div className="space-y-4">

        {(!needsRef || refId) && (
          <>
            <Field label="Headline" hint={`${headline.length}/50`}>
              <input className={inputClass} maxLength={50} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Award-Winning Sustainable Architecture" />
            </Field>
            <Field
              label="Description"
              hint={autoSummarised ? "Auto-summarized from description — edit freely" : `${description.length}/120`}
            >
              <textarea
                className={`${inputClass} min-h-[80px] resize-none`}
                maxLength={120}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setAutoSummarised(false); }}
                placeholder="A short line about what makes this worth a look."
              />
            </Field>
            {/* Was a bare "image URL" text box, which asked an architect to go
                and host their own banner somewhere first — so in practice the
                banner just stayed empty. Uploads straight to R2 instead. */}
            <Field label="Ad Banner Image (optional)">
              {bannerImageUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#ececec] bg-[#fafafa] p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bannerImageUrl} alt="" aria-hidden className="h-14 w-24 flex-shrink-0 rounded-lg object-cover" />
                  <p className="min-w-0 flex-1 truncate text-[12.5px] text-[#6b6b6b] dark:text-white/60">Banner ready</p>
                  <button
                    type="button"
                    onClick={() => setBannerImageUrl(undefined)}
                    className="flex-shrink-0 rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
                  >
                    Replace image
                  </button>
                </div>
              ) : (
                <FileUpload
                  accept="image/*"
                  maxSizeMB={5}
                  label="Upload banner"
                  hint="PNG or JPG (max. 5MB) — shown across the Ads Board"
                  upload={(file) => uploadFile(file, "project")}
                  onChange={(items) => {
                    const done = items.find((i) => i.progress >= 100 && i.url && !i.error);
                    if (done?.url) setBannerImageUrl(done.url);
                  }}
                />
              )}
            </Field>
            <div>
              <p className="mb-2 text-[12px] font-semibold text-[#9a9a9a]">Ad Preview</p>
              <AdPreview headline={headline} description={description} bannerImageUrl={bannerImageUrl} ownerName={ownerName} ownerMeta={ownerMeta} ownerAvatarUrl={ownerAvatarUrl} />
            </div>
          </>
        )}
      </div>

      {(!needsRef || refId) && (
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit for Review"}</PrimaryButton>
        </div>
      )}
    </Modal>
  );
}

function EditModal({ promotion, kindLabel, ownerName, ownerMeta, ownerAvatarUrl, onClose, onDone }: { promotion: Promotion; kindLabel: string; ownerName: string; ownerMeta: string; ownerAvatarUrl?: string; onClose: () => void; onDone: () => void }) {
  const isRejected = promotion.status === "rejected";
  const [headline, setHeadline] = useState(promotion.headline);
  const [description, setDescription] = useState(promotion.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      // Lands back as draft; the caller then runs the duration step, which
      // reuses the existing payment when the ad was already paid for.
      await resubmitPromotion(promotion.id, { headline, description, bannerImageUrl: promotion.bannerImageUrl ?? undefined });
      toast.success("Resubmitted for review");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't resubmit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isRejected ? `Edit & Resubmit — ${kindLabel} Promotion` : `${kindLabel} Promotion`} maxWidth="max-w-lg">
      <div className="space-y-4">
        {isRejected && promotion.rejectionReason && (
          <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-[12.5px] text-[#c53434] dark:bg-[#e5484d]/10">Rejected: {promotion.rejectionReason}</p>
        )}
        {isRejected ? (
          <>
            <Field label="Headline"><input className={inputClass} maxLength={50} value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
            <Field label="Description"><textarea className={`${inputClass} min-h-[80px] resize-none`} maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          </>
        ) : null}
        <div>
          <p className="mb-2 text-[12px] font-semibold text-[#9a9a9a]">Ad Preview</p>
          <AdPreview headline={headline} description={description} bannerImageUrl={promotion.bannerImageUrl ?? undefined} ownerName={ownerName} ownerMeta={ownerMeta} ownerAvatarUrl={ownerAvatarUrl} />
        </div>
        {!isRejected && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#9a9a9a]"><ExternalLink size={12} /> {STATUS_LABEL[promotion.status]} · {promotion.views} views · {promotion.clicks} clicks</p>
        )}
      </div>
      {isRejected && (
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Resubmit for Review"}</PrimaryButton>
        </div>
      )}
    </Modal>
  );
}
