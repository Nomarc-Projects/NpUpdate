import { AdminNewsTicker } from "@/components/admin/admin-news-ticker";
import { listTicker } from "@/lib/services/ticker";
import { getTickerSpeedSetting } from "@/lib/services/platform-settings";

export default async function AdminNewsTickerPage() {
  const [items, speed] = await Promise.all([listTicker(), getTickerSpeedSetting()]);
  return <AdminNewsTicker items={items} seconds={speed.seconds} />;
}
