import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMyProfile } from "@/lib/services/profile";
import { getAccountInfo } from "@/lib/services/account";
import { getViewer } from "@/lib/viewer-server";
import { getPaymentPlans } from "@/lib/services/platform-settings-read";
import { PLAN_LABEL, type Plan } from "@/lib/entitlements";
import { SettingsHub } from "@/components/dashboard/settings-hub";
import { AccountSettings } from "@/components/dashboard/settings/account-settings";
import type { StackableRole } from "@/lib/entitlements";

export const metadata = { title: "Settings" };

/**
 * Two presentations of the same settings, chosen by viewport.
 *
 * The stacked list of tappable rows (SettingsHub) is a phone pattern: it was
 * being served to desktop too, where it wasted the width and buried every
 * section one tap deeper than necessary. Desktop gets the designed two-pane
 * layout instead — section rail on the left, the section itself on the right.
 *
 * Both render and CSS picks one, rather than branching on a JS breakpoint:
 * a width-based branch would flash the wrong layout on first paint and
 * disagree between server and client render.
 */
export default async function SettingsPage() {
  const [profile, account, viewer, session, paymentPlans] = await Promise.all([
    getMyProfile().catch(() => ({ data: { name: "", availability: "", avatarUrl: "", completeness: 0 } })),
    getAccountInfo().catch(() => ({ email: "" })),
    getViewer().catch(() => null),
    auth.api.getSession({ headers: await headers() }),
    getPaymentPlans().catch(() => ({ enabled: false })),
  ]);
  const d = profile.data as { name: string; availability: string; avatarUrl: string; completeness: number };
  const rawRole = (session?.user as { role?: string } | undefined)?.role;
  const role = rawRole === "exhibitor" ? "exhibitor" : "professional";
  const plan = (viewer?.plan ?? "free") as Plan;
  const heldRoles: StackableRole[] = viewer ? Array.from(viewer.heldRoles) : [];

  return (
    <>
      <div className="lg:hidden">
        <SettingsHub
          name={d.name}
          email={(account as { email: string }).email}
          avatarUrl={d.avatarUrl}
          availability={d.availability}
          planLabel={PLAN_LABEL[plan]}
          role={role}
          paymentPlansEnabled={paymentPlans.enabled}
        />
      </div>
      <div className="hidden lg:block">
        <AccountSettings heldRoles={heldRoles} initialTab="info" paymentPlansEnabled={paymentPlans.enabled} />
      </div>
    </>
  );
}
