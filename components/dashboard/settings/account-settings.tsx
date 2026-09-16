"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UserCog, ShieldCheck, Bell, Mail, Lock, Trash2, CreditCard, User, GraduationCap, Building2, ArrowLeft, ArrowUpRight, type LucideIcon } from "lucide-react";

import type { StackableRole } from "@/lib/entitlements";
import { InfoPanel } from "@/components/dashboard/settings/panels/info-panel";
import { BillingPanel } from "@/components/dashboard/settings/panels/billing-panel";
import { NotificationsPanel } from "@/components/dashboard/settings/panels/notifications-panel";
import { EmailPanel } from "@/components/dashboard/settings/panels/email-panel";
import { PasswordPanel } from "@/components/dashboard/settings/panels/password-panel";
import { DeletePanel } from "@/components/dashboard/settings/panels/delete-panel";
import { PanelBoundary } from "@/components/dashboard/settings/panel-boundary";
// PersonalProfilePanel / QualificationsPanel / CompanyProfilePanel are no longer
// mounted here: those sections now link to /dashboard/profile, which is the single
// editor for public identity. panels/profile-panels.tsx is consequently unused.

export type Tab = "profile" | "qualifications" | "company" | "info" | "verification" | "billing" | "notifications" | "email" | "password" | "delete";

/**
 * Sections. A row with `href` LINKS OUT instead of rendering a panel here.
 *
 * Personal Profile, Qualifications and Company Profile used to mount the very
 * same components as /dashboard/profile — PublicProfileForm, QualificationsContent,
 * EducationContent — so the identical form existed at two routes with two
 * headers and two breadcrumbs. Beyond being confusing, it meant every change to
 * the profile (notably making it role-aware) had to be made twice and would
 * eventually drift.
 *
 * The split is now by purpose: /dashboard/profile owns public identity, and
 * Settings owns account administration. These rows stay listed, because people
 * do look for their profile under Settings, but they navigate rather than
 * duplicate. Verification goes with the profile too, since it drives the public
 * trust badge that sits on it.
 */
const tabs: { key: Tab; label: string; subtitle: string; Icon: LucideIcon; danger?: boolean; href?: string }[] = [
  { key: "profile",       label: "Personal Profile",         subtitle: "Update your professional details and bio.", Icon: User, href: "/dashboard/profile" },
  { key: "qualifications",label: "Qualifications & Expertise", subtitle: "Your experience, skills, certifications and education.", Icon: GraduationCap, href: "/dashboard/profile?tab=qualifications" },
  { key: "company",       label: "Company Profile",          subtitle: "Update your identity info and public-facing company bio.", Icon: Building2, href: "/dashboard/company" },
  { key: "info",          label: "Account Information",     subtitle: "Update your personal details and primary contact information across your active profiles.", Icon: UserCog },
  { key: "verification",  label: "Verification",             subtitle: "Manage your identity and business verification documents to build trust across the platform.", Icon: ShieldCheck, href: "/dashboard/profile?tab=verification" },
  { key: "billing",       label: "Billing & Subscriptions",  subtitle: "Review your plan and every charge made on this account.", Icon: CreditCard },
  { key: "notifications", label: "Email Notifications",      subtitle: "Manage your email preferences for all active profiles.", Icon: Bell },
  { key: "email",         label: "Change Email Address",     subtitle: "Update the login emails associated with your profiles.", Icon: Mail },
  { key: "password",      label: "Change Password",          subtitle: "Update your password to keep your account and active profiles secure.", Icon: Lock },
  { key: "delete",        label: "Delete Account",           subtitle: "Permanently remove your entire account or delete specific active profiles.", Icon: Trash2, danger: true },
];

/**
 * Account Settings — relocated from `app/(marketing)/settings/account-settings.tsx`.
 * Renders inside the existing dashboard sidebar shell (`app/(dashboard)/layout.tsx`);
 * the marketing chrome visible in the Figma mockups is intentionally not
 * reproduced here. `heldRoles` drives one collapsible accordion per role the
 * viewer actually holds (professional/exhibitor/employer), stacked on a
 * single page, in place of the old single-`variant` swap.
 */
