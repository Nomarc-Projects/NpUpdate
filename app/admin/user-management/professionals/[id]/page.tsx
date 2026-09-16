import { Suspense } from "react";
import { notFound } from "next/navigation";
import { UserDetailView } from "@/components/admin/user-detail-view";
import { getUserDetail } from "@/lib/services/admin";

export default async function ProfessionalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();
  return (
    <Suspense>
      <UserDetailView user={user} backHref="/admin/user-management/professionals" />
    </Suspense>
  );
}
