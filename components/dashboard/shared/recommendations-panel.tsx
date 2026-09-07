"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, Pin, Share2, EyeOff, Eye, Trash2, CheckCircle2, Search } from "lucide-react";
import { EmptyState, KebabMenu, StatusBadge } from "@/components/dashboard/kit";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { NomarcAvatar } from "@/components/ui/avatar";
import {
  getMyReceivedRecommendations, approveRecommendation, hideRecommendation,
  unhideRecommendation, togglePinRecommendation, deleteRecommendation, requestRecommendation,
  type ReceivedRec,
} from "@/lib/services/recommendations";
import { getProfessionals, type ProCard } from "@/lib/services/directory";

/**
 * Recommendations tab body — shared by the professional and exhibitor
 * dashboard homes (images 79-81/94-97). Two sub-views: the published list
 * (approved, pinned first) and Drafts (pending + hidden, awaiting the owner's
 * approve/unhide decision). "Ask for a recommendation" sends a DM via the
 * existing messaging service (there's no separate request table).
 */
export function RecommendationsPanel({ emptyDescription, allowRequests = true }: { emptyDescription: string; allowRequests?: boolean }) {
  const [view, setView] = useState<"list" | "drafts">("list");
  const [published, setPublished] = useState<ReceivedRec[] | null>(null);
  const [drafts, setDrafts] = useState<ReceivedRec[] | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  async function refresh() {
    const [pub, dr] = await Promise.all([getMyReceivedRecommendations("published"), getMyReceivedRecommendations("drafts")]);
    setPublished(pub);
    setDrafts(dr);
  }
  useEffect(() => { refresh(); }, []);

  const list = view === "list" ? published : drafts;
  const draftCount = drafts?.length ?? 0;

  async function act(fn: () => Promise<unknown>, okMsg?: string) {
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-full bg-[#f4f4f4] p-0.5 dark:bg-white/5">
          {(["list", "drafts"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`relative rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                view === v ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"
              }`}
            >
              {v === "list" ? "Recommendations" : `Drafts${draftCount ? ` (${draftCount})` : ""}`}
            </button>
          ))}
        </div>
        {allowRequests && (
          <button
            onClick={() => setAskOpen(true)}
            className="rounded-lg bg-[#ffd716] px-3.5 py-2 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
          >
            Ask for a recommendation
          </button>
        )}
      </div>

      {list === null ? (
        <div className="py-16 text-center text-[13px] text-[#9a9a9a]">Loading…</div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ThumbsUp}
          title={view === "list" ? "No recommendations yet" : "No drafts right now"}
          description={view === "list" ? emptyDescription : "Recommendations someone writes for you land here first, so you can approve & publish them."}
          primary={view === "list" && allowRequests ? { label: "Request Recommendation", onClick: () => setAskOpen(true) } : undefined}
        />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-[#ececec] bg-white p-4 dark:border-white/10 dark:bg-[#1e1e1e]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <NomarcAvatar src={r.avatarUrl} name={r.name} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">{r.name}</p>
                        {r.pinned && <StatusBadge tone="yellow">Pinned</StatusBadge>}
                        {r.status === "pending" && <StatusBadge tone="amber">New</StatusBadge>}
                        {r.status === "hidden" && <StatusBadge tone="grey">Hidden</StatusBadge>}
                      </div>
                      <p className="text-[11.5px] text-[#9a9a9a]">{r.relationship} · {r.date}</p>
                    </div>
                  </div>
                  <KebabMenu
                    items={
                      view === "drafts"
                        ? [
                            { icon: CheckCircle2, label: "Approve & Publish", onClick: () => act(() => approveRecommendation(r.id), "Published to your profile"), hidden: r.status !== "pending" },
                            { icon: Eye, label: "Unhide", onClick: () => act(() => unhideRecommendation(r.id)), hidden: r.status !== "hidden" },
                            { icon: Trash2, label: "Delete", danger: true, onClick: () => act(() => deleteRecommendation(r.id), "Deleted") },
                          ]
                        : [
                            { icon: Pin, label: r.pinned ? "Unpin" : "Pin to top", onClick: () => act(() => togglePinRecommendation(r.id, !r.pinned)) },
                            { icon: Share2, label: "Share", onClick: () => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied"); } },
                            { icon: EyeOff, label: "Hide from profile", onClick: () => act(() => hideRecommendation(r.id)) },
                            { icon: Trash2, label: "Delete", danger: true, onClick: () => act(() => deleteRecommendation(r.id), "Deleted") },
                          ]
                    }
                  />
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[#3d3d3d] dark:text-white/75">{r.body}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <AskModal open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}

function AskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [people, setPeople] = useState<ProCard[]>([]);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<ProCard | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) getProfessionals().then(setPeople).catch(() => setPeople([]));
    else { setQuery(""); setTarget(null); setNote(""); }
  }, [open]);

  const results = query.trim() ? people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())) : [];

  async function send() {
    if (!target) return;
    setSending(true);
    try {
      await requestRecommendation(target.id, note.trim() || undefined);
      toast.success(`Request sent to ${target.name}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the request");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ask for a recommendation" maxWidth="max-w-md">
      {!target ? (
        <div>
          <Field label="Request from">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
              <input className={`${inputClass} pl-8`} placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </Field>
          {results.length > 0 && (
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {results.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setTarget(p)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#f5f5f5] dark:hover:bg-white/5">
                    <NomarcAvatar src={p.avatarUrl} name={p.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[#1e1e1e] dark:text-white">{p.name}</span>
                      <span className="block truncate text-[11.5px] text-[#9a9a9a]">{p.headline}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-[#f5f5f5] px-3 py-2 dark:bg-white/5">
            <NomarcAvatar src={target.avatarUrl} name={target.name} size="sm" />
            <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">{target.name}</span>
            <button onClick={() => setTarget(null)} className="ml-auto text-[11.5px] text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white">Change</button>
          </div>
          <Field label="Note (optional)">
            <textarea className={`${inputClass} min-h-[90px] resize-none`} placeholder="Add a personal note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton onClick={send} disabled={sending}>{sending ? "Sending…" : "Send Request"}</PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
