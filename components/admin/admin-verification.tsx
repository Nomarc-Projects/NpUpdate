"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShieldCheck, Building2, User, Mail, MapPin, Clock, FileText,
  ExternalLink, ChevronRight, X, AlertCircle, CheckCircle2,
  XCircle, Briefcase, Calendar, Hash, Eye, BadgeCheck,
} from "lucide-react";
import { approveKyc, rejectKyc, type KycItem, type KycDoc } from "@/lib/services/admin";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const DOC_LABELS: Record<string, string> = {
  nin:                  "NIN (National ID)",
  bvn:                  "BVN",
  cac:                  "CAC Certificate",
  professional_license: "Professional Licence",
  arcon:                "ARCON Certificate",
  coren:                "COREN Certificate",
  niqs:                 "NIQS Certificate",
  nse:                  "NSE Certificate",
  degree:               "Degree Certificate",
  nysc:                 "NYSC Discharge Certificate",
  passport:             "International Passport",
  utility:              "Utility Bill",
  business_reg:         "Business Registration",
  other:                "Other Document",
  document:             "Document",
};

function docLabel(raw: string) {
  return DOC_LABELS[raw.toLowerCase()] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Avatar({ item, size = 40 }: { item: KycItem; size?: number }) {
  if (item.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.avatarUrl} alt={item.name} width={size} height={size} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span className="rounded-full bg-[#f5f5f5] dark:bg-white/8 flex items-center justify-center text-[#9a9a9a] flex-shrink-0" style={{ width: size, height: size }}>
      {item.kind === "company" ? <Building2 size={size * 0.4} /> : <User size={size * 0.4} />}
    </span>
  );
}

function DocCard({ doc }: { doc: KycDoc }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-3.5">
      <div className="w-9 h-9 rounded-lg bg-[#f0f0f0] dark:bg-white/8 flex items-center justify-center text-[#6b6b6b] dark:text-white/50 flex-shrink-0">
        <FileText size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{docLabel(doc.docType)}</p>
        <p className="text-[11px] text-[#9a9a9a]">Submitted {doc.submittedAt}</p>
        {doc.note && <p className="text-[11px] text-[#9a9a9a] mt-0.5 italic">{doc.note}</p>}
      </div>
      {doc.docUrl ? (
        <a
          href={doc.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#f0f0f0] dark:bg-white/8 text-[12px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:bg-[#e3e3e3] dark:hover:bg-white/15 transition-colors flex-shrink-0"
        >
          <Eye size={13} /> View
        </a>
      ) : (
        <span className="text-[11px] text-[#9a9a9a] flex-shrink-0">No file</span>
      )}
    </div>
  );
}

/* ─── reject modal ──────────────────────────────────────────────────────────── */

