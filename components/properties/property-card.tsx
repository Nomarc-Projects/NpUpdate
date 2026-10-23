import Link from "next/link";
import { BedDouble, Bath, MapPin, Ruler } from "lucide-react";
import type { PropertyCard as PropertyCardData } from "@/lib/services/properties";
import { formatMoney } from "@/lib/properties/pricing";
import { propertyStatusLabel } from "@/lib/constants/property";

const PERIOD: Record<string, string> = {
  annual: "/yr",
  monthly: "/mo",
  weekly: "/wk",
  daily: "/day",
};

export function PropertyCard({ item }: { item: PropertyCardData }) {
  return (
    <Link
      href={`/properties/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#ececec] bg-white transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#1e1e1e]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f4f4] dark:bg-white/5">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-[#9a9a9a]">No photo yet</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#1e1e1e]">
          {item.kind.replaceAll("_", " ")}
        </span>
        {item.status !== "published" && (
          <span className="absolute right-3 top-3 rounded-full bg-[#1e1e1e]/85 px-2.5 py-1 text-[10.5px] font-semibold text-white">
            {propertyStatusLabel(item.status)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[15px] font-bold leading-snug text-[#1e1e1e] dark:text-white">{item.title}</p>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-[#9a9a9a]">
          <MapPin size={12} /> {[item.city, item.state].filter(Boolean).join(", ") || "Location on request"}
        </p>
        <p className="mt-3 text-[16px] font-extrabold text-[#1e1e1e] dark:text-white">
          {formatMoney(item.priceMinor, item.currency)}
          <span className="text-[11px] font-medium text-[#9a9a9a]">{PERIOD[item.pricePeriod] ?? ""}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] text-[#6b6b6b] dark:text-white/60">
          {item.bedrooms ? <span className="inline-flex items-center gap-1"><BedDouble size={12} /> {item.bedrooms} bed</span> : null}
          {item.bathrooms ? <span className="inline-flex items-center gap-1"><Bath size={12} /> {item.bathrooms} bath</span> : null}
          {item.sizeSqm ? <span className="inline-flex items-center gap-1"><Ruler size={12} /> {item.sizeSqm.toLocaleString()} m²</span> : null}
          {!item.sizeSqm && item.sizeAcres ? <span className="inline-flex items-center gap-1"><Ruler size={12} /> {item.sizeAcres.toLocaleString()} acres</span> : null}
        </div>
      </div>
    </Link>
  );
}
