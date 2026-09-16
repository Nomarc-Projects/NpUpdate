import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ToolsView } from "@/components/admin/tools-view";
import { getTools } from "@/lib/services/platform-settings-read";
import { TOOLS_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata = { title: "Tools Page" };
export const dynamic = "force-dynamic";

export default async function AdminToolsPage() {
  const current = await getTools().catch(() => TOOLS_DEFAULT);

  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Tools Page"
        subtitle="Open the public tools directory to everyone, or lock it behind the Coming Soon screen. Admins can always preview it either way."
      />
      <ToolsView current={current} />
    </div>
  );
}