export function AccountSettings({ heldRoles, initialTab = "info", paymentPlansEnabled = true }: { heldRoles: StackableRole[]; initialTab?: Tab; paymentPlansEnabled?: boolean }) {
  // A ?tab= pointing at an identity section (now a link-out) has no panel to
  // show, so fall back to Account Information rather than rendering an empty
  // shell. Old bookmarks and the hub's existing deep links both land here.
  const settled = tabs.find((t) => t.key === initialTab && !t.href) ? initialTab : "info";
  const [tab, setTab] = useState<Tab>(settled);
  const active = tabs.find((t) => t.key === tab)!;

  /**
   * Desktop switches section in place; mobile is master → detail.
   *
   * On a phone the section list lives one screen up (the settings hub), and
   * arriving here means a section was chosen — so the list is not repeated. It
   * used to render inline as an accordion, which pushed the fields below eight
   * more rows and made every setting a scroll away.
   *
   * The URL carries the section so the phone's own back gesture returns to the
   * hub rather than leaving settings altogether, and a section stays
   * deep-linkable across a refresh.
   */
  const select = (k: Tab) => {
    setTab(k);
    window.history.replaceState(null, "", `/dashboard/settings/account?tab=${k}`);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 md:py-10 max-w-[960px] mx-auto">
      {/* Page header. Mobile is a back affordance above the section name, the
          way a pushed detail view reads on a phone; from md up it becomes the
          design's large two-tone title (muted "Account Settings >" + the
          section name in ink). */}
      <div className="mb-6 md:mb-9">
        <div className="md:hidden">
          <Link
            href="/dashboard/settings"
            aria-label="Back to settings"
            className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6b6b6b] transition-colors hover:bg-[#f3f3f3] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ArrowLeft size={19} />
          </Link>
          <h1 className="mt-1.5 text-[23px] font-bold leading-tight tracking-[-0.01em] text-[#1e1e1e] dark:text-white">
            {active.label}
          </h1>
        </div>
        <h1 className="hidden md:block text-[26px] font-bold leading-tight tracking-[-0.01em]">
          <a href="/dashboard/settings" className="text-[#9a9a9a] transition-colors hover:text-[#6b6b6b]">Account Settings</a>
          <span className="mx-2 text-[#9a9a9a]">&gt;</span>
          <span className="text-[#1e1e1e] dark:text-white">{active.label}</span>
        </h1>
        <p className="text-[13px] text-[#9a9a9a] mt-1.5 max-w-[560px]">{active.subtitle}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">

        {/* left nav — desktop only; on mobile the hub one screen up is the list */}
        <nav className="hidden md:block md:w-[200px] flex-shrink-0" aria-label="Settings sections">

          {/* Desktop: the design's plain text list — no card, no icons, no fill.
              Active is simply ink + semibold against muted siblings, which is
              what makes the section title beside it the loudest thing on screen. */}
          <div className="flex flex-col gap-0.5 md:sticky md:top-6">
            {tabs.map((t) => {
              const isActive = tab === t.key;
              const cls = `-ml-2 rounded-lg px-2 py-2 text-left text-[13px] transition-colors ${
                isActive
                  ? "font-semibold text-[#1e1e1e] dark:text-white"
                  : t.danger
                    ? "text-[#9a9a9a] hover:text-[#e5484d]"
                    : "text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/50 dark:hover:text-white"
              }`;
              // Identity sections live on the profile; these navigate there.
              return t.href ? (
                <Link key={t.key} href={t.href} className={`${cls} inline-flex items-center gap-1.5`}>
                  {t.label}
                  <ArrowUpRight size={13} className="text-[#c9c9c9]" />
                </Link>
              ) : (
                <button key={t.key} onClick={() => select(t.key)} aria-current={isActive ? "page" : undefined} className={cls}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content. Boxed on mobile (unchanged), but from md up the card border
            and background drop away so fields sit on the page as they do in the
            design, with the nav reading as a quiet index beside them. */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e] md:rounded-none md:border-0 md:bg-transparent md:p-0 dark:md:bg-transparent">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Each panel is isolated: one failing section shows a card that
                    says so, instead of the route's error boundary replacing the
                    whole page. */}
                <PanelBoundary label={active.label}>
                  {tab === "info" && <InfoPanel heldRoles={heldRoles} />}
                  {tab === "billing" && <BillingPanel paymentPlansEnabled={paymentPlansEnabled} />}
                  {tab === "notifications" && <NotificationsPanel heldRoles={heldRoles} />}
                  {tab === "email" && <EmailPanel heldRoles={heldRoles} />}
                  {tab === "password" && <PasswordPanel />}
                  {tab === "delete" && <DeletePanel heldRoles={heldRoles} />}
                </PanelBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
