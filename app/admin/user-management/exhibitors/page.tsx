import { UserManagementTable } from "@/components/admin/user-management-table";
import { getUsers } from "@/lib/services/admin";

export default async function ExhibitorsUserManagementPage() {
  const users = await getUsers("");
  const exhibitors = users.filter((u) => u.role === "exhibitor");
  return (
    <div className="px-6 py-6 md:px-8">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">Exhibitors</h1>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Manage exhibitor accounts across the platform.</p>
      </div>
      <UserManagementTable kind="exhibitor" rows={exhibitors} />
    </div>
  );
}
