import { UserManagementTable } from "@/components/admin/user-management-table";
import { getUsers } from "@/lib/services/admin";

export default async function ProfessionalsUserManagementPage() {
  const users = await getUsers("");
  const professionals = users.filter((u) => u.role === "professional" || u.role === "client" || u.role === "employer");
  return (
    <div className="px-6 py-6 md:px-8">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">Professionals</h1>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Manage professional accounts across the platform.</p>
      </div>
      <UserManagementTable kind="professional" rows={professionals} />
    </div>
  );
}
