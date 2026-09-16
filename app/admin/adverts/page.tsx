import { AdminAdverts } from "@/components/admin/admin-adverts";
import { listAdverts } from "@/lib/services/adverts";

export default async function AdminAdvertsPage() {
  const adverts = await listAdverts();
  return <AdminAdverts adverts={adverts} />;
}
