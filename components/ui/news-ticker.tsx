"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, Asterisk, X } from "lucide-react";
import { getActiveTicker } from "@/lib/services/ticker";

type Item = { content: string; href: string | null };

/** Matches TICKER_SPEED_DEFAULT. Only visible for the moment before the fetch
 *  resolves; the strip renders nothing until there are items anyway. */
const DEFAULT_SECONDS = 90;

/** The yellow "Latest News" chip + the looping marquee — shared by the
 *  site-wide ticker and the inline (in-page) copy. */
function TickerRow({ items, seconds }: { items: Item[]; seconds: number }) {
  // Repeat the set enough to span very wide screens, then duplicate the whole
  // thing — the keyframe translates -50%, so two identical halves loop seamlessly.
  const repeated = Array.from({ length: 6 }).flatMap(() => items);
  const loop = [...repeated, ...repeated];
  return (
    <>
      <span className="flex items-center gap-1.5 bg-[#ffd716] text-[#1e1e1e] text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wide px-2.5 sm:px-3 py-1.5 flex-shrink-0">
        <Megaphone size={13} />
        <span>Latest News</span>
      </span>
      <div className="group flex-1 overflow-hidden min-w-0 flex items-center">
        {/* Duration is admin-configurable, so it has to be an inline style: a
            Tailwind arbitrary value is compiled at build time and cannot take a
            runtime number. The class still carries name/timing/iteration, and
            the inline declaration overrides only the duration. */}
        <div
          className="flex w-max animate-[nm-marquee_90s_linear_infinite] group-hover:[animation-play-state:paused]"
          style={{ animationDuration: `${seconds}s` }}
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

/**
 * Site-wide news ticker. Rests at the very top, above the navbar.
 * The dark background is full page-width (full-bleed), while the inner content
 * (the yellow "News" chip + the marquee) is aligned to the hero banner's edges
 * via the same horizontal padding the hero uses (`md:px-10 lg:px-14`).
 * Marketing pages only — dismissible, pauses on hover.
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
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (inApp) return;
    getActiveTicker()
      .then(({ items: rows, seconds: s }) => {
        setItems(rows);
        setSeconds(s);
        if (rows.length) setDismissed(sessionStorage.getItem("nm-ticker-dismissed") === "1");
      })
      .catch(() => {});
  }, [inApp]);

  if (inApp || !items.length || dismissed) return null;

  return (
    <div className="relative z-[60] w-full bg-[#1e1e1e] dark:bg-[#0c0c0c] text-white border-b border-transparent dark:border-white/10">
      {/* Inner content is aligned to the hero banner's edges */}
      <div className="px-4 sm:px-6 md:px-10 lg:px-14">
        <div className="flex items-stretch">
          <TickerRow items={items} seconds={seconds} />
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
 */
export function InlineNewsTicker() {
  const [items, setItems] = useState<Item[]>([]);
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);

  useEffect(() => {
    getActiveTicker()
      .then(({ items: rows, seconds: s }) => { setItems(rows); setSeconds(s); })
      .catch(() => {});
  }, []);

  if (!items.length) return null;

  return (
    <div className="w-full bg-[#1e1e1e] dark:bg-[#0c0c0c] text-white border-y border-transparent dark:border-white/10">
      <div className="px-4 sm:px-6 md:px-10 lg:px-14">
        <div className="flex items-stretch">
          <TickerRow items={items} seconds={seconds} />
        </div>
      </div>
    </div>
  );
}