function RejectModal({ item, onClose, onConfirm }: { item: KycItem; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-[420px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fce8e8] flex items-center justify-center text-[#e5484d]">
              <XCircle size={16} />
            </div>
            <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Reject verification</h2>
          </div>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-[13px] text-[#6b6b6b] dark:text-white/60">
            You are rejecting <span className="font-semibold text-[#1e1e1e] dark:text-white">{item.name}</span>.
            They will be notified with this reason.
          </p>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a] mb-2">
              Reason (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Document uploaded was not a NIN — please upload a clear copy of your NIN slip or NIN card."
              className="w-full px-3 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[13px] text-[#1e1e1e] dark:text-white placeholder-[#9a9a9a] outline-none focus:border-[#e5484d] resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2.5 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 text-[13px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 py-2.5 rounded-xl bg-[#e5484d] text-white text-[13px] font-semibold hover:bg-[#d03d42] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Reject &amp; notify
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── detail panel ──────────────────────────────────────────────────────────── */

function DetailPanel({
  item, onClose, onApprove, onReject, isPending,
}: {
  item: KycItem;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar item={item} size={36} />
          <div>
            <p className="text-[14px] font-bold text-[#1e1e1e] dark:text-white leading-tight">{item.name}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.kind === "company" ? "bg-[#e0e7ff] text-[#6366f1]" : "bg-[#fff7cc] text-[#caa400]"}`}>
              {item.kind === "company" ? "Company" : "Professional"}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors ml-2">
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Contact & meta */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Contact &amp; identity</h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2.5 text-[13px]">
              <Mail size={14} className="text-[#9a9a9a] flex-shrink-0" />
              <span className="text-[#1e1e1e] dark:text-white font-medium">{item.email || "—"}</span>
            </div>
            {item.location && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <MapPin size={14} className="text-[#9a9a9a] flex-shrink-0" />
                <span className="text-[#6b6b6b] dark:text-white/70">{item.location}</span>
              </div>
            )}
            {item.headline && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <Briefcase size={14} className="text-[#9a9a9a] flex-shrink-0" />
                <span className="text-[#6b6b6b] dark:text-white/70">{item.headline}</span>
              </div>
            )}
            {item.industry && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <Hash size={14} className="text-[#9a9a9a] flex-shrink-0" />
                <span className="text-[#6b6b6b] dark:text-white/70">{item.industry}</span>
              </div>
            )}
            {item.yearsExperience != null && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <Calendar size={14} className="text-[#9a9a9a] flex-shrink-0" />
                <span className="text-[#6b6b6b] dark:text-white/70">{item.yearsExperience} year{item.yearsExperience !== 1 ? "s" : ""} experience</span>
              </div>
            )}
            {item.headquarters && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <MapPin size={14} className="text-[#9a9a9a] flex-shrink-0" />
                <span className="text-[#6b6b6b] dark:text-white/70">{item.headquarters}</span>
              </div>
            )}
            {item.companySize && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <User size={14} className="text-[#9a9a9a] flex-shrink-0" />
                <span className="text-[#6b6b6b] dark:text-white/70">{item.companySize} employees</span>
              </div>
            )}
            {item.yearFounded && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <Calendar size={14} className="text-[#9a9a9a] flex-shrink-0" />
                <span className="text-[#6b6b6b] dark:text-white/70">Founded {item.yearFounded}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-[13px]">
              <Clock size={14} className="text-[#9a9a9a] flex-shrink-0" />
              <span className="text-[#9a9a9a]">Registered {item.submittedAt}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {item.bio && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">About</h3>
            <p className="text-[13px] text-[#6b6b6b] dark:text-white/70 leading-relaxed">{item.bio}</p>
          </div>
        )}

        {/* KYC Documents */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Verification documents</h3>
            <span className="text-[10px] font-semibold text-[#9a9a9a]">{item.docs.length} submitted</span>
          </div>
          {item.docs.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#e3e3e3] dark:border-white/10 p-4">
              <AlertCircle size={15} className="text-[#f59e0b] flex-shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">No documents uploaded</p>
                <p className="text-[11px] text-[#9a9a9a] mt-0.5">This applicant has not submitted any KYC documents yet.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {item.docs.map((doc) => (
                <DocCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Action footer */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-[#f0f0f0] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02] flex gap-3">
        <button
          onClick={onReject}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e5484d]/40 text-[#e5484d] text-[13px] font-semibold hover:bg-[#fce8e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <XCircle size={15} /> Reject
        </button>
        <button
          onClick={onApprove}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <span className="w-4 h-4 rounded-full border-2 border-[#1e1e1e]/30 border-t-[#1e1e1e] animate-spin" />
          ) : (
            <><BadgeCheck size={15} /> Grant Verified</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── applicant list row ────────────────────────────────────────────────────── */

function ListRow({ item, selected, onClick }: { item: KycItem; selected: boolean; onClick: () => void }) {
  const docCount = item.docs.length;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-[#f5f5f5] dark:border-white/5 last:border-0 ${selected ? "bg-[#fff7cc] dark:bg-[#ffd716]/[0.06]" : "hover:bg-[#fafafa] dark:hover:bg-white/[0.02]"}`}
    >
      <Avatar item={item} size={38} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{item.name}</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${item.kind === "company" ? "bg-[#e0e7ff] text-[#6366f1]" : "bg-[#fff7cc] text-[#caa400]"}`}>
            {item.kind === "company" ? "Company" : "Pro"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-[#9a9a9a] truncate">{item.headline ?? item.industry ?? item.email}</p>
          {docCount > 0 ? (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#16803c] bg-[#dcfce7] dark:bg-[#22c55e]/15 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <FileText size={9} /> {docCount} doc{docCount > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#b45309] bg-[#fff3cd] dark:bg-[#f59e0b]/15 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <AlertCircle size={9} /> No docs
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${selected ? "text-[#caa400]" : "text-[#d0d0d0] dark:text-white/20"}`} />
    </button>
  );
}

/* ─── empty state ──────────────────────────────────────────────────────────── */

function EmptyQueue() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-[#dcfce7] dark:bg-[#22c55e]/15 flex items-center justify-center text-[#16803c] mb-4">
        <CheckCircle2 size={26} />
      </div>
      <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Queue clear</h3>
      <p className="mt-1.5 text-[13px] text-[#9a9a9a] max-w-[220px]">All profiles and companies have been reviewed. Check back later.</p>
    </div>
  );
}

