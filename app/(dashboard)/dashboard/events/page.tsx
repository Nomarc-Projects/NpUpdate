import { EventsView } from "@/components/dashboard/events-view";
import { listEvents } from "@/lib/services/events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await listEvents();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[#1e1e1e] dark:text-white">Industry Events</h1>
        <p className="text-[13px] text-[#9a9a9a] mt-1">Conferences, workshops and site visits across the construction industry.</p>
      </header>
      <EventsView initial={events} />
    </div>
  );
}
