import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Hidden admin-access slug. Not linked anywhere in the UI:
 *  - admin signed in        → /admin
 *  - signed in (non-admin)  → /dashboard
 *  - signed out             → /login (after login, admins are routed to /admin)
 */
export default async function AdmLoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?redirect=/admin");
  const role = (session.user as { role?: string }).role;
  redirect(role === "admin" || role === "super_admin" ? "/admin" : "/dashboard");
}
