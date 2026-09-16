import { NotificationsView } from "@/components/dashboard/notifications-view";
import { getMyNotifications } from "@/lib/services/notifications";

export default async function NotificationsPage() {
  const notifications = await getMyNotifications();
  return <NotificationsView notifications={notifications} />;
}
