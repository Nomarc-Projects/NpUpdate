import { VerificationView } from "@/components/admin/verification-view";
import { getKycQueue } from "@/lib/services/admin";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default async function IdentityChecksPage() {
  const items = await getKycQueue();
  const identity = items.filter((i) => i.kind === "profile");
  return (
    <>
      <div className="px-6 pt-6 md:px-8">
        <AdminPageHeader title="Identity Checks" subtitle="Review and process pending user verifications." />
      </div>
      <VerificationView kind="profile" title="Identity Checks" subtitle="Review and process pending user verifications." items={identity} />
    </>
  );
}
