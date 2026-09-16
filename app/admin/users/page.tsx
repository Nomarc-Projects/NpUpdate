import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUsers } from "@/components/admin/admin-users";
import { getUsers, getUserStats } from "@/lib/services/admin";

export const metadata = { title: "User Management" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  // Stats are platform-wide and independent of the search, so they stay correct
  // while the table below is filtered down.
  const [users, stats] = await Promise.all([getUsers(q ?? ""), getUserStats()]);
  // Page chrome (padding + the standard header band) matches every other admin
  // screen; this page used to carry its own photo banner and its own title
  // markup, which is what made it look unlike the rest of the console.
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="User Management"
        subtitle="View, manage, and moderate all platform users."
      />
      <AdminUsers users={users} stats={stats} search={q ?? ""} />
    </div>
  );
}
