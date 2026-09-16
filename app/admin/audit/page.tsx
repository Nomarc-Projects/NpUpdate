import { getAuditLog } from "@/lib/services/admin";
import { AdminAudit } from "@/components/admin/admin-audit";

export default async function AdminAuditPage() {
  const rows = await getAuditLog();
  return <AdminAudit rows={rows} />;
}