function EmptySelection() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full p-8">
      <div className="w-12 h-12 rounded-2xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a] mb-3">
        <ExternalLink size={20} />
      </div>
      <p className="text-[13px] font-semibold text-[#9a9a9a]">Select an applicant</p>
      <p className="text-[12px] text-[#b3b3b3] dark:text-white/30 mt-1">Choose someone from the list to review their KYC details and documents.</p>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────────────────── */

export function AdminVerification({ items = [] }: { items?: KycItem[] }) {
  const router = useRouter();
  const [list, setList] = useState<KycItem[]>(items);
  const [selected, setSelected] = useState<KycItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KycItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const removeFromList = (item: KycItem) => {
    setList((l) => l.filter((x) => !(x.id === item.id && x.kind === item.kind)));
    if (selected?.id === item.id && selected?.kind === item.kind) setSelected(null);
  };

  const handleApprove = (item: KycItem) => {
    startTransition(async () => {
      try {
        await approveKyc(item.kind, item.id);
        removeFromList(item);
        toast.success(`${item.name} verified successfully`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Approval failed");
      }
    });
  };

  const handleReject = (item: KycItem, reason: string) => {
    setRejectTarget(null);
    startTransition(async () => {
      try {
        await rejectKyc(item.kind, item.id, reason);
        removeFromList(item);
        toast.success(`${item.name}'s application rejected`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rejection failed");
      }
    });
  };

  return (
    <>
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="KYC"
          title="KYC Verification"
          subtitle="Review identity documents and verify users."
        />
      </DashBanner>
      <div className="mb-5" />
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="max-w-[1040px]">

          {list.length === 0 ? (
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
              <EmptyQueue />
            </div>
          ) : (
            /* Master-detail layout */
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden flex" style={{ minHeight: 560 }}>

              {/* Left: applicant list (scrollable) */}
              <div className="w-[300px] flex-shrink-0 border-r border-[#f0f0f0] dark:border-white/10 overflow-y-auto">
                <div className="px-4 py-3 border-b border-[#f0f0f0] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Pending review</p>
                </div>
                {list.map((item) => (
                  <ListRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    selected={selected?.id === item.id && selected?.kind === item.kind}
                    onClick={() => setSelected(item)}
                  />
                ))}
              </div>

              {/* Right: detail panel */}
              <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                  {selected ? (
                    <DetailPanel
                      key={`${selected.kind}-${selected.id}`}
                      item={selected}
                      onClose={() => setSelected(null)}
                      onApprove={() => handleApprove(selected)}
                      onReject={() => setRejectTarget(selected)}
                      isPending={isPending}
                    />
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex"
                    >
                      <EmptySelection />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectTarget && (
          <RejectModal
            item={rejectTarget}
            onClose={() => setRejectTarget(null)}
            onConfirm={(reason) => handleReject(rejectTarget, reason)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
