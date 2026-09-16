"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Eye, Trash2 } from "lucide-react";
import { DataTable, KebabMenu, StatusBadge, SlideOverDrawer, type DataTableColumn } from "@/components/dashboard/kit";
import { Modal, GhostButton } from "@/components/ui/modal";
import { ReasonSelect } from "@/components/admin/reason-select";
import { FiltersRail, type FilterGroup } from "@/components/admin/filters-rail";
import { PromotedCard } from "@/components/ui/promoted-card";
import { approvePromotion, rejectPromotion, type AdminPromotion } from "@/lib/services/promotions";

const REJECT_REASONS = [
  { label: "Misleading Copy or False Claims", description: "The ad headline or description contains unsubstantiated claims or misleading information." },
  { label: "Inappropriate or Low-Quality Image", description: "The uploaded banner image is blurry, irrelevant to the product/service, or violates platform visual guidelines." },
  { label: "Grammar or Typographical Errors", description: "The ad contains significant spelling or grammatical errors that need to be corrected before going live." },
  { label: "Broken or Invalid Destination Link", description: "The item being promoted (Project, Profile, or Product) is unavailable, hidden, or broken." },
  { label: "Prohibited Content", description: "The ad promotes services or products that are not allowed on the platform." },
];
const KIND_LABEL: Record<string, string> = { profile: "Profile Promotion", project: "Project Promotion", product: "Product Promotion" };

