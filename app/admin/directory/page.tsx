import { AdminDirectory } from "@/components/admin/admin-directory";
import { listCatalogueAll } from "@/lib/services/directory-catalogue";

export default async function AdminDirectoryPage() {
  const entries = await listCatalogueAll().catch(() => []);
  return <AdminDirectory initial={entries} />;
}