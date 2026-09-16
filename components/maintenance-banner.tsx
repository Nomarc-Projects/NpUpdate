import Link from "next/link";
import { Wrench } from "lucide-react";

/**
 * Shown to admins (and allowlisted emails) while maintenance mode is on, so
 * nobody forgets it's still enabled — the site looks completely normal to an
 * admin, which is exactly how a maintenance flag gets left on for a week.
 *
 * Deliberately not dismissible: a persistent strip is the whole point.
 * Brand yellow rather than the impersonation banner's red — this is a state to
 * be aware of, not a warning about acting as someone else.
 */
export function MaintenanceBanner({ etaText }: { etaText?: string }) {
  return (
    <div className="sticky top-0 z-40 bg-[#ffd716] text-[#1e1e1e]">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2 max-w-full">
        <span className="inline-flex items-center gap-2 text-[13px] min-w-0">
          <Wrench size={15} className="flex-shrink-0" />
          <span className="truncate">
            <strong>Maintenance mode is ON.</strong> Visitors and non-admin users see the
            maintenance page — you are seeing the live site.
            {etaText ? <span className="hidden sm:inline"> ({etaText})</span> : null}
          </span>
        </span>
        <Link
          href="/admin/maintenance"
          className="inline-flex items-center rounded-full bg-[#1e1e1e]/10 hover:bg-[#1e1e1e]/20 px-3 py-1 text-[13px] font-semibold flex-shrink-0 transition-colors"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}
