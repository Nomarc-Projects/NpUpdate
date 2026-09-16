import { centerStep, mobileNavStep, navStep, type TourDef } from "./types";

/* ── Employer welcome (first run) ── */
export const employerWelcome: TourDef = {
  id: "employer-welcome",
  audience: "employer",
  kind: "welcome",
  steps: [
    centerStep({
      key: "emp-hello",
      icon: "building",
      showEstimate: true,
      title: "Welcome to hiring on Nomarc",
      content: "You're set up to post roles and reach verified construction professionals. A quick look at where everything lives.",
    }),
    navStep("sidebar-nav", {
      key: "emp-nav",
      icon: "panelLeft",
      title: "Posted Jobs, under Jobs",
      content: "Post a role, and manage Active / Drafts / Closed listings from Posted Jobs in the sidebar.",
    }),
    mobileNavStep("mobile-menu", {
      key: "emp-nav-mobile",
      icon: "panelLeft",
      title: "Everything's in this menu",
      content: "Post a role and manage your listings from this menu — the same sections you'd see on a wider screen.",
    }),
    centerStep({
      key: "emp-verify",
      icon: "shieldCheck",
      title: "One thing before you publish",
      content: "Publishing a listing needs Tier 2 identity verification — draft freely, and you'll be prompted to verify the first time you hit Publish.",
    }),
    navStep("role-switcher", {
      key: "emp-roles",
      icon: "compass",
      optional: true,
      title: "Hold more than one role?",
      content: "Also a Professional or Exhibitor? Switch between your dashboards right here.",
    }),
    centerStep({
      key: "emp-done",
      icon: "thumbsUp",
      title: "You're set",
      content: "Post your first role from Jobs → Posted Jobs → New Job post. Replay this tour any time from the guide button.",
    }),
  ],
};

/* ── Employer walkthrough — cross-page tour of the hiring flow ──
 * Routes stay inside /dashboard so the TourProvider survives navigation. */
export const employerWalkthrough: TourDef = {
  id: "employer-walkthrough",
  audience: "employer",
  kind: "walkthrough",
  steps: [
    centerStep({ key: "wt-emp-intro", icon: "compass", showEstimate: true, title: "The full tour", content: "A stop on each page of your hiring flow — post, track, and find talent directly." }),
    { ...centerStep({ key: "wt-emp-post", icon: "briefcase", title: "Post a job", content: "Role basics, compensation, description, and how candidates should apply — Nomarc form, an external link, or email." }), route: "/dashboard/jobs/post", page: "Post a Job" },
    { ...centerStep({ key: "wt-emp-posted", icon: "clock", title: "Track your listings", content: "Active, Drafts and Closed — each draft shows exactly what's missing before it can go live." }), route: "/dashboard/jobs/posted", page: "Posted Jobs" },
    { ...centerStep({ key: "wt-emp-find", icon: "search", title: "Search for talent directly", content: "Browse verified professionals and reach out, instead of waiting for applications." }), route: "/dashboard/find-professionals", page: "Find Professionals" },
    { ...centerStep({ key: "wt-emp-done", icon: "thumbsUp", title: "That's the tour", content: "Head back to Posted Jobs whenever you're ready to publish your first role." }), route: "/dashboard", page: "Dashboard" },
  ],
};

export const employerTours: TourDef[] = [employerWelcome, employerWalkthrough];
