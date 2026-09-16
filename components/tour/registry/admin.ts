import { centerStep, navStep, type TourDef } from "./types";

/* ── Admin / Super-Admin welcome (first run) ──
 * Super admin sees two extra steps (roster + invite); the shared steps use a
 * multi-audience array so one definition serves both tiers. */
export const adminWelcome: TourDef = {
  id: "admin-welcome",
  audience: ["admin", "super_admin"],
  kind: "welcome",
  steps: [
    centerStep({
      key: "admin-hello",
      icon: "shieldCheck",
      showEstimate: true,
      title: "Welcome to the admin console",
      content: "A quick look at where you review, moderate, and support the platform.",
    }),
    navStep("sidebar-nav", {
      key: "admin-nav",
      icon: "panelLeft",
      title: "Everything's grouped by task",
      content: "Support Inbox, Verifications, User Management, Marketplace & Catalog, and Advertising — each with its own queue.",
    }),
    centerStep({
      key: "admin-done",
      icon: "thumbsUp",
      title: "You're set",
      content: "Start with Verifications if there's a backlog, or check the dashboard's Needs Attention panel. Replay this tour any time from the guide button.",
    }),
  ],
};

export const superAdminWelcome: TourDef = {
  id: "super_admin-welcome",
  audience: "super_admin",
  kind: "welcome",
  steps: [
    centerStep({
      key: "sa-hello",
      icon: "shieldCheck",
      showEstimate: true,
      title: "Welcome, Super Admin",
      content: "Everything a regular admin has, plus managing who else has admin access.",
    }),
    navStep("sidebar-nav", {
      key: "sa-nav",
      icon: "panelLeft",
      title: "Everything's grouped by task",
      content: "Support Inbox, Verifications, User Management, Marketplace & Catalog, and Advertising — each with its own queue.",
    }),
    centerStep({
      key: "sa-admins",
      icon: "users",
      title: "Your admin roster",
      content: "See every admin on the dashboard home, and use \"Invite New Admin\" to grant access to an existing Nomarc account.",
    }),
    centerStep({
      key: "sa-done",
      icon: "thumbsUp",
      title: "You're set",
      content: "Replay this tour any time from the guide button in the top bar.",
    }),
  ],
};

/* ── Admin / Super-Admin walkthrough — cross-page tour of the console ── */
const adminWalkthroughSteps = (): TourDef["steps"] => [
  centerStep({ key: "wt-admin-intro", icon: "compass", showEstimate: true, title: "The full tour", content: "A stop on each queue in the console." }),
  { ...centerStep({ key: "wt-admin-support", icon: "message", title: "Support Inbox", content: "Chat with users directly and resolve tickets from one place." }), route: "/admin/support-inbox", page: "Support Inbox" },
  { ...centerStep({ key: "wt-admin-verify", icon: "shieldCheck", title: "Verifications", content: "Identity checks for professionals, corporate checks for exhibitors — approve, reject, or ask for clarification." }), route: "/admin/verifications/identity", page: "Verifications" },
  { ...centerStep({ key: "wt-admin-users", icon: "users", title: "User Management", content: "Every professional and exhibitor account, with a full profile view — verification, billing, support history." }), route: "/admin/user-management/professionals", page: "User Management" },
  { ...centerStep({ key: "wt-admin-marketplace", icon: "boxes", title: "Marketplace & Catalog", content: "Moderate every job listing and product on the platform." }), route: "/admin/marketplace/jobs", page: "Marketplace & Catalog" },
  { ...centerStep({ key: "wt-admin-ads", icon: "briefcase", title: "Advertising", content: "Review submitted promotions and track live campaigns." }), route: "/admin/advertising/reviews", page: "Advertising" },
  { ...centerStep({ key: "wt-admin-done", icon: "thumbsUp", title: "That's the tour", content: "Head back to the dashboard to see what needs attention first." }), route: "/admin", page: "Dashboard" },
];

export const adminWalkthrough: TourDef = { id: "admin-walkthrough", audience: "admin", kind: "walkthrough", steps: adminWalkthroughSteps() };
export const superAdminWalkthrough: TourDef = { id: "super_admin-walkthrough", audience: "super_admin", kind: "walkthrough", steps: adminWalkthroughSteps() };

export const adminTours: TourDef[] = [adminWelcome, superAdminWelcome, adminWalkthrough, superAdminWalkthrough];