function timeAgo(iso: string) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function AdReviewsView({ rows }: { rows: AdminPromotion[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [adType, setAdType] = useState("");
  const [userType, setUserType] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<AdminPromotion | null>(null);
  const [rejecting, setRejecting] = useState<AdminPromotion | null>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0].label);
  const [, start] = useTransition();

  const filtered = useMemo(() => {
    let list = rows.filter((p) => {
      if (query && !`${p.headline} ${p.ownerName} ${p.ownerEmail}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (adType && p.kind !== adType) return false;
      // FIXED: this filter used to be set but never applied to `list`.
      if (userType && p.ownerRole !== userType) return false;
      if (status && p.status !== status) return false;
      return true;
    });
    list = [...list].sort((a, b) => sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt));
    return list;
  }, [rows, query, adType, userType, status, sort]);

  function approve(p: AdminPromotion) {
    start(() => approvePromotion(p.id).then(() => { toast.success("Promotion approved"); setSelected(null); router.refresh(); }).catch(() => { toast.error("Couldn't approve"); }));
  }
  function reject() {
    if (!rejecting) return;
    const p = rejecting; setRejecting(null);
    start(() => rejectPromotion(p.id, reason).then(() => { toast.success("Promotion rejected"); setSelected(null); router.refresh(); }).catch(() => { toast.error("Couldn't reject"); }));
  }

  const columns: DataTableColumn<AdminPromotion>[] = [
    { key: "ad", label: "Ad Details", render: (p) => (<div className="flex items-center gap-2.5">{p.bannerImageUrl && <img src={p.bannerImageUrl} alt="" className="h-10 w-14 flex-shrink-0 rounded-lg object-cover" />}<div><p className="font-semibold text-[#1e1e1e] dark:text-white">{p.headline}</p><p className="text-[11.5px] text-[#9a9a9a]">{KIND_LABEL[p.kind] ?? p.kind}</p></div></div>) },
    { key: "advertiser", label: "Advertiser", render: (p) => (<div><p className="text-[#1e1e1e] dark:text-white">{p.ownerName}</p><p className="text-[11.5px] text-[#9a9a9a]">{p.ownerEmail}</p></div>) },
    { key: "submitted", label: "Submitted", render: (p) => <span className="text-[#9a9a9a]">{timeAgo(p.createdAt)}</span> },
    { key: "status", label: "Status", render: (p) => <StatusBadge tone={p.status === "rejected" ? "red" : "amber"}>{p.status === "rejected" ? "Rejected" : "Pending Review"}</StatusBadge> },
  ];

  const filterGroups: FilterGroup[] = [
    { key: "sort", label: "Sort by", value: sort, onChange: (v) => setSort(v as "newest" | "oldest"), options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] },
    { key: "adType", label: "Ad Type", value: adType, onChange: setAdType, options: [{ value: "", label: "All" }, { value: "profile", label: "Profile Promotion" }, { value: "project", label: "Project Promotion" }, { value: "product", label: "Product Promotion" }] },
    { key: "userType", label: "User Type", value: userType, onChange: setUserType, options: [{ value: "", label: "All" }, { value: "professional", label: "Professional" }, { value: "exhibitor", label: "Exhibitor" }] },
    { key: "status", label: "Status", value: status, onChange: setStatus, options: [{ value: "", label: "All" }, { value: "pending_review", label: "Pending Review" }, { value: "rejected", label: "Rejected" }] },
  ];

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <FiltersRail groups={filterGroups} />

      <div className="min-w-0 flex-1">
        <div className="mb-4">
          <div className="relative max-w-[420px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ad title, advertiser, or email…" className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.id}
          rowHoverActions={(p) => (
            p.status === "rejected"
              ? <KebabMenu items={[{ icon: Eye, label: "View Details", onClick: () => setSelected(p) }, { icon: Trash2, label: "Delete", danger: true, onClick: () => toast("Not implemented yet") }]} />
              : <KebabMenu items={[{ icon: Eye, label: "Review Campaign", onClick: () => setSelected(p) }]} />
          )}
        />
      </div>

      {/* Detail — opens a review screen instead of instantly approving (was: kebab "Review Campaign" called approve() directly) */}
      <SlideOverDrawer open={!!selected} onClose={() => setSelected(null)} title="Ad Reviews" subtitle="Review and moderate this promotion before it goes live.">
        {selected && (
          <div>
            <button onClick={() => setSelected(null)} className="mb-3 text-[12.5px] font-medium text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white">← Back to Review Board</button>

            <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
              <h4 className="mb-3 text-[13px] font-bold text-[#1e1e1e] dark:text-white">Promotion Details</h4>
              <div className="space-y-3">
                <div><p className="mb-1 text-[11.5px] font-semibold text-[#9a9a9a]">Headline</p><p className="rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] text-[#1e1e1e] dark:border-white/10 dark:text-white">{selected.headline}</p></div>
                {selected.description && <div><p className="mb-1 text-[11.5px] font-semibold text-[#9a9a9a]">Description</p><p className="rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] text-[#1e1e1e] dark:border-white/10 dark:text-white">{selected.description}</p></div>}
              </div>
            </div>

            <div className="mt-4">
              <h4 className="mb-2 text-[13px] font-bold text-[#1e1e1e] dark:text-white">Ad Preview</h4>
              <PromotedCard
                preview
                ad={{
                  heading: selected.headline, body: selected.description, badge: "Promoted",
                  promotedName: selected.ownerName, promotedMeta: KIND_LABEL[selected.kind],
                  imageUrl: selected.bannerImageUrl,
                  ctaLabel: selected.kind === "product" ? "View Product" : "View Profile",
                  ctaLabel2: selected.kind === "product" ? "Request Quote" : "Message Professional",
                }}
              />
            </div>

            {selected.status !== "rejected" && (
              <div className="mt-5 flex justify-end gap-2.5">
                <button onClick={() => setRejecting(selected)} className="rounded-lg border border-[#e5484d]/40 px-4 py-2.5 text-[13px] font-semibold text-[#e5484d] transition-colors hover:bg-[#fdecec]">Reject Promotion</button>
                <button onClick={() => approve(selected)} className="rounded-lg bg-[#ffd716] px-5 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">Approve</button>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject Promotion" maxWidth="max-w-md">
        <p className="mb-3 text-[13px] text-[#6b6b6b] dark:text-white/60">Select a reason for rejection</p>
        <ReasonSelect reasons={REJECT_REASONS} value={reason} onChange={setReason} />
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setRejecting(null)}>Cancel</GhostButton>
          <button onClick={reject} className="rounded-lg bg-[#e5484d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d33a3f]">Reject</button>
        </div>
      </Modal>
    </div>
  );
}
