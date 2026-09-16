"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, MapPin, Video, Users2, ExternalLink, Check, Star, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/kit/empty-state";
import { setRsvp, cancelRsvp, type EventItem, type RsvpStatus } from "@/lib/services/events";

const CATEGORY_LABEL: Record<string, string> = {
  industry: "Industry", conference: "Conference", workshop: "Workshop",
  webinar: "Webinar", training: "Training", site_visit: "Site visit", networking: "Networking",
};

function fmtDay(iso: string) {
  const d = new Date(iso);
  return { day: d.toLocaleDateString("en-US", { day: "2-digit" }), mon: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase() };
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function EventCard({ ev }: { ev: EventItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const d = fmtDay(ev.startsAt);
  const past = new Date(ev.startsAt).getTime() < Date.now();

  function respond(status: RsvpStatus) {
    start(async () => {
      try {
        if (ev.myStatus === status) { await cancelRsvp(ev.id); toast.success("RSVP removed"); }
        else { await setRsvp(ev.id, status); toast.success(status === "going" ? "You're going!" : "Marked as interested"); }
        router.refresh();
      } catch { toast.error("Could not update your RSVP"); }
    });
  }

  return (
    <div className={cn("rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#181818] p-4 sm:p-5 flex gap-4", past && "opacity-60")}>
      <div className="w-14 h-14 rounded-xl bg-[#fffdf2] dark:bg-[#ffd716]/10 border border-[#ffd716]/40 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[17px] font-extrabold text-[#1e1e1e] dark:text-white leading-none">{d.day}</span>
        <span className="text-[9px] font-bold tracking-widest text-[#caa400] mt-0.5">{d.mon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#caa400] dark:text-[#ffd716]">{CATEGORY_LABEL[ev.category] ?? ev.category}</span>
              <span className="text-[10px] text-[#9a9a9a]">·</span>
              <span className="text-[10px] text-[#9a9a9a] inline-flex items-center gap-1">
                {ev.format === "online" ? <><Video size={11} /> Online</> : ev.format === "hybrid" ? "Hybrid" : "In person"}
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white leading-snug truncate">{ev.title}</h3>
            {ev.organizer && <p className="text-[12px] text-[#9a9a9a] mt-0.5">By {ev.organizer}</p>}
          </div>
          {ev.externalUrl && (
            <Link href={ev.externalUrl} target="_blank" className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors flex-shrink-0" aria-label="Event link">
              <ExternalLink size={15} />
            </Link>
          )}
        </div>

        {ev.description && <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/60 mt-1.5 line-clamp-2">{ev.description}</p>}

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-[11.5px] text-[#9a9a9a] inline-flex items-center gap-1"><CalendarDays size={12} /> {fmtTime(ev.startsAt)}</span>
          {ev.location && <span className="text-[11.5px] text-[#9a9a9a] inline-flex items-center gap-1 min-w-0"><MapPin size={12} /> <span className="truncate max-w-[220px]">{ev.location}</span></span>}
          <span className="text-[11.5px] text-[#9a9a9a] inline-flex items-center gap-1"><Users2 size={12} /> {ev.goingCount} going</span>
        </div>

        {!past && (
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button" disabled={pending} onClick={() => respond("going")}
              className={cn("inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors disabled:opacity-60",
                ev.myStatus === "going" ? "bg-[#ffd716] text-[#1e1e1e]" : "border border-[#ececec] dark:border-white/15 text-[#1e1e1e] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5")}>
              <Check size={13} /> Going
            </button>
            <button
              type="button" disabled={pending} onClick={() => respond("interested")}
              className={cn("inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors disabled:opacity-60",
                ev.myStatus === "interested" ? "bg-[#ffd716] text-[#1e1e1e]" : "border border-[#ececec] dark:border-white/15 text-[#1e1e1e] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5")}>
              <Star size={13} /> Interested
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function EventsView({ initial }: { initial: EventItem[] }) {
  const now = Date.now();
  const { upcoming, past } = useMemo(() => ({
    upcoming: initial.filter((e) => new Date(e.startsAt).getTime() >= now),
    past: initial.filter((e) => new Date(e.startsAt).getTime() < now).reverse(),
  }), [initial, now]);

  if (!initial.length) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="No events yet"
        description="Industry conferences, workshops and site visits will appear here once they're announced."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#9a9a9a] mb-3">Upcoming</h2>
        {upcoming.length
          ? <div className="space-y-3">{upcoming.map((e) => <EventCard key={e.id} ev={e} />)}</div>
          : <p className="text-[13px] text-[#9a9a9a]">Nothing scheduled right now — check back soon.</p>}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#9a9a9a] mb-3">Past</h2>
          <div className="space-y-3">{past.map((e) => <EventCard key={e.id} ev={e} />)}</div>
        </section>
      )}
    </div>
  );
}
