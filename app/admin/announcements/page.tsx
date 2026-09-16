import { AdminAnnouncements } from "@/components/admin/admin-announcements";
import { listAnnouncements } from "@/lib/services/announcements";

export default async function AdminAnnouncementsPage() {
  const announcements = await listAnnouncements();
  return <AdminAnnouncements announcements={announcements} />;
}
