import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { UserDetailView } from "@/components/admin/user-detail-view";
import { getUserDetail } from "@/lib/services/admin";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";

export default async function ExhibitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Only admin and super_admin may view exhibitor detail
  if (role !== "admin" && role !== "super_admin") {
    redirect("/dashboard");
  }
  const user = await getUserDetail(id);
  if (!user) notFound();
  return (
    <Suspense>
      <UserDetailView user={user} backHref="/admin/user-management/exhibitors" canManageBilling={await isSuperAdmin()} />
    </Suspense>
  );
}
