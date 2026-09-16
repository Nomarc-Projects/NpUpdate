import { AdminCrm } from "@/components/admin/admin-crm";
import { listLeads, getLeadCounts } from "@/lib/services/crm";

export default async function AdminCrmPage() {
  const [leads, counts] = await Promise.all([listLeads(), getLeadCounts()]);
  return <AdminCrm leads={leads} counts={counts} />;
}
