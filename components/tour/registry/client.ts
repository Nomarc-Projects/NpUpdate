import { centerStep, mobileNavStep, navStep, type TourDef } from "./types";

/**
 * Base-user tours.
 *
 * Every signup lands here: `user.role` defaults to `client` and no `user_role`
 * row exists yet (see lib/auth.ts and the multi-role model in lib/db/schema.ts).
 * A role is acquired lazily, by trying to do the thing — apply for work, add a
 * product, post a job — which puts a gate wizard in front of the page and grants
 * the role on completion. These tours exist to make that model legible instead of
 * leaving a new user staring at sections that look broken.
 */

/* ── Base user welcome (no role yet) — the three doors ── */
export const clientWelcome: TourDef = {
  id: "client-welcome",
  audience: "client",
  kind: "welcome",
  steps: [
    centerStep({
      key: "client-hello",
      icon: "sparkles",
      showEstimate: true,
      title: "Welcome to Nomarc Projects",
      content:
        "Nigeria's construction marketplace — professionals, material exhibitors and employers, all in one place. Some of what you'll see is locked until you choose a path; here's the lay of the land.",
    }),
    centerStep({
      key: "client-one-account",
      icon: "layout",
      title: "One account, as many profiles as you need",
      content:
        "You're signed in as a general user. Picking a path below adds a profile alongside this one — it never replaces it. You can hold all three and switch between them whenever you like.",
    }),
    navStep("sidebar-nav", {
      key: "client-nav",
      icon: "panelLeft",
      title: "Everything's in the sidebar",
      content: "Jobs, your Exhibition Hub and a Directory of professionals & companies — a few sections unlock as you complete your profile.",
    }),
    mobileNavStep("mobile-menu", {
      key: "client-nav-mobile",
      icon: "panelLeft",
      title: "Everything's in this menu",
      content: "Jobs, the Exhibition Hub and a Directory of professionals & companies — a few sections unlock as you complete your profile.",
    }),
    navStep("nav-jobs", {
      key: "client-professional",
      icon: "briefcase",
      optional: true,
      interact: { hint: "Open Browse jobs to see what's waiting" },
      title: "Looking for work?",
      content:
        "Browse jobs freely. The first time you apply, you'll write a short headline and bio and take a 10-question aptitude quiz — pass it and the Professional dashboard unlocks: portfolio, recommendations and Nomabot AI.",
    }),
    centerStep({
      key: "client-exhibitor",
      icon: "store",
      title: "Selling materials or equipment?",
      content:
        "Head to Add a product and you'll be walked through setting up an Exhibitor profile — company details and registration documents. That unlocks your own storefront: catalog, quote requests and promotions.",
    }),
    centerStep({
      key: "client-employer",
      icon: "building",
      title: "Hiring for a project?",
      content:
        "Go to Jobs → Posted Jobs to set up an Employer profile. You can either reuse a company you've already registered here, or add a new one. Then you're posting roles and reviewing candidates.",
    }),
    navStep("tour-launcher", {
      key: "client-launcher",
      icon: "lifeBuoy",
      optional: true,
      title: "Guided tours, any time",
      content: "This button replays the welcome or walks you through the page you're on — and it follows you into whichever dashboard you unlock next.",
    }),
    centerStep({
      key: "client-done",
      icon: "thumbsUp",
      title: "Explore at your own pace",
      content: "Pick a path whenever you're ready — the moment you unlock a new dashboard, it'll introduce itself.",
    }),
  ],
};

/* ── Base user walkthrough — a stop at each door, on the real page ──
 * Without this, "Platform walkthrough" is permanently disabled for every new
 * signup. Routes stay inside /dashboard so the provider survives navigation. */
export const clientWalkthrough: TourDef = {
  id: "client-walkthrough",
  audience: "client",
  kind: "walkthrough",
  steps: [
    centerStep({
      key: "wt-client-intro",
      icon: "compass",
      showEstimate: true,
      title: "The full tour",
      content:
        "A stop at each path you can take, on the actual page — what you can do today, and what unlocks when you commit to one.",
    }),
    {
      ...centerStep({
        key: "wt-client-profile",
        icon: "badgeCheck",
        title: "Start with your profile",
        content:
          "A photo, a headline and a bio go a long way — completing this is also what clears Verification Tier 1, whichever path you end up taking.",
      }),
      route: "/dashboard/profile",
      page: "Profile",
    },
    {
      ...centerStep({
        key: "wt-client-jobs",
        icon: "briefcase",
        title: "The job board is open to you now",
        content:
          "Browse and save anything you like without a role. Applying is the moment you become a Professional — a short profile, then the aptitude quiz.",
      }),
      route: "/dashboard/jobs",
      page: "Jobs",
    },
    {
      ...centerStep({
        key: "wt-client-products",
        icon: "store",
        title: "Sourcing, and selling",
        content:
          "Browse the Exhibition Hub and save products as a buyer. Listing your own is the Exhibitor path — company details plus registration documents.",
      }),
      route: "/dashboard/products",
      page: "Exhibition Hub",
    },
    {
      ...centerStep({
        key: "wt-client-directory",
        icon: "users",
        title: "The Directory is open too",
        content: "Search professionals and companies, and save leads into lists. No role needed.",
      }),
      route: "/dashboard/people",
      page: "Directory",
    },
    {
      ...centerStep({
        key: "wt-client-settings",
        icon: "settings",
        title: "Where your profiles live",
        content:
          "Account Settings holds every profile you take on, plus verification, billing and notifications. Each profile you add appears here as its own section.",
      }),
      route: "/dashboard/settings",
      page: "Settings",
    },
    {
      ...centerStep({
        key: "wt-client-done",
        icon: "thumbsUp",
        title: "That's the lay of the land",
        content:
          "Pick a path when you're ready. Whichever you choose, this account stays yours — new profiles stack on top of it, and you switch between them from the top bar.",
      }),
      route: "/dashboard",
      page: "Dashboard",
    },
  ],
};

export const clientTours: TourDef[] = [clientWelcome, clientWalkthrough];
