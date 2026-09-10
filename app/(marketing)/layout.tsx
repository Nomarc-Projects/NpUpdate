import { MarketingNavbar } from "@/components/layout/marketing-navbar";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { GuideFab } from "@/components/guide/guide-fab";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import { enforceMaintenance } from "@/lib/maintenance-gate";
import { getExhibitionHub, getTools } from "@/lib/services/platform-settings-read";

// The gate has to be evaluated per request, so the public pages can no longer be
// prerendered. Without this the build happily emitted them as static (they came
// out `○ … Revalidate 30s`, inheriting the setting lookup's cache window) and the
// layout — gate included — simply never ran again: visitors were served the
// build-time HTML of the live site while maintenance was switched on, and the
// very first request after a deploy would always miss the gate. Failing to be
// static is the intended trade here; a maintenance screen that only sometimes
// appears is not a maintenance screen.
export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Maintenance mode hides the whole public site from everyone but admins. The
  // check lives here rather than in middleware because the session cookie is
  // opaque at the edge, so role — and therefore admin bypass — is unreadable
  // there. Cost is one cached lookup (30s) per request.
  const { maintenance, bypassing } = await enforceMaintenance();

  // The super-admin Exhibition Hub toggle decides whether the public menus
  // advertise the hub. Off → the navbar drops the link (the route stays gated
  // by exhibition-hub/layout.tsx for direct visits).
  const { enabled: exhibitionEnabled } = await getExhibitionHub();

  // Same for the Tools page — off → the navbar drops the link, and the route
  // is gated by tools/layout.tsx for direct visits.
  const { enabled: toolsEnabled } = await getTools();

  return (
    <>
      {bypassing && <MaintenanceBanner etaText={maintenance.etaText} />}
      <MarketingNavbar exhibitionEnabled={exhibitionEnabled} toolsEnabled={toolsEnabled} />
      <main>{children}</main>
      <MarketingFooter />
      {/* Public site assistant — marketing chrome only, never the dashboard. */}
      <GuideFab />
    </>
  );
}
