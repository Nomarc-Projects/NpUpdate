import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck, Info } from "lucide-react";
import { auth } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { InviteAdminButton } from "@/components/admin/invite-admin-button";
import { AdminRolesManager } from "@/components/admin/admin-roles-manager";
import { getAdminRoster } from "@/lib/services/admin";

export const metadata = { title: "Admins & Roles" };
export const dynamic = "force-dynamic";

/**
 * Super-admin-only roster for assigning, changing and removing roles.
 *
 * The layout already keeps non-admins out; this second check keeps plain
 * admins out too. Enforcement also lives in every service action
 * (`requireSuperAdmin`), so hiding this page is only the friendly half.
 */
export default async function AdminAdminsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "super_admin") redirect("/admin");

  // getAdminRoster() re-checks the guard on the server; catch keeps a transient
  // DB blip from taking down the whole console.
  const rows = await getAdminRoster().catch(() => []);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Admins & Roles"
        subtitle="Assign, change, or remove roles. At least two super admins must always exist."
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#e3e3e3] bg-[#fffdf2] p-4 dark:border-white/10 dark:bg-[#ffd716]/[0.04] sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/70">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-[#8a7400] dark:text-[#ffd716]" />
          <span>
            Changes apply immediately — no re-login needed. Every account with admin access is listed below.
            Use <strong className="font-semibold text-[#1e1e1e] dark:text-white">Add Admin</strong> to grant roles to an existing account.
          </span>
        </p>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#8a7400] dark:text-[#ffd716]">
            <ShieldCheck size={15} /> Super admin only
          </span>
          <InviteAdminButton />
        </div>
      </div>

      <AdminRolesManager rows={rows} currentUserId={session.user.id} />
    </div>
  );
}
