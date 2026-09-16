import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/authz";
import { getHelmReviewCount } from "@/lib/services/helm-admin";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { HelmAdminTabs } from "@/components/admin/helm/helm-admin-tabs";

export const dynamic = "force-dynamic";

/**
 * Helm console shell — banner + sub-nav shared by all four surfaces.
 *
 * Re-applies the admin guard from `app/admin/layout.tsx` rather than relying on
 * the parent alone, so every Helm page is independently protected; each server
 * action in `lib/services/helm-admin.ts` re-checks the role again on write.
 */
export default async function HelmAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect("/login?redirect=/admin/helm");
  if (!isAdminRole(role)) redirect("/dashboard");

  const reviewCount = await getHelmReviewCount();

  // Standard admin chrome (`px-6 py-6 md:px-8` + AdminPageHeader), matching every
  // other console screen. Helm previously opened with a photographic dark banner
  // of its own, which made it read as a different product from the page before it.
  return (
    <div className="px-6 py-6 md:px-8">
      <AdminPageHeader
        title="Nomabot"
        subtitle="Usage, knowledge base, fair-use allowances and answer quality for the AI consultant."
      />

      <HelmAdminTabs reviewCount={reviewCount} />

      <div className="mt-5">{children}</div>
    </div>
  );
}
