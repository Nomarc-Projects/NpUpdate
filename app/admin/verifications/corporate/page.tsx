import { VerificationView } from "@/components/admin/verification-view";
import { getKycQueue } from "@/lib/services/admin";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default async function CorporateChecksPage() {
  const items = await getKycQueue();
  const corporate = items.filter((i) => i.kind === "company");
  return (
    <>
      <div className="px-6 pt-6 md:px-8">
        <AdminPageHeader title="Corporate Checks" subtitle="Review and verify pending Exhibitor documents and business details." />
      </div>
      <VerificationView kind="company" title="Corporate Checks" subtitle="Review and verify pending Exhibitor documents and business details." items={corporate} />
    </>
  );
}
