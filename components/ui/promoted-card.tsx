"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { trackPromotion } from "@/lib/track-promotion";

/** The subset of an Ad Board advert needed to render a promoted card. */
export type PromotedCardData = {
  heading: string;
  body?: string | null;
  badge?: string | null;
  promotedName?: string | null;
  promotedMeta?: string | null;
  avatarUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaLabel2?: string | null;
  ctaHref2?: string | null;
  imageUrl?: string | null;
  accent?: string | null;
  /** Present on paid campaigns only; drives impression/click counting. */
  promotionId?: string | null;
};

/** Pick a readable text color for a filled swatch of `hex`. */
function readableOn(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#1e1e1e";
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#1e1e1e" : "#ffffff";
}

/** Small circular identity badge — a photo when we have one, else initials. */
function CardAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt={name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />;
  }
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "N";
  return (
    <span className="w-6 h-6 rounded-full bg-[#1e1e1e] dark:bg-[#ffd716] text-white dark:text-[#1e1e1e] text-[9.5px] font-bold flex items-center justify-center flex-shrink-0">
      {initials}
    </span>
  );
}

/**
 * A single promoted-listing card (Ad Board). Text on the left, image + tag on
 * the right on ≥sm; on mobile the image stacks on top so the tag stays visible.
 * `preview` renders the CTAs as non-navigating spans (used in the admin list).
 */
export function PromotedCard({ ad, preview = false }: { ad: PromotedCardData; preview?: boolean }) {
  const accent = ad.accent || "#ffd716";
  const onAccent = readableOn(accent);
  const name = ad.promotedName || "Nomarc";
  const meta = ad.promotedMeta || "";
  const tag = ad.badge || "Promoted";
  // Only paid campaigns carry a promotionId; house adverts have no metrics.
  const onClickThrough = ad.promotionId ? () => trackPromotion(ad.promotionId!, "click") : undefined;

  const Primary = ({ children }: { children: React.ReactNode }) => {
    const cls = "inline-flex items-center px-4 py-2 rounded-lg text-[12.5px] font-bold transition-transform hover:-translate-y-0.5";
    const style = { backgroundColor: accent, color: onAccent };
    return preview || !ad.ctaHref
      ? <span className={cls} style={style}>{children}</span>
      : <Link href={ad.ctaHref} onClick={onClickThrough} className={cls} style={style}>{children}</Link>;
  };
  const Secondary = ({ children }: { children: React.ReactNode }) => {
    const cls = "inline-flex items-center px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[#1e1e1e] dark:text-white text-[12.5px] font-semibold hover:border-[#ffd716] transition-colors";
    return preview || !ad.ctaHref2
      ? <span className={cls}>{children}</span>
      : <Link href={ad.ctaHref2} onClick={onClickThrough} className={cls}>{children}</Link>;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] sm:h-[420px] overflow-hidden rounded-[20px] border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-[#1e1e1e] shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
      {/* Text — every ad gets the exact same footprint regardless of copy length:
          the headline is clamped to 2 lines and the column is vertically
          centered in a fixed-height card, so no ad renders bigger/smaller
          than another. */}
      <div className="order-2 sm:order-1 p-6 sm:p-7 md:p-9 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <CardAvatar name={name} avatar={ad.avatarUrl} />
          <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/55 font-semibold truncate">
            {name}{meta && <span className="font-normal text-[#9a9a9a] dark:text-white/40"> · {meta}</span>}
          </p>
        </div>
        <h3 className="mt-3 text-[22px] sm:text-[27px] md:text-[30px] font-bold text-[#1e1e1e] dark:text-white leading-[1.15] tracking-tight line-clamp-2">
          {ad.heading}
        </h3>
        {ad.body && (
          <p className="mt-3 text-[13px] sm:text-[13.5px] text-[#8c8c8c] dark:text-white/55 leading-relaxed line-clamp-3 max-w-lg">
            {ad.body}
          </p>
        )}
        {(ad.ctaLabel || ad.ctaLabel2) && (
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {ad.ctaLabel && <Primary>{ad.ctaLabel}</Primary>}
            {ad.ctaLabel2 && <Secondary>{ad.ctaLabel2}</Secondary>}
          </div>
        )}
      </div>

      {/* Image + tag — explicit matching pixel height (not h-full/percentage)
          so the photo always fills this panel edge-to-edge regardless of any
          grid-stretch ambiguity; identical on every ad since the card height
          above is a fixed constant, not content-driven. */}
      <div className="order-1 sm:order-2 relative h-48 sm:h-[420px] overflow-hidden bg-[#f4f4f4] dark:bg-white/5">
        <span
          className="absolute top-3 right-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: accent, color: onAccent }}
        >
          {tag}
        </span>
        {ad.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.imageUrl} alt={ad.heading} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#c3c3c3]" style={{ background: `linear-gradient(135deg, ${accent}33, ${accent}10)` }}>
            <ImageIcon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
