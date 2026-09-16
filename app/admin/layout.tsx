import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-nav";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { TourProvider } from "@/components/tour/tour-provider";
import { SessionHydrator } from "@/components/session-hydrator";
import { getAdminAlertCounts } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect("/login?redirect=/admin");
  if (role !== "admin" && role !== "super_admin") redirect("/dashboard");

  // Badge counts only decorate the top bar — never let them take the console
  // down, which is exactly how /admin broke before.
  const counts = await getAdminAlertCounts().catch(() => ({ pendingVerifications: 0, openTickets: 0 }));

  return (
    <TourProvider audience={role === "super_admin" ? "super_admin" : "admin"}>
      <SessionHydrator />
      <div className="flex h-screen overflow-hidden bg-[#f9f9f9] dark:bg-[#161616]">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <AdminTopBar pendingVerifications={counts.pendingVerifications} openTickets={counts.openTickets} />
          <div className="pt-14 lg:pt-0 max-w-full">{children}</div>
        </main>
      </div>
    </TourProvider>
  );
}
