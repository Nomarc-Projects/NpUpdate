"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Eye, Pause, Play, Ban, Trash2 } from "lucide-react";
import { DataTable, KebabMenu, StatusBadge, SlideOverDrawer, type DataTableColumn, type BadgeTone } from "@/components/dashboard/kit";
import { FiltersRail, type FilterGroup } from "@/components/admin/filters-rail";
import { PromotedCard } from "@/components/ui/promoted-card";
import { adminPausePromotion, adminResumePromotion, terminatePromotion, type AdminPromotion, type PromotionStatus } from "@/lib/services/promotions";

const KIND_LABEL: Record<string, string> = { profile: "Profile Promotion", project: "Project Promotion", product: "Product Promotion" };
const STATUS_TONE: Record<PromotionStatus, BadgeTone> = { draft: "grey", pending_review: "amber", active: "green", paused: "blue", rejected: "red", completed: "grey" };
const STATUS_LABEL: Record<PromotionStatus, string> = { draft: "Awaiting payment", pending_review: "Pending Review", active: "Active", paused: "Paused", rejected: "Rejected", completed: "Completed" };

export function ActiveCampaignsView({ rows }: { rows: AdminPromotion[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [adType, setAdType] = useState("");
  const [userType, setUserType] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<AdminPromotion | null>(null);
  const [, start] = useTransition();

  const filtered = useMemo(() => {
    let list = rows.filter((p) => {
      if (query && !`${p.headline} ${p.ownerName} ${p.ownerEmail}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (adType && p.kind !== adType) return false;
      if (userType && p.ownerRole !== userType) return false;
      if (status && p.status !== status) return false;
      return true;
    });
    list = [...list].sort((a, b) => sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt));
    return list;
  }, [rows, query, adType, userType, status, sort]);

  // FIXED: "Pause" used to call terminatePromotion() (ends the campaign
  // outright) and "Resume" called approvePromotion() — neither actually
  // paused/resumed anything. adminPausePromotion/adminResumePromotion are
  // the real admin-scoped transitions (the owner-scoped pausePromotion
  // service exists but silently no-ops for an admin caller).
  function pause(p: AdminPromotion) { start(() => adminPausePromotion(p.id).then(() => { toast.success("Campaign paused"); setSelected(null); router.refresh(); }).catch(() => { toast.error("Couldn't pause"); })); }
  function resume(p: AdminPromotion) { start(() => adminResumePromotion(p.id).then(() => { toast.success("Campaign resumed"); setSelected(null); router.refresh(); }).catch(() => { toast.error("Couldn't resume"); })); }
  function terminate(p: AdminPromotion) {
    if (!window.confirm(`Terminate "${p.headline}"?`)) return;
    start(() => terminatePromotion(p.id).then(() => { toast.success("Campaign terminated"); setSelected(null); router.refresh(); }).catch(() => { toast.error("Couldn't terminate"); }));
  }

  const columns: DataTableColumn<AdminPromotion>[] = [
    { key: "ad", label: "Ad Details", render: (p) => (<div className="flex items-center gap-2.5">{p.bannerImageUrl && <img src={p.bannerImageUrl} alt="" className="h-10 w-14 flex-shrink-0 rounded-lg object-cover" />}<div><p className="font-semibold text-[#1e1e1e] dark:text-white">{p.headline}</p><p className="text-[11.5px] text-[#9a9a9a]">{KIND_LABEL[p.kind] ?? p.kind}</p></div></div>) },
    { key: "advertiser", label: "Advertiser", render: (p) => (<div><p className="text-[#1e1e1e] dark:text-white">{p.ownerName}</p><p className="text-[11.5px] text-[#9a9a9a]">{p.ownerEmail}</p></div>) },
    { key: "duration", label: "Duration", render: (p) => <span className="text-[#9a9a9a]">{p.status === "active" ? "Live since " : p.status === "paused" ? "Paused on " : ""}{new Date(p.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span> },
    { key: "metrics", label: "Metrics", render: (p) => <div className="text-[12.5px]"><p>{p.views.toLocaleString()} Views</p><p className="text-[#9a9a9a]">{p.clicks.toLocaleString()} Clicks</p></div> },
    { key: "status", label: "Status", render: (p) => <StatusBadge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</StatusBadge> },
  ];

  const filterGroups: FilterGroup[] = [
    { key: "sort", label: "Sort by", value: sort, onChange: (v) => setSort(v as "newest" | "oldest"), options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] },
    { key: "adType", label: "Ad Type", value: adType, onChange: setAdType, options: [{ value: "", label: "All" }, { value: "profile", label: "Profile Promotion" }, { value: "project", label: "Project Promotion" }, { value: "product", label: "Product Promotion" }] },
    { key: "userType", label: "User Type", value: userType, onChange: setUserType, options: [{ value: "", label: "All" }, { value: "professional", label: "Professional" }, { value: "exhibitor", label: "Exhibitor" }] },
    { key: "status", label: "Status", value: status, onChange: setStatus, options: [{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "completed", label: "Completed" }] },
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
            <KebabMenu items={[
              { icon: Eye, label: "View Promotion", onClick: () => setSelected(p) },
              { icon: Pause, label: "Pause Promotion", onClick: () => pause(p), hidden: p.status !== "active" },
              { icon: Play, label: "Resume Promotion", onClick: () => resume(p), hidden: p.status !== "paused" },
              { icon: Ban, label: "Terminate Promotion", danger: true, onClick: () => terminate(p), hidden: p.status === "completed" },
              { icon: Trash2, label: "Delete Record", danger: true, onClick: () => terminate(p), hidden: p.status !== "completed" },
            ]} />
          )}
        />
      </div>

      <SlideOverDrawer open={!!selected} onClose={() => setSelected(null)} title="Active Campaigns" subtitle="Monitor live promotions, track performance metrics, and manage active ad spending.">
        {selected && (
          <div>
            <button onClick={() => setSelected(null)} className="mb-3 text-[12.5px] font-medium text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white">← Back to Campaign Board</button>

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

            <div className="mt-5 flex justify-end gap-2.5">
              {selected.status === "active" && <button onClick={() => pause(selected)} className="rounded-lg border border-[#2563eb]/40 px-4 py-2.5 text-[13px] font-semibold text-[#2563eb] transition-colors hover:bg-[#e8f0fe]">Pause Promotion</button>}
              {selected.status === "paused" && <button onClick={() => resume(selected)} className="rounded-lg border border-[#1a7f43]/40 px-4 py-2.5 text-[13px] font-semibold text-[#1a7f43] transition-colors hover:bg-[#e7f6ec]">Resume Promotion</button>}
              {selected.status !== "completed" && <button onClick={() => terminate(selected)} className="rounded-lg border border-[#e5484d]/40 px-4 py-2.5 text-[13px] font-semibold text-[#e5484d] transition-colors hover:bg-[#fdecec]">Terminate Promotion</button>}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
