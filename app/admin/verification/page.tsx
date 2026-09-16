import { AdminVerification } from "@/components/admin/admin-verification";
import { getKycQueue } from "@/lib/services/admin";

export default async function AdminVerificationPage() {
  const items = await getKycQueue();
  return <AdminVerification items={items} />;
}
