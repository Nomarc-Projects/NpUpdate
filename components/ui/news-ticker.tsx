"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, Asterisk, X } from "lucide-react";
import { getActiveTicker } from "@/lib/services/ticker";
import { TICKER_SPEED_DEFAULT } from "@/lib/services/platform-settings-shared";
import { marqueeLoop, useMarqueeDuration } from "./marquee-speed";

type Item = { content: string; href: string | null };

/**
 * The yellow "Latest News" chip + the looping marquee — shared by the site-wide
 * ticker and the inline (in-page) copy.
 *
 * `pxPerSecond` is a rate, not a duration: the animation's duration is derived
 * from the measured track width so the strip travels at the same visual speed no
 * matter how many items are live. A hardcoded duration made perceived speed a
 * function of item count.
 */
function TickerRow({ items, pxPerSecond }: { items: Item[]; pxPerSecond: number }) {
  const loop = marqueeLoop(items);
  const { trackRef, duration } = useMarqueeDuration(pxPerSecond, loop.length);

  return (
    <>
      <span className="flex items-center gap-1.5 bg-[#ffd716] text-[#1e1e1e] text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wide px-2.5 sm:px-3 py-1.5 flex-shrink-0">
        <Megaphone size={13} />
        <span>Latest News</span>
      </span>
      <div className="group flex-1 overflow-hidden min-w-0 flex items-center">
        {/* The animation is held back until the track has been measured, so the
            first painted frame is never at a wrong speed. */}
        <div
          ref={trackRef}
          className={`flex w-max group-hover:[animation-play-state:paused] ${
            duration ? "nm-marquee-track" : ""
          }`}
          style={duration ? { animationDuration: `${duration}s` } : undefined}
        >
          {loop.map((it, i) => (
            <span key={i} className="flex items-center gap-2 text-[12.5px] sm:text-[13px] text-white/85 whitespace-nowrap px-5 sm:px-6">
              <Asterisk size={17} strokeWidth={2.75} className="text-[#ffd716] animate-[spin_5s_linear_infinite] flex-shrink-0" />
              {it.href ? (
                <Link href={it.href} className="hover:text-white hover:underline">{it.content}</Link>
              ) : (
                it.content
              )}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/** Refetch when the tab regains focus, so a ticker saved in another tab shows up
 *  without a manual reload. Pauses while the tab is hidden — a background tab
 *  refetching is both wasted work and a way to serve a request nobody sees. */
function useRefreshOnFocus(refresh: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh, enabled]);
}

/**
 * Site-wide news ticker. Rests at the very top, above the navbar.
 * The dark background is full page-width (full-bleed), while the inner content
 * (the yellow "News" chip + the marquee) is aligned to the hero banner's edges
 * via the same horizontal padding the hero uses (`md:px-10 lg:px-14`).
 * Marketing pages only — dismissible, pauses on hover.
 *
 * Mounted in the root layout, so it has no server props: it fetches on mount and
 * on tab focus. The homepage's inline copy is server-rendered instead.
 */
export function NewsTicker() {
  const pathname = usePathname();
  const inApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname === "/suspended" ||
    // Announcing "New features dropped!" across the top of a page that says the
    // platform is offline reads as a broken site, not a maintained one.
    pathname === "/maintenance";

  const [items, setItems] = useState<Item[]>([]);
  const [pxPerSecond, setPxPerSecond] = useState(TICKER_SPEED_DEFAULT.pxPerSecond);
  const [dismissed, setDismissed] = useState(true);

  const load = useCallback(() => {
    getActiveTicker()
      .then(({ items: rows, pxPerSecond: rate }) => {
        setItems(rows);
        setPxPerSecond(rate);
        if (rows.length) setDismissed(sessionStorage.getItem("nm-ticker-dismissed") === "1");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!inApp) load();
  }, [inApp, load]);

  useRefreshOnFocus(load, !inApp);

  if (inApp || !items.length || dismissed) return null;

  return (
    <div className="relative z-[60] w-full bg-[#1e1e1e] dark:bg-[#0c0c0c] text-white border-b border-transparent dark:border-white/10">
      {/* Inner content is aligned to the hero banner's edges */}
      <div className="px-4 sm:px-6 md:px-10 lg:px-14">
        <div className="flex items-stretch">
          <TickerRow items={items} pxPerSecond={pxPerSecond} />
          {/* Dismiss — pinned far right, marquee ends just before it */}
          <button
            onClick={() => { sessionStorage.setItem("nm-ticker-dismissed", "1"); setDismissed(true); }}
            aria-label="Dismiss news ticker"
            className="flex-shrink-0 pl-2 sm:pl-3 flex items-center text-white/55 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline copy of the news ticker, dropped between homepage sections (full-bleed
 * black strip). Not fixed, not dismissible — always shows the same live ticker
 * items. Renders nothing when there are none.
 *
 * `initialItems` / `initialPxPerSecond` come from the server, so the strip and
 * its text are in the HTML on first paint (crawler-visible, no flash of empty
 * strip). A background refresh on tab focus still runs, so an edit saved in
 * another tab appears without a reload.
 */
export function InlineNewsTicker({
  initialItems = [],
  initialPxPerSecond = TICKER_SPEED_DEFAULT.pxPerSecond,
}: {
  initialItems?: Item[];
  initialPxPerSecond?: number;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [pxPerSecond, setPxPerSecond] = useState(initialPxPerSecond);

  // Adopt a fresh server render (e.g. a navigation that re-renders the page).
  useEffect(() => {
    setItems(initialItems);
    setPxPerSecond(initialPxPerSecond);
  }, [initialItems, initialPxPerSecond]);

  const load = useCallback(() => {
    getActiveTicker()
      .then(({ items: rows, pxPerSecond: rate }) => {
        setItems(rows);
        setPxPerSecond(rate);
      })
      .catch(() => {});
  }, []);

  useRefreshOnFocus(load, true);

  if (!items.length) return null;

  return (
    <div className="w-full bg-[#1e1e1e] dark:bg-[#0c0c0c] text-white border-y border-transparent dark:border-white/10">
      <div className="px-4 sm:px-6 md:px-10 lg:px-14">
        <div className="flex items-stretch">
          <TickerRow items={items} pxPerSecond={pxPerSecond} />
        </div>
      </div>
    </div>
  );
}
