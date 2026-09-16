"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, BadgeCheck, MapPin, MessageSquare, BookmarkCheck, UserPlus, UserCheck, Send } from "lucide-react";
import { toggleSaved } from "@/lib/services/saved";
import { followUser, unfollowUser, type NetPerson } from "@/lib/services/network";
import type { ProCard } from "@/lib/services/directory";
import { cn } from "@/lib/utils";
import { DashBanner, BannerContent, bannerBtn } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";
import { Modal, inputClass } from "@/components/ui/modal";
import { useAuth } from "@/lib/store/auth";
import { listLocalMessages, sendLocalMessage, type LocalMsg } from "@/lib/client-message-store";

export type ContactedPerson = { id: string; name: string; avatarUrl: string; headline: string };
export type NetworkTab = "all" | "saved" | "contacted" | "following" | "followers";
type Tab = NetworkTab;

/** Card for the Following/Followers tabs — follow toggle + online + message. */
function FollowCard({ person, onMessage }: { person: NetPerson; onMessage: () => void }) {
  const [iFollow, setIFollow] = useState(person.iFollow);
  async function toggle() {
    const was = iFollow;
    setIFollow(!was);
    try { await (was ? unfollowUser(person.id) : followUser(person.id)); }
    catch { setIFollow(was); toast.error("Couldn't update follow"); }
  }
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={person.avatarUrl || FALLBACK} alt={person.name} className="w-12 h-12 rounded-full object-cover" />
          {person.online && <span title="Online now" className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#16a34a] ring-2 ring-white dark:ring-[#1e1e1e]" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#1e1e1e] dark:text-white flex items-center gap-1 truncate">{person.name} {person.verified && <BadgeCheck size={14} className="text-[#1e9df5] flex-shrink-0" />}</p>
          {person.headline && <p className="text-[12px] text-[#9a9a9a] truncate">{person.headline}</p>}
          {person.location && <p className="mt-0.5 text-[11px] text-[#9a9a9a] flex items-center gap-1 truncate"><MapPin size={11} /> {person.location}</p>}
          {person.followsMe && !iFollow && <span className="mt-1 inline-block text-[10px] font-semibold text-[#caa400] bg-[#fff7cc] dark:bg-[#ffd716]/10 px-1.5 py-0.5 rounded">Follows you</span>}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#f5f5f5] dark:border-white/5 flex items-center gap-2">
        <button onClick={toggle} className={cn("flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors",
          iFollow ? "border border-[#e3e3e3] dark:border-white/15 text-[#1e1e1e] dark:text-white hover:border-[#ffd716]" : "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]")}>
          {iFollow ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> {person.followsMe ? "Follow back" : "Follow"}</>}
        </button>
        <button onClick={onMessage} aria-label="Message" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:border-[#ffd716] transition-colors"><MessageSquare size={15} /></button>
      </div>
    </motion.div>
  );
}

const FALLBACK = r2Url("site/photo-1494790108377-be9c29b29330.jpg");

function NetCard({ id, name, avatarUrl, headline, location, verified, savedInitially, onMessage }: {
  id: string; name: string; avatarUrl: string; headline: string; location?: string; verified?: boolean; savedInitially: boolean; onMessage: () => void;
}) {
  const [saved, setSaved] = useState(savedInitially);
  async function toggle() {
    const was = saved;
    setSaved(!was);
    toast(was ? "Removed from network" : "Saved to your network");
    try { await toggleSaved("professional", id); } catch { setSaved(was); toast.error("Couldn't update"); }
  }
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 flex flex-col">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl || FALLBACK} alt={name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#1e1e1e] dark:text-white flex items-center gap-1 truncate">{name} {verified && <BadgeCheck size={14} className="text-[#1e9df5] flex-shrink-0" />}</p>
          {headline && <p className="text-[12px] text-[#9a9a9a] truncate">{headline}</p>}
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#9a9a9a]">
            {location && <span className="flex items-center gap-1 truncate"><MapPin size={11} /> {location}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#f5f5f5] dark:border-white/5 flex items-center gap-2">
        <button onClick={onMessage} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-semibold hover:bg-[#e6c114] transition-colors"><MessageSquare size={14} /> Message</button>
        <button onClick={toggle} aria-label={saved ? "Remove" : "Save"} className={cn("w-9 h-9 flex items-center justify-center rounded-lg border transition-colors", saved ? "border-[#ffd716] text-[#caa400] bg-[#fff7cc] dark:bg-[#ffd716]/10" : "border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:text-[#caa400]")}><BookmarkCheck size={15} /></button>
      </div>
    </motion.div>
  );
}

export function MyNetwork({ saved, contacted, following = [], followers = [], embedded = false, initialTab = "all" }: { saved: ProCard[]; contacted: ContactedPerson[]; following?: NetPerson[]; followers?: NetPerson[]; embedded?: boolean; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState("");

  // merge for "all" (dedupe by id, saved entries take precedence for richer data)
  const merged = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatarUrl: string; headline: string; location?: string; verified?: boolean; saved: boolean; contacted: boolean }>();
    for (const c of contacted) map.set(c.id, { ...c, saved: false, contacted: true });
    for (const p of saved) {
      const prev = map.get(p.id);
      map.set(p.id, { id: p.id, name: p.name, avatarUrl: p.avatarUrl, headline: p.headline, location: p.location, verified: p.verified, saved: true, contacted: prev?.contacted ?? false });
    }
    return [...map.values()];
  }, [saved, contacted]);

  const counts = { all: merged.length, saved: merged.filter((m) => m.saved).length, contacted: merged.filter((m) => m.contacted).length, following: following.length, followers: followers.length };
  const list = merged
    .filter((m) => tab === "all" || (tab === "saved" && m.saved) || (tab === "contacted" && m.contacted))
    .filter((m) => q === "" || `${m.name} ${m.headline}`.toLowerCase().includes(q.toLowerCase()));
  const ql = q.toLowerCase();
  const followList = (tab === "following" ? following : followers)
    .filter((p) => q === "" || `${p.name} ${p.headline}`.toLowerCase().includes(ql));

  const go = (id: string) => { window.location.href = `/dashboard/messages?to=${id}`; };

  return (
    <div className={cn(embedded ? "max-w-[1080px]" : "px-5 sm:px-6 lg:px-8 py-6 max-w-[1080px] mx-auto")}>
      <DashBanner image={r2Url("site/photo-1522071820081-009f0129c71c.jpg")}>
        <BannerContent
          eyebrow="Connections"
          title="My Network"
          subtitle="People you've saved and professionals you've been in touch with."
          actions={
            <Link href="/dashboard/find-professionals" className={cn(bannerBtn, "font-bold")}><UserPlus size={15} /> Find people</Link>
          }
        />
      </DashBanner>

      <div className="mt-5 flex items-center gap-1 border-b border-[#ececec] dark:border-white/10">
        {([["all", "All"], ["following", "Following"], ["followers", "Followers"], ["saved", "Saved"], ["contacted", "Contacted"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("relative px-3.5 py-2.5 text-[13px] font-medium transition-colors", tab === k ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>
            {label} <span className="text-[11px] text-[#b3b3b3]">{counts[k]}</span>
            {tab === k && <motion.span layoutId="nettab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#ffd716]" />}
          </button>
        ))}
      </div>

      <div className="mt-4 relative max-w-[340px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your network…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
      </div>

      {tab === "following" || tab === "followers" ? (
        followList.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Users size={22} /></div>
            <p className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">{tab === "following" ? "You're not following anyone yet" : "No followers yet"}</p>
            <p className="mt-1 text-[13px] text-[#9a9a9a] max-w-sm">{tab === "following" ? "Follow professionals to build your network and keep up with them." : "As people follow you, they'll appear here — follow them back to connect."}</p>
            <Link href="/dashboard/find-professionals" className="mt-4 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">Find people to follow</Link>
          </div>
        ) : (
          <motion.div layout className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {followList.map((p) => <FollowCard key={p.id} person={p} onMessage={() => go(p.id)} />)}
            </AnimatePresence>
          </motion.div>
        )
      ) : list.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Users size={22} /></div>
          <p className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">Your network is empty here</p>
          <p className="mt-1 text-[13px] text-[#9a9a9a] max-w-sm">Save professionals from the directory or start a conversation, and they'll show up in your network.</p>
          <Link href="/dashboard/find-professionals" className="mt-4 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">Browse professionals</Link>
        </div>
      ) : (
        <motion.div layout className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {list.map((m) => <NetCard key={m.id} {...m} savedInitially={m.saved} onMessage={() => go(m.id)} />)}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Chat panel for one saved profile. Messages persist to localStorage only (see
 * client-message-store) — swap the store functions for server actions when the
 * live database is connected.
 */
function SavedChatModal({ person, onClose }: { person: ProCard | null; onClose: () => void }) {
  const me = useAuth((s) => s.user?.email || "anon");
  const [msgs, setMsgs] = useState<LocalMsg[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!person) return;
    listLocalMessages(me, person.id).then(setMsgs).catch(() => setMsgs([]));
    setDraft("");
  }, [person?.id, me]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs.length, person?.id]);

  function send() {
    const body = draft.trim();
    if (!body || !person) return;
    sendLocalMessage(me, person.id, body).then((stored) => setMsgs((cur) => [...cur, stored]));
    setDraft("");
  }

  const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Modal open={!!person} onClose={onClose} title={person ? `Message ${person.name}` : ""} subtitle={person ? person.headline || undefined : undefined} maxWidth="max-w-[500px]">
      <div ref={listRef} className="max-h-[320px] min-h-[160px] overflow-y-auto flex flex-col gap-2 p-1">
        {msgs.length === 0 ? (
          <p className="my-auto text-center text-[13px] text-[#9a9a9a]">No messages yet — say hello.</p>
        ) : msgs.map((m) => (
          <div key={m.id} className={cn(
            "max-w-[80%] rounded-2xl px-3 py-2 text-[13px]",
            m.from === "me"
              ? "ml-auto bg-[#ffd716] text-[#1e1e1e]"
              : "border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-white",
          )}>
            {m.body}
            <span className="mt-0.5 block text-[10px] opacity-60">{time(m.at)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          className={inputClass}
        />
        <button onClick={send} disabled={!draft.trim()} aria-label="Send" className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#ffd716] text-[#1e1e1e] flex items-center justify-center hover:bg-[#e6c114] transition-colors disabled:opacity-40 disabled:pointer-events-none"><Send size={16} /></button>
      </div>
      <p className="mt-2 text-[11px] text-[#b3b3b3]">Messages are stored on this device for now — they move to the database when the app goes live.</p>
    </Modal>
  );
}

/**
 * Saved Profile page — the saved-professionals list on its own, no network
 * tabs. Same cards as the network's Saved tab (message + unsave).
 */
export function SavedProfessionals({ people }: { people: ProCard[] }) {
  const [q, setQ] = useState("");
  const [chatWith, setChatWith] = useState<ProCard | null>(null);
  const list = people.filter((p) => q === "" || `${p.name} ${p.headline}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-6 py-6 md:px-8">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">Saved Profile</h1>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Professionals you&rsquo;ve saved for quick access.</p>
      </div>

      <div className="relative max-w-[340px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search saved profiles…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716]" />
      </div>

      {list.length === 0 ? (
        <div className={cn("mt-10 flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10")}>
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><BookmarkCheck size={22} /></div>
          <p className="mt-3 text-sm font-semibold text-[#1e1e1e] dark:text-white">{q ? "No saved profile matches that search" : "No saved profiles yet"}</p>
          <p className="mt-1 text-[13px] text-[#9a9a9a] max-w-sm">Save professionals from the directory and they&rsquo;ll show up here.</p>
          {!q && <Link href="/dashboard/people" className="mt-4 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">Browse professionals</Link>}
        </div>
      ) : (
        <motion.div layout className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {list.map((p) => (
              <NetCard
                key={p.id}
                id={p.id} name={p.name} avatarUrl={p.avatarUrl} headline={p.headline}
                location={p.location} verified={p.verified}
                savedInitially onMessage={() => setChatWith(p)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <SavedChatModal person={chatWith} onClose={() => setChatWith(null)} />
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */export function MyNetworkSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) =>
    <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1080px] mx-auto">
      {/* banner skeleton */}
      <S cls="rounded-2xl h-[110px] sm:h-[118px] w-full" />
      <div className="mt-5 flex items-center gap-1 border-b border-[#ececec] dark:border-white/10">
        {[56, 64, 80].map((w, i) => <div key={i} className="skeleton rounded-md h-4 px-3.5 py-2.5" style={{ width: w }} />)}
      </div>
      <S cls="mt-4 h-9 w-full max-w-[340px] rounded-lg" />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
            <div className="flex items-start gap-3">
              <S cls="w-11 h-11 rounded-full flex-shrink-0" />
              <div className="space-y-1.5"><S cls="h-3.5 w-32" /><S cls="h-3 w-24" /><S cls="h-3 w-20" /></div>
            </div>
            <div className="mt-2.5 flex gap-1.5">{[60, 72, 56].map((w, j) => <S key={j} cls="h-6 rounded-full" style={{ width: w }} />)}</div>
            <div className="mt-3 pt-3 border-t border-[#f5f5f5] dark:border-white/5 flex gap-2">
              <S cls="flex-1 h-9 rounded-lg" /><S cls="flex-1 h-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
