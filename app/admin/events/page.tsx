import { AdminEvents } from "@/components/admin/admin-events";
import { listAllEvents } from "@/lib/services/events";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await listAllEvents();
  return <AdminEvents initial={events} />;
}
